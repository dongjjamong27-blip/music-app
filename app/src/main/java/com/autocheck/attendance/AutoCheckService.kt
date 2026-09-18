package com.autocheck.attendance

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import kotlin.concurrent.thread

/**
 * 실제로 "앱 열기 -> 버튼 찾기 -> 누르기" 를 차례대로 해 주는 부분.
 *
 * 알림을 띄우는 포그라운드 서비스로 동작해야 안드로이드가 중간에 꺼 버리지 않는다.
 */
class AutoCheckService : Service() {

    companion object {
        private const val CHANNEL_ID = "auto_attendance_run"
        private const val NOTI_ID = 1001

        @Volatile
        var isRunning = false
            private set

        /** 지금 바로 실행 */
        fun start(context: Context) {
            val i = Intent(context, AutoCheckService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(i)
            } else {
                context.startService(i)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createChannel()
        startForeground(NOTI_ID, buildNotification("출석체크 준비 중..."))

        if (isRunning) return START_NOT_STICKY
        isRunning = true

        thread(name = "auto-check") {
            runCatching { runAll() }
                .onFailure { Store.addLog(this, "오류", false, it.message ?: "알 수 없는 오류") }
            isRunning = false
            stopForegroundCompat()
            stopSelf()
        }
        return START_NOT_STICKY
    }

    // ------------------------------------------------------------------

    private fun runAll() {
        val service = AttendanceAccessibilityService.instance
        if (service == null) {
            Store.addLog(this, "전체", false, "접근성 서비스가 꺼져 있어요. 앱에서 켜 주세요.")
            return
        }

        val targets = Store.targets(this).filter { it.enabled && it.keywords.isNotEmpty() }
        if (targets.isEmpty()) {
            Store.addLog(this, "전체", false, "등록된 앱이 없어요.")
            return
        }

        // 잠금 화면이면 화면을 켠다.
        runCatching {
            startActivity(Intent(this, WakeActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
        Thread.sleep(2500)

        val closeKeywords = Store.closeKeywords(this)
        var okCount = 0

        for (target in targets) {
            if (Store.isDoneToday(this, target.packageName)) continue

            updateNotification("${target.label} 출석체크 중...")

            if (!service.launchApp(target.packageName)) {
                Store.addLog(this, target.label, false, "앱을 열 수 없어요. 삭제된 앱인지 확인해 주세요.")
                continue
            }

            // 앱이 완전히 켜질 때까지 기다린다.
            Thread.sleep(3000)

            val result = if (target.stepMode) {
                clickInOrder(service, target)
            } else {
                clickAny(service, target)
            }

            if (result.success) {
                okCount++
                Store.markDoneToday(this, target.packageName)
                Store.addLog(this, target.label, true, result.message)

                // 출석 후 뜨는 팝업 닫기 (두 번까지 시도)
                Thread.sleep(1500)
                repeat(2) {
                    if (closeKeywords.isNotEmpty()) service.findAndClick(closeKeywords)
                    Thread.sleep(1200)
                }
            } else {
                Store.addLog(this, target.label, false, result.message)
            }

            service.goHome()
            Thread.sleep(1500)
        }

        Store.addLog(this, "전체", okCount > 0, "${targets.size}개 중 ${okCount}개 성공")
        service.goHome()
    }


    // ------------------------------------------------------------------

    private data class ClickResult(val success: Boolean, val message: String)

    /** keywords 중 화면에서 찾아지는 것 하나를 누른다. */
    private fun clickAny(
        service: AttendanceAccessibilityService,
        target: TargetApp
    ): ClickResult {
        val clicked = waitAndClick(service, target, target.keywords, target.waitSeconds)
        return if (clicked != null) {
            ClickResult(true, "'$clicked' 버튼을 눌렀어요.")
        } else {
            ClickResult(
                false,
                "'${target.keywords.joinToString(", ")}' 글자를 못 찾았어요. 버튼 글자를 다시 확인해 주세요."
            )
        }
    }

    /** keywords 를 적은 순서대로 하나씩 눌러 나간다. (출석체크 -> 확인 -> 닫기) */
    private fun clickInOrder(
        service: AttendanceAccessibilityService,
        target: TargetApp
    ): ClickResult {
        // 단계마다 나눠서 기다린다. (최소 5초씩)
        val perStep = maxOf(target.waitSeconds / target.keywords.size, 5)
        val doneSteps = ArrayList<String>()

        for ((index, keyword) in target.keywords.withIndex()) {
            updateNotification("${target.label} ${index + 1}단계: $keyword")
            val clicked = waitAndClick(service, target, listOf(keyword), perStep)
            if (clicked == null) {
                return if (doneSteps.isEmpty()) {
                    ClickResult(false, "1단계 '$keyword' 를 못 찾았어요. 버튼 글자를 확인해 주세요.")
                } else {
                    // 앞 단계는 눌렸으니 출석 자체는 된 것으로 본다.
                    ClickResult(
                        true,
                        "${doneSteps.joinToString(" > ")} 까지 눌렀어요. ('$keyword' 는 못 찾음)"
                    )
                }
            }
            doneSteps.add(clicked)
            Thread.sleep(1500)
        }
        return ClickResult(true, "${doneSteps.joinToString(" > ")} 순서대로 눌렀어요.")
    }

    /**
     * 정해진 시간 동안 0.8초마다 화면을 다시 살펴보며 버튼을 찾는다.
     * (앱 화면이 늦게 뜨거나 광고가 먼저 떠도 기다렸다가 누를 수 있게)
     */
    private fun waitAndClick(
        service: AttendanceAccessibilityService,
        target: TargetApp,
        keywords: List<String>,
        seconds: Int
    ): String? {
        val tries = maxOf((seconds * 1000) / 800, 5)
        repeat(tries) {
            if (service.currentPackage == target.packageName) {
                val hit = service.findAndClick(keywords)
                if (hit != null) return hit
            }
            Thread.sleep(800)
        }
        return null
    }

    // ------------------------------------------------------------------

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                nm.createNotificationChannel(
                    NotificationChannel(CHANNEL_ID, "자동 출석체크", NotificationManager.IMPORTANCE_LOW)
                )
            }
        }
    }

    private fun buildNotification(text: String): Notification {
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        return builder
            .setContentTitle("자동 출석체크")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_my_calendar)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        getSystemService(NotificationManager::class.java).notify(NOTI_ID, buildNotification(text))
    }

    private fun stopForegroundCompat() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }
}
