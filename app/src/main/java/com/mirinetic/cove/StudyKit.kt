package com.mirinetic.cove

import android.content.Context
import android.net.Uri
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * 사용자 평가 in Cove. The evaluation screens are the 평가 키트, built in the TV Home project and kept on the study
 * server (R2): this class downloads a version of it into files/kit/<version>/, serves its pages to the phones,
 * and gives the kit's TV side the same native calls TV Home has (window.StudyNative). Results, plans, requests and
 * feedback wait in files/study-outbox until the study server takes them.
 *
 * The study server address and its upload key are entered once from a phone (설정 → 사용자 평가 → QR), so neither
 * is in this app's code. Nothing here runs until that is done.
 */
class StudyKit(private val activity: MainActivity) {

    private val prefs = activity.getSharedPreferences("study", Context.MODE_PRIVATE)
    private val io = Executors.newSingleThreadExecutor()
    private val files = activity.filesDir

    fun url(): String = prefs.getString("url", "").orEmpty().trimEnd('/')
    private fun key(): String = prefs.getString("key", "").orEmpty()
    fun configured() = url().isNotEmpty() && key().isNotEmpty()

    /** From the phone's setup page. Checks the address and key against the study server before keeping them. */
    fun setup(url: String, key: String): Pair<Boolean, String> {
        val u = url.trim().trimEnd('/')
        if (!Regex("https://[A-Za-z0-9.-]+(:[0-9]+)?").matches(u) || key.isBlank()) return false to "주소는 https://로 시작해야 해요"
        val (code, _) = call(u, key.trim(), "/catalog.json?host=cove")
        return when (code) {
            200 -> { prefs.edit().putString("url", u).putString("key", key.trim()).apply(); refresh(); true to "연결했어요" }
            401 -> false to "키가 맞지 않아요"
            0 -> false to "평가 서버에 연결하지 못했어요 (인터넷 · 주소 확인)"
            else -> false to "평가 서버가 $code 로 답했어요"
        }
    }

    /** At start and when 평가 모드 opens: the newest kit and feature list, then anything still waiting goes up. */
    fun refresh() {
        if (!configured()) return
        fetchKit(); fetchCatalog(); flush()
    }

    // ---------- the phone pages, phone-side API ----------
    @Volatile var pub: String = "{}"
    @Volatile var priv: String = "{}"
    @Volatile var pin: String = ""
    @Volatile var active = false
    private fun pinOk(uri: Uri) = pin.isNotEmpty() && uri.getQueryParameter("pin") == pin

    class Reply(val code: Int, val type: String, val body: ByteArray)
    private fun json(code: Int, s: String) = Reply(code, "application/json; charset=utf-8", s.toByteArray())

    /** Pages anyone on the Wi-Fi may load (they ask for the pairing code / PIN themselves). */
    fun page(path: String): Reply? {
        val name = when {
            path == "/study" -> "study.html"
            path == "/study/e" -> "study-e.html"
            path == "/design" -> "design.html"
            path == "/features" -> "features.html"
            (path.startsWith("/assets/") || path.startsWith("/studies/")) && !path.contains("..") -> path.trimStart('/')
            else -> return null
        }
        catalogFile(name)?.let { return Reply(200, "application/json; charset=utf-8", it.readBytes()) }
        val f = kitFile(name) ?: return json(404, """{"error":"${if (configured()) "평가 키트를 아직 받지 못했어요" else "평가 서버가 연결되지 않았어요"}"}""")
        return Reply(200, LocalContent.mimeOf(name) + if (name.endsWith(".html") || name.endsWith(".js") || name.endsWith(".css") || name.endsWith(".json")) "; charset=utf-8" else "", f.readBytes())
    }

    /** The paired API (the pairing code is checked by the server before this). */
    fun api(method: String, path: String, uri: Uri, body: ByteArray): Reply? = when {
        method == "POST" && path == "/api/study/setup" -> {
            val o = try { JSONObject(String(body, Charsets.UTF_8)) } catch (e: Exception) { JSONObject() }
            val (ok, msg) = setup(o.optString("url"), o.optString("key"))
            json(if (ok) 200 else 400, JSONObject().put("ok", ok).put("message", msg).toString())
        }
        method == "GET" && path == "/api/study/setup" -> json(200, JSONObject().put("configured", configured()).put("url", url()).put("kit", kitVersion()).toString())
        method == "GET" && path == "/api/study/state" -> json(200, pub)
        method == "GET" && path == "/api/study/eval" -> if (pinOk(uri)) json(200, priv) else json(403, """{"error":"pin"}""")
        method == "POST" && path == "/api/study/act" -> {
            val o = JSONObject()
            for (k in uri.queryParameterNames) if (k != "t") o.put(k, uri.getQueryParameter(k).orEmpty().take(1200))
            activity.pageJs("window.dispatchEvent(new CustomEvent('tvhome-study',{detail:$o}))")
            json(200, """{"ok":true}""")
        }
        method == "GET" && path == "/api/study/defs" -> json(200, defList())
        method == "POST" && path == "/api/study/defs" ->
            if (!pinOk(uri)) json(403, """{"error":"pin"}""")
            else saveDef(String(body, Charsets.UTF_8))?.let { json(200, JSONObject().put("ok", true).put("id", it).toString()) } ?: json(400, """{"error":"bad study"}""")
        method == "POST" && path == "/api/study/request" ->
            if (!pinOk(uri)) json(403, """{"error":"pin"}""")
            else saveRequest(String(body, Charsets.UTF_8))?.let { json(200, JSONObject().put("ok", true).put("id", it).put("cloud", configured()).toString()) } ?: json(400, """{"error":"bad request"}""")
        method == "GET" && path == "/api/study/features" ->
            if (!pinOk(uri)) json(403, """{"error":"pin"}""")
            else if (!configured()) json(503, """{"error":"no cloud"}""")
            else { val (c, t) = call(url(), key(), "/api/features"); if (c == 200) json(200, JSONObject(t).put("protoBytes", protoBytes()).toString()) else json(502, """{"error":"cloud $c"}""") }
        path.startsWith("/api/study/ai/") ->   // AI 작업 큐 (TV Home studies/ai-jobs.md): the evaluator's pages ask and decide through the TV
            if (!pinOk(uri)) json(403, """{"error":"pin"}""")
            else if (!configured()) json(503, """{"error":"no cloud"}""")
            else {
                val sub = path.removePrefix("/api/study/ai")
                if (!Regex("^/jobs(/[A-Za-z0-9_-]{1,64}/decide)?$").matches(sub)) json(404, """{"error":"not found"}""")
                else {
                    val qs = uri.queryParameterNames.filter { it != "t" && it != "pin" }.joinToString("&") { "$it=" + java.net.URLEncoder.encode(uri.getQueryParameter(it).orEmpty(), "UTF-8") }
                    val (c, t) = call(url(), key(), "/api/ai$sub" + (if (qs.isEmpty()) "" else "?$qs"), if (method == "POST") String(body, Charsets.UTF_8) else null)
                    if (c == 0) json(503, """{"error":"offline"}""") else json(c, t)
                }
            }
        method == "GET" && path == "/api/study/feedback" ->
            if (!pinOk(uri)) json(403, """{"error":"pin"}""")
            else { val (c, t) = call(url(), key(), "/api/feedback"); if (c == 200) json(200, t) else json(502, """{"error":"cloud $c"}""") }
        method == "POST" && path == "/api/study/feature-state" ->
            if (!pinOk(uri)) json(403, """{"error":"pin"}""")
            else { val (c, t) = call(url(), key(), "/api/feature-state", String(body, Charsets.UTF_8)); if (c == 200) { fetchCatalog(); json(200, t) } else json(502, """{"error":"cloud $c"}""") }
        method == "POST" && path == "/api/study/proto-clear" ->
            if (!pinOk(uri)) json(403, """{"error":"pin"}""") else json(200, JSONObject().put("freed", protoClear()).toString())
        method == "GET" && path == "/api/study/stored" -> if (pinOk(uri)) json(200, storedSummary()) else json(403, """{"error":"pin"}""")
        method == "POST" && path == "/api/study/stored-clear" -> if (pinOk(uri)) json(200, storedClear(uri.getQueryParameter("study").orEmpty())) else json(403, """{"error":"pin"}""")
        method == "GET" && path == "/api/study/results" ->
            if (pinOk(uri)) Reply(200, "application/json; charset=utf-8", results().toByteArray()) else json(403, """{"error":"pin"}""")
        else -> null
    }

    // ---------- the kit ----------
    private fun kitRoot() = File(files, "kit").apply { mkdirs() }
    fun kitVersion(): String = File(kitRoot(), "current").takeIf { it.exists() }?.readText()?.trim().orEmpty()
    fun kitFile(rel: String): File? {
        val v = kitVersion(); if (v.isEmpty() || rel.contains("..")) return null
        return File(File(kitRoot(), v), rel).takeIf { it.isFile }
    }
    /** Downloads a new kit version whole (into <version>.part), then switches to it and tells the page. */
    fun fetchKit() {
        if (!configured()) return
        io.execute {
            try {
                val (c, t) = call(url(), key(), "/kit/manifest.json")
                if (c != 200) return@execute
                val m = JSONObject(t); val ver = m.getString("version")
                if (!Regex("[0-9a-f]{6,40}").matches(ver) || ver == kitVersion()) return@execute
                val part = File(kitRoot(), "$ver.part").apply { deleteRecursively(); mkdirs() }
                val list = m.getJSONArray("files")
                for (i in 0 until list.length()) {
                    val rel = list.getString(i); if (rel.contains("..")) return@execute
                    val bytes = get(url(), key(), "/kit/$ver/$rel") ?: return@execute
                    File(part, rel).apply { parentFile?.mkdirs() }.writeBytes(bytes)
                }
                val dir = File(kitRoot(), ver); dir.deleteRecursively(); part.renameTo(dir)
                File(kitRoot(), "current").writeText(ver)
                kitRoot().listFiles()?.forEach { if (it.isDirectory && it.name != ver) it.deleteRecursively() }
                activity.pageJs("window.Cove&&Cove.kitReady&&Cove.kitReady('$ver')")
            } catch (_: Exception) {}
        }
    }

    // ---------- feature list (Cove's own features), prototype packages ----------
    private fun catalogFile(name: String): File? =
        if (name == "studies/features.json" || name == "studies/bank.json") File(File(files, "study-catalog"), name.removePrefix("studies/")).takeIf { it.exists() } else null
    fun fetchCatalog() {
        if (!configured()) return
        io.execute {
            var ok = false
            val (c, t) = call(url(), key(), "/catalog.json?host=cove")
            if (c == 200) try {
                val o = JSONObject(t); val dir = File(files, "study-catalog").apply { mkdirs() }
                for (k in listOf("features", "bank")) o.optJSONObject(k)?.let { File(dir, "$k.json").writeText(it.toString()) }
                o.optJSONObject("features")?.let { cleanProtos(it) }
                ok = true
            } catch (_: Exception) {}
            event("tvhome-catalog", JSONObject().put("ok", ok).toString())
        }
    }
    private fun protoDir() = File(files, "protos").apply { mkdirs() }
    private fun protoFile(id: String): File? = if (Regex("[A-Za-z0-9_-]{1,64}(@[0-9a-f]{7})?").matches(id)) File(protoDir(), "$id.js") else null
    private fun cleanProtos(features: JSONObject) {
        val keep = HashSet<String>()
        for (id in features.keys()) {
            val f = features.optJSONObject(id) ?: continue
            if (f.optString("status", "active") in setOf("archived", "dropped", "adopted")) continue
            f.optJSONObject("app")?.optString("proto")?.takeIf { it.isNotEmpty() }?.let { keep.add(it) }
            val vs = f.optJSONArray("variants") ?: continue
            for (i in 0 until vs.length()) vs.optJSONObject(i)?.optJSONObject("apply")?.let { ap -> for (k in ap.keys()) ap.optJSONObject(k)?.optString("proto")?.takeIf { it.isNotEmpty() }?.let { keep.add(it) } }
        }
        protoDir().listFiles()?.forEach { if (it.nameWithoutExtension.substringBefore('@') !in keep) it.delete() }
    }
    fun protoBytes(): Long = protoDir().listFiles()?.sumOf { it.length() } ?: 0L
    fun protoClear(): Long { val n = protoBytes(); protoDir().listFiles()?.forEach { it.delete() }; return n }
    private fun fetchProto(id: String) {
        val f = protoFile(id) ?: return
        io.execute {
            var error = ""
            if (!configured()) error = "no cloud"
            else { val b = get(url(), key(), "/proto/$id.js"); if (b != null) f.writeBytes(b) else error = "none" }
            event("tvhome-proto", JSONObject().put("id", id).put("ok", f.exists()).put("error", error).toString())
        }
    }

    // ---------- results and the outbox ----------
    private fun outbox() = File(files, "study-outbox").apply { mkdirs() }
    private fun defFile(id: String): File? = if (Regex("[A-Za-z0-9_-]{1,64}").matches(id)) File(File(files, "study-defs").apply { mkdirs() }, "$id.json") else null
    private fun queue(name: String, wrap: String, o: JSONObject) { outbox().resolve(name).writeText(JSONObject().put(wrap, o).toString()); flush() }
    private fun queueDef(json: String): Boolean = try {
        val o = JSONObject(json); val id = o.getString("id")
        if (!configured() || o.optJSONObject("security")?.optInt("grade") == 3 || !Regex("[A-Za-z0-9_-]{1,64}").matches(id)) false else { queue("def-$id.json", "study", o); true }
    } catch (e: Exception) { false }
    fun saveDef(json: String): String? = try {
        val o = JSONObject(json); val id = o.getString("id"); o.getJSONArray("tasks"); o.getString("title")
        defFile(id)?.also { it.writeText(json); queueDef(json) }?.let { id }
    } catch (e: Exception) { null }
    fun defList(): String {
        val arr = JSONArray()
        File(files, "study-defs").listFiles { f -> f.name.endsWith(".json") }?.sortedByDescending { it.lastModified() }?.forEach { f ->
            try { val o = JSONObject(f.readText()); arr.put(JSONObject().put("id", o.getString("id")).put("title", o.optString("title")).put("type", o.optString("type")).put("savedAt", f.lastModified())) } catch (_: Exception) {}
        }
        return arr.toString()
    }
    private fun saveRequest(json: String): String? = try {
        val o = JSONObject(json); val id = o.getString("id")
        if (!Regex("[A-Za-z0-9_-]{1,64}").matches(id)) null
        else { File(File(files, "study-requests").apply { mkdirs() }, "$id.json").writeText(json); if (configured()) queue("req-$id.json", "request", o); id }
    } catch (e: Exception) { null }
    private fun results(): String = File(files, "studies").listFiles { f -> f.name.endsWith(".json") }?.sortedBy { it.name }.orEmpty().joinToString(",", "[", "]") { it.readText() }

    /** 데이터 관리: results kept on this TV, per study, and how many still wait for the cloud. */
    fun storedSummary(): String {
        val by = LinkedHashMap<String, IntArray>()   // study -> [sessions, waiting]
        File(files, "studies").listFiles { f -> f.name.endsWith(".json") }?.forEach { f ->
            try { val id = JSONObject(f.readText()).optString("study", "?"); by.getOrPut(id) { IntArray(2) }[0]++ } catch (_: Exception) {}
        }
        outbox().listFiles { x -> x.name.endsWith(".json") && !x.name.startsWith("def-") && !x.name.startsWith("req-") && !x.name.startsWith("fb-") }?.forEach { f ->
            try { val id = JSONObject(f.readText()).optJSONObject("study")?.optString("id") ?: "?"; by.getOrPut(id) { IntArray(2) }[1]++ } catch (_: Exception) {}
        }
        val arr = JSONArray()
        for ((id, c) in by) arr.put(JSONObject().put("study", id).put("n", c[0]).put("waiting", c[1]))
        return JSONObject().put("studies", arr).put("cloud", configured()).toString()
    }
    /** Deletes one study's results from this TV — only when none of them still waits for the cloud. */
    fun storedClear(study: String): String {
        val waiting = outbox().listFiles { x -> x.name.endsWith(".json") && !x.name.startsWith("def-") && !x.name.startsWith("req-") && !x.name.startsWith("fb-") }
            ?.count { try { JSONObject(it.readText()).optJSONObject("study")?.optString("id") == study } catch (e: Exception) { false } } ?: 0
        if (waiting > 0) return JSONObject().put("ok", false).put("message", "아직 클라우드에 안 올라간 결과가 ${waiting}건 있어요. 인터넷 연결 뒤 다시 해 주세요").toString()
        var n = 0
        File(files, "studies").listFiles { f -> f.name.endsWith(".json") }?.forEach { f ->
            try { if (JSONObject(f.readText()).optString("study") == study && f.delete()) n++ } catch (_: Exception) {}
        }
        return JSONObject().put("ok", true).put("deleted", n).toString()
    }

    /** Sends what is waiting, oldest first; tells the page how many sessions are left ('tvhome-study-upload'). */
    fun flush() {
        if (!configured()) return
        io.execute {
            var error = ""
            for (f in outbox().listFiles { x -> x.name.endsWith(".json") }?.sortedBy { it.name }.orEmpty()) {
                val path = when { f.name.startsWith("def-") -> "/api/study-def"; f.name.startsWith("req-") -> "/api/request"; f.name.startsWith("fb-") -> "/api/proto-feedback"; else -> "/api/upload" }
                val (code, _) = call(url(), key(), path, f.readText())
                when (code) {
                    200 -> f.delete()
                    400, 403, 413 -> { f.renameTo(File(f.parentFile, f.name + ".rejected")); error = "rejected $code" }
                    401 -> { error = "key"; break }
                    0 -> { error = "offline"; break }
                    else -> { error = "http $code"; break }
                }
            }
            val left = outbox().listFiles { x -> x.name.endsWith(".json") && !x.name.startsWith("def-") && !x.name.startsWith("req-") && !x.name.startsWith("fb-") }?.size ?: 0
            event("tvhome-study-upload", JSONObject().put("pending", left).put("error", error).toString())
        }
    }

    // ---------- network ----------
    private fun call(base: String, key: String, path: String, body: String? = null): Pair<Int, String> = try {
        val conn = URL("$base$path").openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000; conn.readTimeout = 30_000
        conn.setRequestProperty("X-TVHome-Key", key)
        if (body != null) { conn.requestMethod = "POST"; conn.doOutput = true; conn.setRequestProperty("Content-Type", "application/json; charset=utf-8"); conn.outputStream.use { it.write(body.toByteArray()) } }
        val code = conn.responseCode
        val text = (if (code < 400) conn.inputStream else conn.errorStream)?.bufferedReader()?.readText() ?: ""
        conn.disconnect(); code to text
    } catch (e: Exception) { 0 to """{"error":"offline"}""" }
    private fun get(base: String, key: String, path: String): ByteArray? = try {
        val conn = URL("$base$path").openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000; conn.readTimeout = 60_000
        conn.setRequestProperty("X-TVHome-Key", key)
        val b = if (conn.responseCode == 200) conn.inputStream.use { it.readBytes() } else null
        conn.disconnect(); b
    } catch (e: Exception) { null }

    private fun event(name: String, json: String) =
        activity.pageJs("window.dispatchEvent(new CustomEvent(${JSONObject.quote(name)},{detail:JSON.parse(${JSONObject.quote(json)})}))")

    /** window.StudyNative: what the kit's TV side calls (same names as TV Home's bridge). */
    inner class Bridge {
        @JavascriptInterface fun studyInfo(): String {
            val base = RemoteServer.url(activity.store)
            fun one(p: String) = base?.replace("/?t=", "$p?t=")?.let { JSONObject().put("url", it).put("qr", Qr.svg(it)) } ?: JSONObject().put("url", "").put("qr", "")
            return JSONObject().put("p", one("/study")).put("e", one("/study/e")).toString()
        }
        @JavascriptInterface fun studyPublish(p: String, e: String, code: String) { pub = p; priv = e; pin = code }
        @JavascriptInterface fun studyActive(on: Boolean) { active = on; if (on) refresh() }
        @JavascriptInterface fun studyDef(id: String): String = defFile(id)?.takeIf { it.exists() }?.readText() ?: ""
        @JavascriptInterface fun studyDefs(): String = defList()
        @JavascriptInterface fun studyUpload(json: String): Boolean { if (!configured()) return false; outbox().resolve("${System.currentTimeMillis()}.json").writeText(json); flush(); return true }
        @JavascriptInterface fun studyFlush() = flush()
        @JavascriptInterface fun studyCatalogFetch() = fetchCatalog()
        @JavascriptInterface fun studyUploadDef(json: String): Boolean = queueDef(json)
        @JavascriptInterface fun studyProtoCode(id: String): String = protoFile(id)?.takeIf { it.exists() }?.readText() ?: ""
        @JavascriptInterface fun studyProtoFetch(id: String) = fetchProto(id)
        @JavascriptInterface fun studyFeedback(json: String): Boolean = try {
            val o = JSONObject(json); val id = o.getString("id")
            if (!configured() || !Regex("[A-Za-z0-9_-]{1,64}").matches(id)) false else { queue("fb-$id.json", "feedback", o); true }
        } catch (e: Exception) { false }
        @JavascriptInterface fun studyCloud(): Boolean = configured()
        @JavascriptInterface fun studyCount(): Int = File(files, "studies").listFiles { f -> f.name.endsWith(".json") }?.size ?: 0
        @JavascriptInterface fun studySave(name: String, json: String): Boolean = try {
            File(File(files, "studies").apply { mkdirs() }, name.replace(Regex("[^A-Za-z0-9_.-]"), "_") + ".json").writeText(json); true
        } catch (e: Exception) { false }
        /** For Cove's settings: whether the server is set, the kit's version, and the phone setup link. */
        @JavascriptInterface fun studyStatus(): String {
            val setupUrl = RemoteServer.url(activity.store)?.replace("/?t=", "/study-setup?t=")
            return JSONObject().put("configured", configured()).put("kit", kitVersion()).put("setup", setupUrl ?: "").put("qr", setupUrl?.let { Qr.svg(it) } ?: "").toString()
        }
        @JavascriptInterface fun studyRefresh() = refresh()
    }
}
