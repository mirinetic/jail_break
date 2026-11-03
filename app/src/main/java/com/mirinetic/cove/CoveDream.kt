package com.mirinetic.cove

import android.annotation.SuppressLint
import android.graphics.Color
import android.service.dreams.DreamService
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Cove as the TV's screensaver: photos, clock, weather, upcoming events and memos.
 * It shows the snapshot the home screen last saved (ambient.html reads it through CoveDreamNative).
 * Choose it in TV Settings > Screen saver, or with ADB on Google TV where that menu is hidden.
 */
class CoveDream : DreamService() {

    private var web: WebView? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        isInteractive = false
        isFullscreen = true
        isScreenBright = true
        val store = Store(this)
        val content = LocalContent(this, AppRepository(this), store)
        web = WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    content.handle(request.url)

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = true
            }
            addJavascriptInterface(object {
                @JavascriptInterface
                fun snapshot(): String = store.snapshot
            }, "CoveDreamNative")
            loadUrl(LocalContent.ORIGIN + "/ambient.html")
        }
        setContentView(web)
    }

    override fun onDetachedFromWindow() {
        web?.destroy()
        web = null
        super.onDetachedFromWindow()
    }
}
