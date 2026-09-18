package com.autocheck.attendance

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** 정해진 시간이 되면 안드로이드가 여기를 호출한다. */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (Store.autoEnabled(context)) {
            AutoCheckService.start(context)
        }
        // 내일 것도 다시 예약한다.
        AlarmScheduler.refresh(context)
    }
}
