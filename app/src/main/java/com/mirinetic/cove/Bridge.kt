package com.mirinetic.cove

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

/** What the home screen page can ask the TV for. Exposed to JavaScript as `CoveNative`. */
class Bridge(private val activity: MainActivity) {

    private companion object {
        val PACKAGE = Regex("[A-Za-z0-9._]{1,200}")
    }

    @JavascriptInterface
    fun apps(): String = activity.apps.json()

    @JavascriptInterface
    fun launch(pkg: String): Boolean {
        val intent = activity.apps.launchIntent(pkg) ?: return false
        activity.runOnUiThread {
            try {
                activity.startActivity(intent)
            } catch (e: Exception) {
                activity.js("Cove.toast('앱을 열 수 없어요')")
            }
        }
        return true
    }

    /** Opens the system's uninstall confirmation for an app. */
    @JavascriptInterface
    fun uninstall(pkg: String) {
        if (PACKAGE.matches(pkg)) startScreen(Intent(Intent.ACTION_DELETE, Uri.parse("package:$pkg")))
    }

    /** Opens the system "App info" screen (also where "Allow restricted settings" lives). */
    @JavascriptInterface
    fun appInfo(pkg: String) {
        if (PACKAGE.matches(pkg)) startScreen(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg")))
    }

    @JavascriptInterface
    fun selfPackage(): String = activity.packageName

    @JavascriptInterface
    fun loadPrefs(): String = activity.store.prefs

    @JavascriptInterface
    fun savePrefs(json: String) {
        activity.store.prefs = json
    }

    @JavascriptInterface
    fun photos(): String = JSONArray(activity.store.photos()).toString()

    @JavascriptInterface
    fun deletePhoto(id: String) {
        activity.store.deletePhoto(id)
    }

    @JavascriptInterface
    fun remoteInfo(): String {
        val url = RemoteServer.url(activity.store)
        val server = activity.remote
        return JSONObject()
            .put("url", url ?: "")
            .put("qr", url?.let { Qr.svg(it) } ?: "")
            .put("running", server?.running == true)
            .put("error", server?.error ?: "")
            .put("port", RemoteServer.PORT)
            .put("ips", JSONArray(RemoteServer.allIps()))
            .toString()
    }

    @JavascriptInterface
    fun overrideStatus(): String = JSONObject()
        .put("service", HomeOverrideService.isEnabled(activity))
        .put("enabled", activity.store.overrideOn)
        .toString()

    @JavascriptInterface
    fun setOverride(on: Boolean) {
        activity.store.overrideOn = on
    }

    @JavascriptInterface
    fun openAccessibility() = startScreen(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))

    @JavascriptInterface
    fun openTvSettings() = startScreen(Intent(Settings.ACTION_SETTINGS))

    @JavascriptInterface
    fun version(): String = BuildConfig.VERSION_NAME

    /** Answers later through Cove.updateResult(json). */
    @JavascriptInterface
    fun checkUpdate() = activity.updater.check()

    /** Reports through Cove.updateProgress(phase). */
    @JavascriptInterface
    fun installUpdate() = activity.updater.install()

    private fun startScreen(intent: Intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        activity.runOnUiThread {
            try {
                activity.startActivity(intent)
            } catch (e: ActivityNotFoundException) {
                activity.js("Cove.toast('이 TV에서는 이 화면을 열 수 없어요')")
            }
        }
    }
}
