package com.mirinetic.cove

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.io.InputStream

/**
 * Serves the home screen page from inside the app: https://cove.local/... never touches the network.
 *   /banner/<pkg>, /icon/<pkg>  real artwork of installed apps
 *   /photo/<id>.jpg             photos sent from the phone
 *   anything else               files in assets/www
 */
class LocalContent(
    private val context: Context,
    private val apps: AppRepository,
    private val store: Store,
    private val study: StudyKit,
) {
    companion object {
        const val HOST = "cove.local"
        const val ORIGIN = "https://$HOST"

        fun mimeOf(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
            "html" -> "text/html"
            "css" -> "text/css"
            "js" -> "application/javascript"
            "json" -> "application/json"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "webp" -> "image/webp"
            "woff2" -> "font/woff2"
            else -> "application/octet-stream"
        }
    }

    fun handle(uri: Uri): WebResourceResponse? {
        if (uri.host != HOST) return null
        val path = uri.path ?: "/"
        return try {
            when {
                path.startsWith("/banner/") -> bytes("image/png", apps.image("banner", path.removePrefix("/banner/")))
                path.startsWith("/icon/") -> bytes("image/png", apps.image("icon", path.removePrefix("/icon/")))
                path.startsWith("/glyph/") -> bytes("image/png", apps.image("glyph", path.removePrefix("/glyph/")))
                // the 평가 키트 (downloaded) and the study data it reads: Cove's feature list, the kit's study files
                path.startsWith("/kit/") -> study.kitFile(path.removePrefix("/kit/"))?.let { ok(mimeOf(it.name), it.inputStream()) } ?: notFound()
                path.startsWith("/studies/") -> study.page(path)?.takeIf { it.code == 200 }?.let { ok(mimeOf(path), java.io.ByteArrayInputStream(it.body)) } ?: notFound()
                path.startsWith("/photo/") -> {
                    val file = store.photoFile(path.removePrefix("/photo/").removeSuffix(".jpg"))
                    if (file == null) notFound() else ok("image/jpeg", file.inputStream())
                }
                else -> {
                    val rel = if (path == "/") "index.html" else path.trimStart('/')
                    if (rel.contains("..")) notFound() else ok(mimeOf(rel), context.assets.open("www/$rel"))
                }
            }
        } catch (e: Exception) {
            notFound()
        }
    }

    private fun bytes(mime: String, data: ByteArray?): WebResourceResponse =
        if (data == null) notFound() else ok(mime, ByteArrayInputStream(data))

    private fun ok(mime: String, data: InputStream): WebResourceResponse {
        val text = mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json") || mime.endsWith("svg+xml")
        return WebResourceResponse(mime, if (text) "utf-8" else null, data).apply {
            responseHeaders = mapOf("Cache-Control" to "no-cache")
        }
    }

    private fun notFound() =
        WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), ByteArrayInputStream(ByteArray(0)))
}
