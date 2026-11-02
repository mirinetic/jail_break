package com.mirinetic.cove

import android.net.Uri
import java.io.BufferedInputStream
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.Executors

/**
 * The phone remote. A tiny web server on the TV (port 8765) that serves the remote page and turns
 * its button presses into the same key events the TV remote sends. Every command must carry the
 * pairing code from the QR link, so other devices on the Wi-Fi cannot drive the TV by guessing.
 */
class RemoteServer(private val activity: MainActivity) {

    companion object {
        const val PORT = 8765
        private const val MAX_PHOTO = 25 * 1024 * 1024
        private val KEYS = setOf("up", "down", "left", "right", "ok", "back", "menu")
        private val COMMAND = Regex("[a-z0-9:_-]{1,40}")

        fun lanIp(): String? = try {
            NetworkInterface.getNetworkInterfaces()?.toList().orEmpty()
                .filter { it.isUp && !it.isLoopback && !it.isVirtual }
                .sortedBy { if (it.name.startsWith("wlan") || it.name.startsWith("eth")) 0 else 1 }
                .flatMap { it.inetAddresses.toList() }
                .filterIsInstance<Inet4Address>()
                .firstOrNull { it.isSiteLocalAddress }
                ?.hostAddress
        } catch (e: Exception) {
            null
        }

        fun url(store: Store): String? = lanIp()?.let { "http://$it:$PORT/?t=${store.token}" }
    }

    @Volatile
    private var socket: ServerSocket? = null
    private val pool = Executors.newCachedThreadPool()

    fun start() {
        pool.execute {
            try {
                val server = ServerSocket()
                server.reuseAddress = true
                server.bind(InetSocketAddress(PORT))
                socket = server
                while (!server.isClosed) {
                    val client = server.accept()
                    pool.execute { serve(client) }
                }
            } catch (_: IOException) {
                // Closed on shutdown, or the port is taken. The rest of Cove keeps working without the phone remote.
            }
        }
    }

    fun stop() {
        try {
            socket?.close()
        } catch (_: IOException) {
        }
        pool.shutdownNow()
    }

    private fun serve(client: Socket) {
        try {
            client.use { sock ->
                sock.soTimeout = 20_000
                val input = BufferedInputStream(sock.getInputStream())
                val out = sock.getOutputStream()
                val requestLine = readLine(input) ?: return
                val parts = requestLine.split(" ")
                if (parts.size < 2) return
                val method = parts[0]
                var length = 0
                while (true) {
                    val line = readLine(input) ?: break
                    if (line.isEmpty()) break
                    val colon = line.indexOf(':')
                    if (colon > 0 && line.substring(0, colon).trim().equals("content-length", ignoreCase = true)) {
                        length = line.substring(colon + 1).trim().toIntOrNull() ?: 0
                    }
                }
                val uri = Uri.parse("http://tv" + parts[1])
                val path = uri.path ?: "/"
                val paired = uri.getQueryParameter("t") == activity.store.token

                when {
                    method == "GET" && (path == "/" || path == "/remote") ->
                        send(out, 200, "text/html; charset=utf-8", activity.assets.open("www/remote.html").use { it.readBytes() })
                    !paired -> json(out, 403, """{"error":"pair"}""")
                    method == "POST" && path == "/api/key" -> {
                        val key = uri.getQueryParameter("k").orEmpty()
                        if (key in KEYS) activity.js("Cove.key('$key',0)")
                        json(out, 200, """{"ok":true}""")
                    }
                    method == "POST" && path == "/api/cmd" -> {
                        val cmd = uri.getQueryParameter("c").orEmpty()
                        if (COMMAND.matches(cmd)) activity.js("Cove.remote('$cmd')")
                        json(out, 200, """{"ok":true}""")
                    }
                    method == "POST" && path == "/api/photo" -> {
                        if (length <= 0 || length > MAX_PHOTO) {
                            json(out, 413, """{"error":"size"}""")
                        } else {
                            val body = ByteArray(length)
                            DataInputStream(input).readFully(body)
                            val id = activity.store.savePhoto(body)
                            if (id == null) {
                                json(out, 400, """{"error":"image"}""")
                            } else {
                                activity.js("Cove.photoAdded('$id')")
                                json(out, 200, """{"ok":true,"id":"$id"}""")
                            }
                        }
                    }
                    method == "GET" && path == "/api/state" -> json(out, 200, activity.store.prefs)
                    else -> json(out, 404, """{"error":"not found"}""")
                }
            }
        } catch (_: Exception) {
        }
    }

    private fun readLine(input: InputStream): String? {
        val buf = ByteArrayOutputStream()
        while (true) {
            val b = input.read()
            if (b == -1) return if (buf.size() == 0) null else buf.toString("UTF-8")
            if (b == '\n'.code) break
            if (b != '\r'.code) buf.write(b)
            if (buf.size() > 8192) return null
        }
        return buf.toString("UTF-8")
    }

    private fun json(out: OutputStream, code: Int, body: String) =
        send(out, code, "application/json; charset=utf-8", body.toByteArray())

    private fun send(out: OutputStream, code: Int, type: String, body: ByteArray) {
        val reason = when (code) {
            200 -> "OK"; 400 -> "Bad Request"; 403 -> "Forbidden"; 404 -> "Not Found"; 413 -> "Payload Too Large"
            else -> "Error"
        }
        val head = "HTTP/1.1 $code $reason\r\n" +
            "Content-Type: $type\r\n" +
            "Content-Length: ${body.size}\r\n" +
            "Cache-Control: no-store\r\n" +
            "Connection: close\r\n\r\n"
        out.write(head.toByteArray())
        out.write(body)
        out.flush()
    }
}
