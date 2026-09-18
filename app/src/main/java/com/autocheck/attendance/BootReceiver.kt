package com.autocheck.attendance

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** 휴대폰을 껐다 켜도 알람이 사라지지 않게 다시 걸어 준다. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        AlarmScheduler.refresh(context)
    }
}
