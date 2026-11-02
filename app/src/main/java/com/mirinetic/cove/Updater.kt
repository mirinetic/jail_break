package com.mirinetic.cove

import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.provider.Settings
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * In-app update. The build workflow publishes Cove.apk and version.json to the "cove-latest" release;
 * this compares versions and installs the new APK over the current one (settings are kept).
 */
class Updater(private val activity: MainActivity) {

    companion object {
        const val BASE = "https://github.com/mirinetic/jail_break/releases/download/cove-latest/"
        const val ACTION_STATUS = "com.mirinetic.cove.INSTALL_STATUS"
    }

    private val worker = Executors.newSingleThreadExecutor()

    fun check() {
        worker.execute {
            val result = JSONObject()
            try {
                val info = JSONObject(open(BASE + "version.json").inputStream.use { it.readBytes().toString(Charsets.UTF_8) })
                val latest = info.getInt("versionCode")
                result.put("ok", true)
                    .put("current", BuildConfig.VERSION_CODE)
                    .put("latest", latest)
                    .put("latestName", info.optString("versionName"))
                    .put("notes", info.optString("notes"))
                    .put("available", latest > BuildConfig.VERSION_CODE)
            } catch (e: Exception) {
                result.put("ok", false).put("error", e.javaClass.simpleName)
            }
            activity.js("Cove.updateResult(${JSONObject.quote(result.toString())})")
        }
    }

    fun install() {
        worker.execute {
            try {
                if (Build.VERSION.SDK_INT >= 26 && !activity.packageManager.canRequestPackageInstalls()) {
                    activity.runOnUiThread {
                        try {
                            activity.startActivity(
                                Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${activity.packageName}"))
                                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            )
                        } catch (_: Exception) {
                        }
                    }
                    activity.js("Cove.updateProgress('permission')")
                    return@execute
                }
                activity.js("Cove.updateProgress('download')")
                val installer = activity.packageManager.packageInstaller
                val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
                val sessionId = installer.createSession(params)
                installer.openSession(sessionId).use { session ->
                    open(BASE + "Cove.apk").inputStream.use { input ->
                        session.openWrite("cove.apk", 0, -1).use { out ->
                            input.copyTo(out)
                            session.fsync(out)
                        }
                    }
                    val status = Intent(ACTION_STATUS).setPackage(activity.packageName)
                    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                        (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
                    session.commit(PendingIntent.getBroadcast(activity, sessionId, status, flags).intentSender)
                }
                activity.js("Cove.updateProgress('confirm')")
            } catch (e: Exception) {
                activity.js("Cove.updateProgress('error')")
            }
        }
    }

    /** Called by MainActivity when the installer reports back. */
    fun onStatus(intent: Intent) {
        when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirm: Intent? = if (Build.VERSION.SDK_INT >= 33) {
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                } else {
                    @Suppress("DEPRECATION")
                    intent.getParcelableExtra(Intent.EXTRA_INTENT)
                }
                confirm?.let {
                    it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    try {
                        activity.startActivity(it)
                    } catch (_: Exception) {
                        activity.js("Cove.updateProgress('error')")
                    }
                }
            }
            PackageInstaller.STATUS_SUCCESS -> Unit // the new version replaces this process
            else -> activity.js("Cove.updateProgress('error')")
        }
    }

    private fun open(url: String): HttpURLConnection {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 15_000
        conn.readTimeout = 60_000
        conn.instanceFollowRedirects = true
        conn.setRequestProperty("Cache-Control", "no-cache")
        if (conn.responseCode !in 200..299) throw IllegalStateException("HTTP ${conn.responseCode}")
        return conn
    }
}
