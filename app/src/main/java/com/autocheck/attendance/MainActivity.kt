package com.autocheck.attendance

import android.Manifest
import android.app.TimePickerDialog
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 알림 권한 (안드로이드 13 이상)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            registerForActivityResult(ActivityResultContracts.RequestPermission()) {}
                .launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        setContent {
            MaterialTheme(colorScheme = lightColorScheme()) {
                HomeScreen()
            }
        }
    }
}

// ----------------------------------------------------------------------

private data class InstalledApp(val packageName: String, val label: String)

private suspend fun loadInstalledApps(context: Context): List<InstalledApp> =
    withContext(Dispatchers.IO) {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        pm.queryIntentActivities(intent, 0)
            .mapNotNull {
                val pkg = it.activityInfo?.packageName ?: return@mapNotNull null
                InstalledApp(pkg, it.loadLabel(pm).toString())
            }
            .distinctBy { it.packageName }
            .sortedBy { it.label }
    }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HomeScreen() {
    val context = LocalContext.current

    var targets by remember { mutableStateOf(Store.targets(context)) }
    var logs by remember { mutableStateOf(Store.logs(context)) }
    var autoEnabled by remember { mutableStateOf(Store.autoEnabled(context)) }
    var hour by remember { mutableIntStateOf(Store.hour(context)) }
    var minute by remember { mutableIntStateOf(Store.minute(context)) }
    var accessibilityOn by remember { mutableStateOf(AttendanceAccessibilityService.isEnabled(context)) }
    var showAddDialog by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf<TargetApp?>(null) }

    // 화면으로 돌아올 때마다 상태를 새로 읽는다.
    LaunchedEffect(showAddDialog, editing) {
        accessibilityOn = AttendanceAccessibilityService.isEnabled(context)
        targets = Store.targets(context)
        logs = Store.logs(context)
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("자동 출석체크") }) },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddDialog = true },
                text = { Text("앱 추가") },
                icon = { Text("+", fontSize = 20.sp) }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            item { Spacer(Modifier.height(4.dp)) }

            // 1단계: 접근성 권한
            item {
                StepCard(
                    number = "1",
                    title = "접근성 권한 켜기",
                    done = accessibilityOn,
                    description = if (accessibilityOn) "켜져 있어요. 그대로 두세요."
                    else "이 권한이 있어야 앱이 대신 버튼을 눌러 줄 수 있어요."
                ) {
                    Button(onClick = {
                        context.startActivity(
                            Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        )
                    }) { Text(if (accessibilityOn) "설정 다시 열기" else "설정 열기") }
                }
            }

            // 2단계: 앱 목록
            item {
                Text("2. 출석체크 할 앱", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }

            if (targets.isEmpty()) {
                item {
                    Card {
                        Text(
                            "아직 등록된 앱이 없어요.\n오른쪽 아래 '앱 추가' 를 눌러 주세요.",
                            modifier = Modifier.padding(16.dp)
                        )
                    }
                }
            }

            items(targets, key = { it.packageName }) { target ->
                TargetRow(
                    target = target,
                    onToggle = { on ->
                        Store.saveTargets(context, targets.map {
                            if (it.packageName == target.packageName) it.copy(enabled = on) else it
                        })
                        targets = Store.targets(context)
                    },
                    onEdit = { editing = target },
                    onDelete = {
                        Store.removeTarget(context, target.packageName)
                        targets = Store.targets(context)
                    }
                )
            }

            // 3단계: 시간과 자동 실행
            item {
                Card {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("3. 매일 자동으로 실행", fontWeight = FontWeight.Bold, fontSize = 18.sp)

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                String.format("%02d : %02d", hour, minute),
                                fontSize = 30.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(Modifier.width(16.dp))
                            OutlinedButton(onClick = {
                                TimePickerDialog(context, { _, h, m ->
                                    Store.setTime(context, h, m)
                                    hour = h; minute = m
                                    AlarmScheduler.refresh(context)
                                }, hour, minute, true).show()
                            }) { Text("시간 바꾸기") }
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Switch(checked = autoEnabled, onCheckedChange = { on ->
                                autoEnabled = on
                                Store.setAutoEnabled(context, on)
                                AlarmScheduler.refresh(context)
                            })
                            Spacer(Modifier.width(12.dp))
                            Text(if (autoEnabled) "자동 실행 켜짐" else "자동 실행 꺼짐")
                        }

                        Button(
                            onClick = {
                                Store.clearDoneToday(context)
                                AutoCheckService.start(context)
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("지금 바로 한 번 실행해 보기") }

                        Text(
                            "실행하면 화면이 저절로 움직여요. 끝날 때까지 폰을 만지지 마세요.",
                            fontSize = 12.sp
                        )
                    }
                }
            }

            // 배터리 최적화 안내
            item {
                Card {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("4. 배터리 절약 제외 (중요)", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text(
                            "이걸 안 하면 휴대폰이 절전 중일 때 자동 실행이 안 될 수 있어요.",
                            fontSize = 13.sp
                        )
                        OutlinedButton(onClick = {
                            runCatching {
                                context.startActivity(
                                    Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                                        .setData(Uri.parse("package:" + context.packageName))
                                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                )
                            }.onFailure {
                                context.startActivity(
                                    Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                )
                            }
                        }) { Text("배터리 설정 열기") }
                    }
                }
            }

            // 앱 업데이트
            item { UpdateCard() }

            // 기록
            item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("실행 기록", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Row {
                        TextButton(onClick = { logs = Store.logs(context) }) { Text("새로고침") }
                        TextButton(onClick = {
                            Store.clearLogs(context); logs = emptyList()
                        }) { Text("지우기") }
                    }
                }
            }

            if (logs.isEmpty()) {
                item { Text("아직 기록이 없어요.", fontSize = 13.sp) }
            }

            items(logs) { log ->
                Row(Modifier.fillMaxWidth()) {
                    Text(if (log.success) "✅" else "❌")
                    Spacer(Modifier.width(8.dp))
                    Column {
                        Text("${log.timeText()}  ${log.label}", fontSize = 13.sp)
                        Text(log.message, fontSize = 12.sp)
                    }
                }
            }

            item { Spacer(Modifier.height(80.dp)) }
        }
    }

    if (showAddDialog) {
        AddTargetDialog(
            onDismiss = { showAddDialog = false },
            onSave = { t ->
                Store.addTarget(context, t)
                targets = Store.targets(context)
                showAddDialog = false
            }
        )
    }

    editing?.let { t ->
        EditKeywordDialog(
            target = t,
            onDismiss = { editing = null },
            onSave = { updated ->
                Store.addTarget(context, updated)
                targets = Store.targets(context)
                editing = null
            }
        )
    }
}

@Composable
private fun StepCard(
    number: String,
    title: String,
    done: Boolean,
    description: String,
    action: @Composable () -> Unit
) {
    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "$number. $title  ${if (done) "✅" else ""}",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
            Text(description, fontSize = 13.sp)
            action()
        }
    }
}

@Composable
private fun TargetRow(
    target: TargetApp,
    onToggle: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(target.label, fontWeight = FontWeight.Bold)
                Text(
                    if (target.stepMode)
                        "순서대로 누르기: ${target.keywords.joinToString(" > ")}"
                    else
                        "누를 글자: ${target.keywords.joinToString(", ")}",
                    fontSize = 12.sp
                )
            }
            Switch(checked = target.enabled, onCheckedChange = onToggle)
            TextButton(onClick = onEdit) { Text("수정") }
            TextButton(onClick = onDelete) { Text("삭제") }
        }
    }
}

@Composable
private fun AddTargetDialog(onDismiss: () -> Unit, onSave: (TargetApp) -> Unit) {
    val context = LocalContext.current
    var apps by remember { mutableStateOf<List<InstalledApp>>(emptyList()) }
    var query by remember { mutableStateOf("") }
    var picked by remember { mutableStateOf<InstalledApp?>(null) }
    var keywords by remember { mutableStateOf("출석체크") }
    var stepMode by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { apps = loadInstalledApps(context) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (picked == null) "앱 고르기" else "누를 글자 입력") },
        text = {
            if (picked == null) {
                Column {
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it },
                        label = { Text("앱 이름 검색") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(8.dp))
                    val filtered = apps.filter { it.label.contains(query, ignoreCase = true) }
                    LazyColumn(Modifier.height(320.dp)) {
                        items(filtered, key = { it.packageName }) { app ->
                            TextButton(
                                onClick = { picked = app },
                                modifier = Modifier.fillMaxWidth()
                            ) { Text(app.label, modifier = Modifier.fillMaxWidth()) }
                        }
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(picked!!.label, fontWeight = FontWeight.Bold)
                    Text(
                        "그 앱 화면에 실제로 보이는 버튼 글자를 적어 주세요.\n여러 개면 쉼표(,)로 나눠 적으면 돼요.",
                        fontSize = 13.sp
                    )
                    OutlinedTextField(
                        value = keywords,
                        onValueChange = { keywords = it },
                        label = { Text("예: 출석체크, 출석") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    StepModeRow(stepMode) { stepMode = it }
                }
            }
        },
        confirmButton = {
            if (picked != null) {
                TextButton(onClick = {
                    val list = keywords.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                    if (list.isNotEmpty()) {
                        onSave(
                            TargetApp(
                                packageName = picked!!.packageName,
                                label = picked!!.label,
                                keywords = list,
                                stepMode = stepMode
                            )
                        )
                    }
                }) { Text("저장") }
            }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } }
    )
}

@Composable
private fun EditKeywordDialog(
    target: TargetApp,
    onDismiss: () -> Unit,
    onSave: (TargetApp) -> Unit
) {
    var keywords by remember { mutableStateOf(target.keywords.joinToString(", ")) }
    var wait by remember { mutableStateOf(target.waitSeconds.toString()) }
    var stepMode by remember { mutableStateOf(target.stepMode) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(target.label) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = keywords,
                    onValueChange = { keywords = it },
                    label = { Text("누를 글자 (쉼표로 구분)") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = wait,
                    onValueChange = { wait = it.filter { c -> c.isDigit() } },
                    label = { Text("버튼 찾는 시간 (초)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                StepModeRow(stepMode) { stepMode = it }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val list = keywords.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                if (list.isNotEmpty()) {
                    onSave(
                        target.copy(
                            keywords = list,
                            waitSeconds = wait.toIntOrNull()?.coerceIn(5, 120) ?: 20,
                            stepMode = stepMode
                        )
                    )
                }
            }) { Text("저장") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("취소") } }
    )
}

/** "순서대로 누르기" 선택 줄 */
@Composable
private fun StepModeRow(checked: Boolean, onChange: (Boolean) -> Unit) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = checked, onCheckedChange = onChange)
            Spacer(Modifier.width(4.dp))
            Text("적은 순서대로 하나씩 누르기", fontSize = 14.sp)
        }
        Text(
            if (checked)
                "예) 출석체크, 확인, 닫기 -> 출석체크 누르고 -> 확인 누르고 -> 닫기 누름"
            else
                "예) 출석체크, 출석 -> 둘 중 화면에 보이는 것 하나만 누름",
            fontSize = 12.sp
        )
    }
}

/** 5. 앱 업데이트 — 브라우저를 거치지 않고 앱 안에서 새 버전으로 바꾼다. */
@Composable
private fun UpdateCard() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var status by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    Card {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("5. 앱 업데이트", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text(
                "지금 버전: ${Updater.currentVersionName(context)}",
                fontSize = 13.sp
            )

            Button(
                enabled = !busy,
                onClick = {
                    busy = true
                    status = "새 버전이 있는지 확인 중..."
                    scope.launch {
                        val result = runCatching {
                            withContext(Dispatchers.IO) { Updater.fetchLatest() }
                        }
                        val info = result.getOrNull()
                        if (info == null) {
                            status = "확인 실패: ${result.exceptionOrNull()?.message ?: "인터넷을 확인해 주세요"}"
                            busy = false
                            return@launch
                        }

                        if (info.versionCode <= Updater.currentVersionCode(context)) {
                            status = "이미 최신 버전이에요 ✅"
                            busy = false
                            return@launch
                        }

                        if (!Updater.canInstall(context)) {
                            status = "설치 허용을 켜 주세요. 설정 화면을 엽니다."
                            Updater.openInstallPermission(context)
                            busy = false
                            return@launch
                        }

                        status = "새 버전 ${info.versionName} 내려받는 중..."
                        val file = runCatching {
                            withContext(Dispatchers.IO) { Updater.download(context, info.url) }
                        }
                        if (file.isSuccess) {
                            status = "설치 화면을 엽니다. '설치'를 눌러 주세요."
                            Updater.install(context, file.getOrThrow())
                        } else {
                            status = "다운로드 실패: ${file.exceptionOrNull()?.message}"
                        }
                        busy = false
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) { Text(if (busy) "잠시만요..." else "업데이트 확인") }

            if (status.isNotEmpty()) Text(status, fontSize = 13.sp)

            Text(
                "인터넷은 새 버전을 받을 때만 씁니다. 출석체크 내용은 밖으로 나가지 않아요.",
                fontSize = 12.sp
            )
        }
    }
}
