package com.autocheck.attendance

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * 앱을 앱 안에서 바로 새 버전으로 바꿔 주는 부분.
 *
 * GitHub 에 올려 둔 version.json 을 읽어서 지금 버전보다 새 것이 있으면
 * APK 를 내려받고 설치 화면을 띄운다. (설치 버튼은 사람이 한 번 눌러야 한다)
 */
object Updater {

    private const val BASE =
        "https://github.com/dongjjamong27-blip/music-app/releases/download/apk"
    private const val VERSION_URL = "$BASE/version.json"

    data class Info(val versionCode: Long, val versionName: String, val url: String)

    /** 지금 깔려 있는 앱의 버전 번호 */
    fun currentVersionCode(context: Context): Long {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            info.longVersionCode
        } else {
            @Suppress("DEPRECATION")
            info.versionCode.toLong()
        }
    }

    fun currentVersionName(context: Context): String =
        context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "?"

    /** 인터넷에서 최신 버전 정보를 읽어 온다. (인터넷 사용은 이 함수와 download 뿐) */
    fun fetchLatest(): Info {
        val text = openStream(VERSION_URL).use { it.readBytes().toString(Charsets.UTF_8) }
        val o = JSONObject(text)
        return Info(
            versionCode = o.getLong("versionCode"),
            versionName = o.optString("versionName", "?"),
            url = o.optString("url", "$BASE/auto-attendance.apk")
        )
    }

    /** APK 를 내려받아 임시 폴더에 저장한다. */
    fun download(context: Context, url: String): File {
        val file = File(context.cacheDir, "update.apk")
        if (file.exists()) file.delete()
        openStream(url).use { input ->
            file.outputStream().use { output -> input.copyTo(output) }
        }
        return file
    }

    /** 설치 화면을 띄운다. */
    fun install(context: Context, file: File) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    /** 이 앱이 다른 앱을 설치해도 되는지 (안드로이드 8 이상에서 한 번 허용해야 함) */
    fun canInstall(context: Context): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else true

    /** 설치 허용 설정 화면을 연다. */
    fun openInstallPermission(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            runCatching {
                context.startActivity(
                    Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES)
                        .setData(Uri.parse("package:" + context.packageName))
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
        }
    }

    // ------------------------------------------------------------------

    /** GitHub 은 다른 주소로 한 번 넘겨 주기 때문에 직접 따라가 준다. */
    private fun openStream(url: String): java.io.InputStream {
        var current = url
        repeat(5) {
            val conn = (URL(current).openConnection() as HttpURLConnection).apply {
                connectTimeout = 15000
                readTimeout = 30000
                instanceFollowRedirects = false
                setRequestProperty("User-Agent", "auto-attendance-app")
            }
            when (conn.responseCode) {
                in 300..399 -> {
                    val next = conn.getHeaderField("Location")
                    conn.disconnect()
                    if (next.isNullOrBlank()) throw java.io.IOException("주소를 찾을 수 없어요.")
                    current = next
                }
                HttpURLConnection.HTTP_OK -> return conn.inputStream
                else -> {
                    val code = conn.responseCode
                    conn.disconnect()
                    throw java.io.IOException("서버 응답 $code")
                }
            }
        }
        throw java.io.IOException("주소가 너무 여러 번 바뀌었어요.")
    }
}
