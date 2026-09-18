package com.autocheck.attendance

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

/** 매일 정해진 시간에 자동으로 깨어나도록 알람을 거는 곳 */
object AlarmScheduler {

    private const val REQUEST_CODE = 7001

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java)
        return PendingIntent.getBroadcast(
            context, REQUEST_CODE, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /** 다음 실행 시간 (오늘 시간이 지났으면 내일) */
    fun nextTriggerMillis(context: Context): Long {
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, Store.hour(context))
            set(Calendar.MINUTE, Store.minute(context))
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (cal.timeInMillis <= System.currentTimeMillis()) {
            cal.add(Calendar.DAY_OF_YEAR, 1)
        }
        return cal.timeInMillis
    }

    fun schedule(context: Context) {
        val am = context.getSystemService(AlarmManager::class.java)
        val pi = pendingIntent(context)
        val at = nextTriggerMillis(context)

        val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            am.canScheduleExactAlarms()
        } else true

        if (canExact) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        } else {
            // 정확한 알람 권한이 없으면 조금 늦게라도 실행되도록 한다.
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
    }

    fun cancel(context: Context) {
        context.getSystemService(AlarmManager::class.java).cancel(pendingIntent(context))
    }

    /** 설정이 켜져 있으면 알람을 다시 걸고, 꺼져 있으면 취소한다. */
    fun refresh(context: Context) {
        if (Store.autoEnabled(context)) schedule(context) else cancel(context)
    }
}
