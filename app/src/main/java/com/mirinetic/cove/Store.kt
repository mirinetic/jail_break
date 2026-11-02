package com.mirinetic.cove

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

/** Settings and the photos sent from the phone. Everything stays on the TV. */
class Store(context: Context) {

    private val sp = context.applicationContext.getSharedPreferences("cove", Context.MODE_PRIVATE)
    private val photoDir: File by lazy { File(context.applicationContext.filesDir, "photos").apply { mkdirs() } }

    /** The page's appearance settings, as the JSON the page wrote. */
    var prefs: String
        get() = sp.getString("prefs", "{}") ?: "{}"
        set(value) {
            sp.edit().putString("prefs", value).apply()
        }

    /** Whether the accessibility service should bring Cove back over the stock home screen. */
    var overrideOn: Boolean
        get() = sp.getBoolean("override", true)
        set(value) {
            sp.edit().putBoolean("override", value).apply()
        }

    /** Pairing code carried in the phone remote's QR link. */
    val token: String
        get() = sp.getString("token", null)
            ?: UUID.randomUUID().toString().replace("-", "").take(12).also {
                sp.edit().putString("token", it).apply()
            }

    fun photos(): List<String> =
        photoDir.listFiles()
            ?.filter { it.isFile && it.name.endsWith(".jpg") }
            ?.sortedBy { it.name }
            ?.map { it.name.removeSuffix(".jpg") }
            ?: emptyList()

    fun photoFile(id: String): File? =
        if (ID.matches(id)) File(photoDir, "$id.jpg").takeIf { it.isFile } else null

    fun deletePhoto(id: String) {
        photoFile(id)?.delete()
    }

    /** Decodes a phone photo, turns it upright, shrinks it to TV size and saves it. Returns its id. */
    fun savePhoto(bytes: ByteArray): String? {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null

        var sample = 1
        while (bounds.outWidth / (sample * 2) >= MAX_W && bounds.outHeight / (sample * 2) >= MAX_H) sample *= 2
        var bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
            ?: return null

        val rotation = try {
            when (ExifInterface(ByteArrayInputStream(bytes)).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> 0f
            }
        } catch (e: Exception) {
            0f
        }
        if (rotation != 0f) {
            bmp = Bitmap.createBitmap(bmp, 0, 0, bmp.width, bmp.height, Matrix().apply { postRotate(rotation) }, true)
        }
        val scale = minOf(1f, maxOf(MAX_W.toFloat() / bmp.width, MAX_H.toFloat() / bmp.height))
        if (scale < 1f) {
            bmp = Bitmap.createScaledBitmap(bmp, (bmp.width * scale).toInt(), (bmp.height * scale).toInt(), true)
        }

        val id = "p" + System.currentTimeMillis()
        FileOutputStream(File(photoDir, "$id.jpg")).use { bmp.compress(Bitmap.CompressFormat.JPEG, 88, it) }
        return id
    }

    private companion object {
        val ID = Regex("[a-z0-9-]{1,40}")
        const val MAX_W = 1920
        const val MAX_H = 1080
    }
}
