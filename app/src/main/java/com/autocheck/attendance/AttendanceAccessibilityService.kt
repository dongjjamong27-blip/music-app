package com.autocheck.attendance

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * 화면을 대신 눌러 주는 부분.
 *
 * 안드로이드에서는 "접근성 서비스"만 화면의 글자를 읽고 버튼을 대신 누를 수 있다.
 * 그래서 이 서비스가 켜져 있어야 자동 출석체크가 동작한다.
 */
class AttendanceAccessibilityService : AccessibilityService() {

    companion object {
        /** 지금 켜져 있는 서비스. 다른 곳에서 가져다 쓴다. */
        @Volatile
        var instance: AttendanceAccessibilityService? = null
            private set

        /** 접근성 서비스가 켜져 있는지 확인 */
        fun isEnabled(context: Context): Boolean {
            val expected = "${context.packageName}/${AttendanceAccessibilityService::class.java.name}"
            val enabled = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false
            val splitter = TextUtils.SimpleStringSplitter(':')
            splitter.setString(enabled)
            while (splitter.hasNext()) {
                if (splitter.next().equals(expected, ignoreCase = true)) return true
            }
            return false
        }
    }

    /** 지금 화면에 보이는 앱의 패키지 이름 */
    @Volatile
    var currentPackage: String? = null
        private set

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val pkg = event?.packageName?.toString() ?: return
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            currentPackage = pkg
        }
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        instance = null
        super.onDestroy()
    }

    // ------------------------------------------------------------------

    /** 다른 앱을 화면에 띄운다. 접근성 서비스는 백그라운드에서도 앱을 열 수 있다. */
    fun launchApp(packageName: String): Boolean {
        val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        return runCatching { startActivity(intent) }.isSuccess
    }

    fun goHome() {
        performGlobalAction(GLOBAL_ACTION_HOME)
    }

    fun goBack() {
        performGlobalAction(GLOBAL_ACTION_BACK)
    }

    /**
     * 지금 화면에서 keywords 중 하나가 들어간 버튼을 찾아 누른다.
     * 누르면 눌린 글자를 돌려주고, 못 찾으면 null 을 돌려준다.
     */
    fun findAndClick(keywords: List<String>): String? {
        val root = rootInActiveWindow ?: return null
        val found = ArrayList<Pair<AccessibilityNodeInfo, String>>()
        collect(root, keywords, found, 0)

        // 짧은 글자(정확히 "출석체크" 같은 것)를 먼저 누르도록 정렬한다.
        found.sortBy { nodeText(it.first).length }

        for ((node, keyword) in found) {
            if (clickNodeOrParent(node)) return keyword
        }
        return null
    }

    /** 화면 전체를 훑으면서 keywords 가 들어간 글자를 모은다. */
    private fun collect(
        node: AccessibilityNodeInfo?,
        keywords: List<String>,
        out: MutableList<Pair<AccessibilityNodeInfo, String>>,
        depth: Int
    ) {
        if (node == null || depth > 40) return
        if (node.isVisibleToUser) {
            val text = nodeText(node)
            if (text.isNotEmpty()) {
                val hit = keywords.firstOrNull { text.contains(it, ignoreCase = true) }
                if (hit != null) out.add(node to hit)
            }
        }
        for (i in 0 until node.childCount) {
            collect(node.getChild(i), keywords, out, depth + 1)
        }
    }

    private fun nodeText(node: AccessibilityNodeInfo): String {
        val t = node.text?.toString().orEmpty()
        val d = node.contentDescription?.toString().orEmpty()
        return (if (t.isNotEmpty()) t else d).trim()
    }

    /** 글자 자체가 못 눌리면 위쪽 부모를 따라 올라가며 누를 수 있는 것을 찾는다. */
    private fun clickNodeOrParent(node: AccessibilityNodeInfo): Boolean {
        var cur: AccessibilityNodeInfo? = node
        var level = 0
        while (cur != null && level < 8) {
            if (cur.isClickable && cur.isEnabled) {
                if (cur.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true
            }
            cur = cur.parent
            level++
        }
        return false
    }
}
