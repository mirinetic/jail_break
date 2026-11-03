package com.mirinetic.cove

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.concurrent.Executors

/**
 * Reads calendar subscription feeds (iCal / .ics links from Google Calendar, iCloud, Outlook).
 * Done here rather than in the page because those servers don't allow web pages to read them directly.
 * Old one-off events are dropped before handing the text to the page, so years of history stay small.
 */
class CalendarFetcher(private val activity: MainActivity) {

    private val worker = Executors.newSingleThreadExecutor()

    fun fetch(id: String, rawUrl: String) {
        worker.execute {
            val result = try {
                val text = download(normalise(rawUrl))
                if (!text.contains("BEGIN:VCALENDAR")) throw IllegalStateException("not a calendar")
                JSONObject().put("ok", true).put("ics", trim(text))
            } catch (e: Exception) {
                JSONObject().put("ok", false).put("error", e.message ?: e.javaClass.simpleName)
            }
            activity.js("Cove.calFetched(${JSONObject.quote(id)},${JSONObject.quote(result.toString())})")
        }
    }

    private fun normalise(url: String): String {
        val u = url.trim()
        return when {
            u.startsWith("webcal://", ignoreCase = true) -> "https://" + u.substring(9)
            u.startsWith("webcals://", ignoreCase = true) -> "https://" + u.substring(10)
            else -> u
        }
    }

    private fun download(start: String): String {
        var url = start
        repeat(5) {
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000
            conn.instanceFollowRedirects = false
            conn.setRequestProperty("User-Agent", "Cove-TV-Launcher")
            val code = conn.responseCode
            if (code in 300..399) {
                url = URL(URL(url), conn.getHeaderField("Location") ?: throw IllegalStateException("redirect")).toString()
                conn.disconnect()
                return@repeat
            }
            if (code !in 200..299) throw IllegalStateException("HTTP $code")
            val bytes = conn.inputStream.use { input ->
                val out = java.io.ByteArrayOutputStream()
                val buf = ByteArray(16 * 1024)
                while (true) {
                    val n = input.read(buf)
                    if (n < 0) break
                    out.write(buf, 0, n)
                    if (out.size() > 8 * 1024 * 1024) throw IllegalStateException("too large")
                }
                out.toByteArray()
            }
            return String(bytes, Charsets.UTF_8)
        }
        throw IllegalStateException("too many redirects")
    }

    /** Keeps the calendar name, repeating events, and one-off events from 60 days ago onward. */
    private fun trim(text: String): String {
        val cal = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -60) }
        val cutoff = SimpleDateFormat("yyyyMMdd", Locale.US).format(cal.time)
        val dtstart = Regex("""(?m)^DTSTART[^:\r\n]*:(\d{8})""")
        val out = StringBuilder("BEGIN:VCALENDAR\r\n")
        Regex("""(?m)^X-WR-CALNAME[^:\r\n]*:.*$""").find(text)?.let { out.append(it.value.trimEnd('\r')).append("\r\n") }
        var from = 0
        while (true) {
            val s = text.indexOf("BEGIN:VEVENT", from)
            if (s < 0) break
            val e = text.indexOf("END:VEVENT", s)
            if (e < 0) break
            val block = text.substring(s, e + "END:VEVENT".length)
            val repeats = block.contains("\nRRULE") || block.contains("\nRECURRENCE-ID")
            val date = dtstart.find(block)?.groupValues?.get(1)
            if (repeats || date == null || date >= cutoff) out.append(block).append("\r\n")
            from = e + 1
        }
        return out.append("END:VCALENDAR\r\n").toString()
    }
}
