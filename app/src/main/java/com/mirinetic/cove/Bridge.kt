package com.mirinetic.cove

import android.content.ActivityNotFoundException
import android.content.Intent
import android.provider.Settings
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

/** What the home screen page can ask the TV for. Exposed to JavaScript as `CoveNative`. */
class Bridge(private val activity: MainActivity) {

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
        return JSONObject()
            .put("url", url ?: "")
            .put("qr", url?.let { Qr.svg(it) } ?: "")
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

    private fun startScreen(intent: Intent) {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        activity.runOnUiThread {
            try {
                activity.startActivity(intent)
            } catch (e: ActivityNotFoundException) {
                activity.js("Cove.toast('이 TV에서는 이 설정 화면을 열 수 없어요')")
            }
        }
    }
}
