package com.mirinetic.cove

import android.annotation.SuppressLint
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * The home screen. The look (designs, backgrounds, tiles) is a local web page bundled in assets/www;
 * this activity hosts it, feeds it the installed apps, and launches the real TV apps.
 */
class MainActivity : Activity() {

    lateinit var store: Store
        private set
    lateinit var apps: AppRepository
        private set

    lateinit var updater: Updater
        private set

    /** The phone remote server, so the settings screen can show whether it is running. */
    var remote: RemoteServer? = null
        private set

    private lateinit var web: WebView
    private var okDown = false
    private var okLong = false

    private val packageReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            apps.invalidate()
            js("Cove.appsChanged()")
        }
    }

    private val installReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            updater.onStatus(intent)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = Store(this)
        apps = AppRepository(this)
        updater = Updater(this)
        val content = LocalContent(this, apps, store)

        web = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mediaPlaybackRequiresUserGesture = false
            isFocusable = true
            isFocusableInTouchMode = true
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    content.handle(request.url)

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                    request.url.host != LocalContent.HOST
            }
            addJavascriptInterface(Bridge(this@MainActivity), "CoveNative")
        }
        setContentView(web)
        hideSystemUi()
        web.loadUrl(LocalContent.ORIGIN + "/index.html")
        web.requestFocus()

        remote = RemoteServer(this).also { it.start() }

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED)
            addAction(Intent.ACTION_PACKAGE_REMOVED)
            addAction(Intent.ACTION_PACKAGE_CHANGED)
            addDataScheme("package")
        }
        val installFilter = IntentFilter(Updater.ACTION_STATUS)
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(packageReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            registerReceiver(installReceiver, installFilter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(packageReceiver, filter)
            registerReceiver(installReceiver, installFilter)
        }
    }

    /** Runs a line of JavaScript in the home screen page. Safe to call from any thread. */
    fun js(code: String) {
        runOnUiThread {
            if (::web.isInitialized) web.evaluateJavascript("window.Cove&&$code", null)
        }
    }

    // Every remote key goes to the page, so the page alone decides what Back/OK/arrows do.
    // A launcher must never close itself on Back.
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val key = when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> "up"
            KeyEvent.KEYCODE_DPAD_DOWN -> "down"
            KeyEvent.KEYCODE_DPAD_LEFT -> "left"
            KeyEvent.KEYCODE_DPAD_RIGHT -> "right"
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_NUMPAD_ENTER, KeyEvent.KEYCODE_BUTTON_A -> "ok"
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_ESCAPE, KeyEvent.KEYCODE_BUTTON_B -> "back"
            KeyEvent.KEYCODE_MENU -> "menu"
            in KeyEvent.KEYCODE_0..KeyEvent.KEYCODE_9 -> "n" + (event.keyCode - KeyEvent.KEYCODE_0)
            in KeyEvent.KEYCODE_NUMPAD_0..KeyEvent.KEYCODE_NUMPAD_9 -> "n" + (event.keyCode - KeyEvent.KEYCODE_NUMPAD_0)
            else -> null
        } ?: return super.dispatchKeyEvent(event)

        // OK acts on release, so holding it can open the app menu instead ("longok").
        if (key == "ok") {
            when (event.action) {
                KeyEvent.ACTION_DOWN -> if (event.repeatCount == 0) {
                    okDown = true
                    okLong = false
                } else if (okDown && !okLong) {
                    okLong = true
                    js("Cove.key('longok',0)")
                }
                KeyEvent.ACTION_UP -> {
                    if (okDown && !okLong) js("Cove.key('ok',0)")
                    okDown = false
                    okLong = false
                }
            }
            return true
        }
        if (event.action == KeyEvent.ACTION_DOWN) js("Cove.key('$key',${event.repeatCount})")
        return true
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Home pressed while Cove is already showing: close any panel and go back to the apps.
        js("Cove.home()")
    }

    override fun onResume() {
        super.onResume()
        hideSystemUi()
        js("Cove.resume()")
    }

    override fun onDestroy() {
        remote?.stop()
        for (receiver in listOf(packageReceiver, installReceiver)) {
            try {
                unregisterReceiver(receiver)
            } catch (_: IllegalArgumentException) {
            }
        }
        web.destroy()
        super.onDestroy()
    }

    @Suppress("DEPRECATION")
    private fun hideSystemUi() {
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE)
    }
}
