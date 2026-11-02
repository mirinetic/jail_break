package com.mirinetic.cove

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityManager

/**
 * Optional "home button override". Google TV has no setting to change the home screen app, so when this
 * service is switched on in Accessibility it watches which app comes to the front. When it is the stock
 * home screen (after the Home button or at power-on), it opens Cove instead. It never reads screen content.
 */
class HomeOverrideService : AccessibilityService() {

    companion object {
        private val IGNORE = setOf("com.android.settings", "com.android.tv.settings", "com.android.systemui")

        fun isEnabled(context: Context): Boolean {
            val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
            return am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
                .any { it.resolveInfo?.serviceInfo?.packageName == context.packageName }
        }
    }

    private var homes: Set<String> = emptySet()
    private var lastJump = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        refreshHomes()
    }

    private fun refreshHomes() {
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        @Suppress("DEPRECATION")
        homes = packageManager.queryIntentActivities(intent, PackageManager.MATCH_ALL)
            .map { it.activityInfo.packageName }
            .filter { it != packageName && it !in IGNORE }
            .toSet()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (homes.isEmpty()) refreshHomes()
        if (pkg !in homes) return
        if (!Store(this).overrideOn) return
        val now = SystemClock.uptimeMillis()
        if (now - lastJump < 700) return
        lastJump = now
        startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    override fun onInterrupt() {}
}
