package com.mirinetic.cove

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.util.LruCache
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

/** The TV apps the home screen can show: names, real banners/icons, and a brand colour picked from them. */
class AppRepository(private val context: Context) {

    data class App(val pkg: String, val label: String, val color: Int, val hasBanner: Boolean)

    private val pm: PackageManager = context.packageManager

    @Volatile
    private var cached: List<App>? = null

    private val images = object : LruCache<String, ByteArray>(12 * 1024 * 1024) {
        override fun sizeOf(key: String, value: ByteArray) = value.size
    }

    fun invalidate() {
        cached = null
        images.evictAll()
    }

    @Synchronized
    fun list(): List<App> {
        cached?.let { return it }
        val found = LinkedHashMap<String, App>()
        for (category in listOf(Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER)) {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(category)
            @Suppress("DEPRECATION")
            val activities = pm.queryIntentActivities(intent, 0)
            for (info in activities) {
                val pkg = info.activityInfo.packageName
                if (pkg == context.packageName || found.containsKey(pkg)) continue
                val banner = bannerOf(pkg)
                val label = info.loadLabel(pm).toString()
                found[pkg] = App(pkg, label, dominantColor(banner ?: iconOf(pkg)), banner != null)
            }
        }
        return found.values.sortedBy { it.label.lowercase() }.also { cached = it }
    }

    fun json(): String {
        val arr = JSONArray()
        for (app in list()) {
            arr.put(
                JSONObject()
                    .put("pkg", app.pkg)
                    .put("label", app.label)
                    .put("color", String.format("#%06X", 0xFFFFFF and app.color))
                    .put("banner", app.hasBanner)
            )
        }
        return arr.toString()
    }

    fun launchIntent(pkg: String): Intent? =
        (pm.getLeanbackLaunchIntentForPackage(pkg) ?: pm.getLaunchIntentForPackage(pkg))
            ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    /** PNG bytes of an app's banner ("banner") or icon ("icon"), or null if it has none. */
    fun image(kind: String, pkg: String): ByteArray? {
        val key = "$kind/$pkg"
        images.get(key)?.let { return it }
        val drawable = (if (kind == "banner") bannerOf(pkg) else iconOf(pkg)) ?: return null
        val (w, h) = if (kind == "banner") 640 to 360 else 256 to 256
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        drawable.setBounds(0, 0, w, h)
        drawable.draw(Canvas(bmp))
        val bytes = ByteArrayOutputStream().use {
            bmp.compress(Bitmap.CompressFormat.PNG, 100, it)
            it.toByteArray()
        }
        bmp.recycle()
        images.put(key, bytes)
        return bytes
    }

    private fun bannerOf(pkg: String): Drawable? = try {
        pm.getLeanbackLaunchIntentForPackage(pkg)?.let { pm.getActivityBanner(it) } ?: pm.getApplicationBanner(pkg)
    } catch (e: Exception) {
        null
    }

    private fun iconOf(pkg: String): Drawable? = try {
        pm.getApplicationIcon(pkg)
    } catch (e: Exception) {
        null
    }

    /** The most colourful hue in the artwork, so tiles can use the app's own brand colour. */
    private fun dominantColor(drawable: Drawable?): Int {
        val fallback = Color.rgb(42, 47, 58)
        if (drawable == null) return fallback
        val size = 24
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        drawable.setBounds(0, 0, size, size)
        drawable.draw(Canvas(bmp))

        val weight = FloatArray(12)
        val sum = Array(12) { FloatArray(3) }
        val hsv = FloatArray(3)
        var r = 0f
        var g = 0f
        var b = 0f
        var n = 0
        for (y in 0 until size) for (x in 0 until size) {
            val p = bmp.getPixel(x, y)
            if (Color.alpha(p) < 200) continue
            r += Color.red(p); g += Color.green(p); b += Color.blue(p); n++
            Color.colorToHSV(p, hsv)
            val w = hsv[1] * hsv[2]
            if (w < 0.2f) continue
            val bucket = (hsv[0] / 30f).toInt().coerceIn(0, 11)
            weight[bucket] += w
            sum[bucket][0] += Color.red(p) * w
            sum[bucket][1] += Color.green(p) * w
            sum[bucket][2] += Color.blue(p) * w
        }
        bmp.recycle()
        val best = weight.indices.maxByOrNull { weight[it] } ?: return fallback
        return when {
            weight[best] > 6f -> Color.rgb(
                (sum[best][0] / weight[best]).toInt(),
                (sum[best][1] / weight[best]).toInt(),
                (sum[best][2] / weight[best]).toInt()
            )
            n > 0 -> Color.rgb((r / n).toInt(), (g / n).toInt(), (b / n).toInt())
            else -> fallback
        }
    }
}
