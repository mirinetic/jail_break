package com.mirinetic.cove

import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel

/** Draws a QR code as an SVG string for the phone remote link. */
object Qr {
    fun svg(text: String): String {
        val hints = mapOf(EncodeHintType.MARGIN to 1, EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M)
        val m = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 0, 0, hints)
        val d = StringBuilder()
        for (y in 0 until m.height) for (x in 0 until m.width) {
            if (m.get(x, y)) d.append("M").append(x).append(' ').append(y).append("h1v1h-1z")
        }
        return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 ${m.width} ${m.height}\" shape-rendering=\"crispEdges\">" +
            "<rect width=\"100%\" height=\"100%\" fill=\"#fff\"/><path d=\"$d\" fill=\"#000\"/></svg>"
    }
}
