package com.mirinetic.cove

import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.text.InputType
import android.view.WindowManager
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.FrameLayout
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

    /**
     * Closes Cove and shows the TV's own home screen. Cove is a launcher, so Back never does this; it is a
     * settings action. With the home button override on, the next Home press brings Cove back (unless
     * keepOff is true, which also switches the override off).
     */
    @JavascriptInterface
    fun exit(keepOff: Boolean) {
        if (keepOff) activity.store.overrideOn = false
        activity.store.exitUntil = android.os.SystemClock.uptimeMillis() + 4000
        activity.runOnUiThread {
            val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            @Suppress("DEPRECATION")
            val stock = activity.packageManager.queryIntentActivities(home, 0)
                .map { it.activityInfo }
                .firstOrNull { it.packageName != activity.packageName && it.packageName != "com.android.settings" && it.packageName != "com.android.tv.settings" }
            try {
                if (stock != null) activity.startActivity(Intent(home).setClassName(stock.packageName, stock.name).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            } catch (e: Exception) { /* nothing else to show: just close */ }
            activity.finishAndRemoveTask()
        }
    }

    @JavascriptInterface
    fun openAccessibility() = startScreen(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))

    @JavascriptInterface
    fun openTvSettings() = startScreen(Intent(Settings.ACTION_SETTINGS))

    @JavascriptInterface
    fun version(): String = BuildConfig.VERSION_NAME

    /**
     * Asks for a line of text with the TV's own keyboard (which on Google TV also has a microphone).
     * Answers later through Cove.textResult(id, text) - text is null when cancelled.
     */
    @JavascriptInterface
    fun askText(id: String, title: String, initial: String) {
        activity.runOnUiThread {
            val field = EditText(activity).apply {
                setText(initial)
                setSelection(text.length)
                inputType = InputType.TYPE_CLASS_TEXT
                imeOptions = EditorInfo.IME_ACTION_DONE
                setSingleLine()
            }
            val box = FrameLayout(activity).apply {
                val pad = (24 * resources.displayMetrics.density).toInt()
                setPadding(pad, pad / 2, pad, 0)
                addView(field)
            }
            var answered = false
            val answer = { text: String? ->
                if (!answered) {
                    answered = true
                    activity.js("Cove.textResult(${JSONObject.quote(id)},${if (text == null) "null" else JSONObject.quote(text)})")
                }
            }
            val dialog = AlertDialog.Builder(activity, android.R.style.Theme_DeviceDefault_Dialog_Alert)
                .setTitle(title)
                .setView(box)
                .setPositiveButton("확인") { _, _ -> answer(field.text.toString()) }
                .setNegativeButton("취소") { _, _ -> answer(null) }
                .setOnCancelListener { answer(null) }
                .create()
            field.setOnEditorActionListener { _, action, _ ->
                if (action == EditorInfo.IME_ACTION_DONE) { answer(field.text.toString()); dialog.dismiss(); true } else false
            }
            dialog.window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE)
            dialog.show()
            field.requestFocus()
        }
    }

    /** Saves what the screensaver should show (photos, clock, weather, events, memos). */
    @JavascriptInterface
    fun saveSnapshot(json: String) {
        activity.store.snapshot = json
    }

    /** TV Settings > Screen saver, where Cove can be chosen (hidden on some Google TV models). */
    @JavascriptInterface
    fun openDreamSettings() = startScreen(Intent(Settings.ACTION_DREAM_SETTINGS))

    /** Downloads a calendar subscription; answers later through Cove.calFetched(id, json). */
    @JavascriptInterface
    fun fetchCalendar(id: String, url: String) {
        if (url.startsWith("http://", true) || url.startsWith("https://", true) || url.startsWith("webcal", true)) {
            activity.calendars.fetch(id, url)
        }
    }

    /** News feeds (RSS / Atom); answers later through Cove.feedFetched(id, json). */
    @JavascriptInterface
    fun fetchFeed(id: String, url: String) {
        if (url.startsWith("https://", true) || url.startsWith("http://", true)) activity.calendars.fetchFeed(id, url)
    }

    /** A QR code (SVG) for a link, so an article can be opened on the phone. */
    @JavascriptInterface
    fun qrSvg(text: String): String = if (text.length in 1..1500) Qr.svg(text) else ""

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
