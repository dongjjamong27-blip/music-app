package com.autocheck.attendance

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** 자동으로 출석체크할 앱 하나의 정보 */
data class TargetApp(
    val packageName: String,
    val label: String,
    /** 화면에서 찾아 누를 글자들. 예) "출석체크", "출석" */
    val keywords: List<String>,
    val enabled: Boolean = true,
    /** 앱을 연 뒤 버튼을 찾아볼 최대 시간(초) */
    val waitSeconds: Int = 20,
    /**
     * true  = keywords 를 위에서부터 '순서대로' 하나씩 누른다. (출석체크 -> 확인 -> 닫기)
     * false = keywords 중 화면에서 먼저 찾아지는 것 하나만 누른다.
     */
    val stepMode: Boolean = false
)

/** 실행 결과 한 줄 */
data class LogItem(val timeMillis: Long, val label: String, val success: Boolean, val message: String) {
    fun timeText(): String =
        SimpleDateFormat("MM/dd HH:mm", Locale.KOREA).format(Date(timeMillis))
}

/**
 * 설정과 기록을 휴대폰 안에 저장하는 곳.
 * 어려운 데이터베이스 대신 간단한 SharedPreferences + JSON 을 쓴다.
 */
object Store {
    private const val PREF = "auto_attendance"
    private const val KEY_TARGETS = "targets"
    private const val KEY_LOGS = "logs"
    private const val KEY_HOUR = "hour"
    private const val KEY_MINUTE = "minute"
    private const val KEY_AUTO = "auto_enabled"
    private const val KEY_CLOSE = "close_keywords"
    private const val KEY_DONE_PREFIX = "done_"

    private fun prefs(c: Context) = c.applicationContext.getSharedPreferences(PREF, Context.MODE_PRIVATE)

    // ---------- 대상 앱 목록 ----------

    fun targets(c: Context): List<TargetApp> {
        val raw = prefs(c).getString(KEY_TARGETS, "[]") ?: "[]"
        val arr = runCatching { JSONArray(raw) }.getOrElse { JSONArray() }
        val list = ArrayList<TargetApp>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val kwArr = o.optJSONArray("keywords") ?: JSONArray()
            val kws = ArrayList<String>()
            for (j in 0 until kwArr.length()) {
                val k = kwArr.optString(j).trim()
                if (k.isNotEmpty()) kws.add(k)
            }
            list.add(
                TargetApp(
                    packageName = o.optString("packageName"),
                    label = o.optString("label"),
                    keywords = kws,
                    enabled = o.optBoolean("enabled", true),
                    waitSeconds = o.optInt("waitSeconds", 20),
                    stepMode = o.optBoolean("stepMode", false)
                )
            )
        }
        return list
    }

    fun saveTargets(c: Context, list: List<TargetApp>) {
        val arr = JSONArray()
        list.forEach { t ->
            val o = JSONObject()
            o.put("packageName", t.packageName)
            o.put("label", t.label)
            o.put("keywords", JSONArray(t.keywords))
            o.put("enabled", t.enabled)
            o.put("waitSeconds", t.waitSeconds)
            o.put("stepMode", t.stepMode)
            arr.put(o)
        }
        prefs(c).edit().putString(KEY_TARGETS, arr.toString()).apply()
    }

    fun addTarget(c: Context, t: TargetApp) {
        val list = targets(c).filterNot { it.packageName == t.packageName }.toMutableList()
        list.add(t)
        saveTargets(c, list)
    }

    fun removeTarget(c: Context, packageName: String) {
        saveTargets(c, targets(c).filterNot { it.packageName == packageName })
    }

    // ---------- 알람 시간 ----------

    fun hour(c: Context): Int = prefs(c).getInt(KEY_HOUR, 9)
    fun minute(c: Context): Int = prefs(c).getInt(KEY_MINUTE, 0)

    fun setTime(c: Context, hour: Int, minute: Int) {
        prefs(c).edit().putInt(KEY_HOUR, hour).putInt(KEY_MINUTE, minute).apply()
    }

    fun autoEnabled(c: Context): Boolean = prefs(c).getBoolean(KEY_AUTO, false)

    fun setAutoEnabled(c: Context, v: Boolean) {
        prefs(c).edit().putBoolean(KEY_AUTO, v).apply()
    }

    /** 출석체크 후 뜨는 팝업을 닫을 때 쓰는 글자들 */
    fun closeKeywords(c: Context): List<String> =
        (prefs(c).getString(KEY_CLOSE, "확인,닫기,OK") ?: "")
            .split(",").map { it.trim() }.filter { it.isNotEmpty() }

    fun setCloseKeywords(c: Context, text: String) {
        prefs(c).edit().putString(KEY_CLOSE, text).apply()
    }

    // ---------- 오늘 이미 했는지 ----------

    private fun today(): String = SimpleDateFormat("yyyyMMdd", Locale.KOREA).format(Date())

    fun isDoneToday(c: Context, packageName: String): Boolean =
        prefs(c).getString(KEY_DONE_PREFIX + packageName, "") == today()

    fun markDoneToday(c: Context, packageName: String) {
        prefs(c).edit().putString(KEY_DONE_PREFIX + packageName, today()).apply()
    }

    fun clearDoneToday(c: Context) {
        val e = prefs(c).edit()
        prefs(c).all.keys.filter { it.startsWith(KEY_DONE_PREFIX) }.forEach { e.remove(it) }
        e.apply()
    }

    // ---------- 실행 기록 ----------

    fun logs(c: Context): List<LogItem> {
        val raw = prefs(c).getString(KEY_LOGS, "[]") ?: "[]"
        val arr = runCatching { JSONArray(raw) }.getOrElse { JSONArray() }
        val list = ArrayList<LogItem>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            list.add(
                LogItem(
                    timeMillis = o.optLong("t"),
                    label = o.optString("label"),
                    success = o.optBoolean("ok"),
                    message = o.optString("msg")
                )
            )
        }
        return list
    }

    fun addLog(c: Context, label: String, success: Boolean, message: String) {
        val list = logs(c).toMutableList()
        list.add(0, LogItem(System.currentTimeMillis(), label, success, message))
        val trimmed = list.take(60)
        val arr = JSONArray()
        trimmed.forEach {
            val o = JSONObject()
            o.put("t", it.timeMillis)
            o.put("label", it.label)
            o.put("ok", it.success)
            o.put("msg", it.message)
            arr.put(o)
        }
        prefs(c).edit().putString(KEY_LOGS, arr.toString()).apply()
    }

    fun clearLogs(c: Context) {
        prefs(c).edit().remove(KEY_LOGS).apply()
    }
}
