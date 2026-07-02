# AGS モニタライフサイクル再設計（lid close クラッシュ修正）

## Context

laptop + 外部 2 モニタ構成で lid close すると gjs が SEGV する（`journalctl` で Lid closed と同秒に coredump、`libgtk-4.so.1` 内の `g_signal_emit` 配送経路で死ぬ）。

原因は `src/app/bootstrap.ts:232-239` の `syncMonitorWindows` が「`notify::monitors` → 150ms debounce → 全 window 一括破棄・全 window 再生成」を行う設計で、eDP-1 の `Gdk.Monitor` が解放されるタイミングと衝突していること。加えて:

- `disposeWindow` は `try/catch {}` でエラーを握り潰し障害を不可視化
- gnim Accessor subscriber のライフサイクルが widget destroy と結びついていない（`createRoot` スコープを張っていない）
- `hyprctl monitors -j` の 1000ms polling + `notify::monitors` signal の二重駆動

**目標**: lid close / 外部モニタ hotplug で SEGV ゼロ、残存モニタの window を flicker なく保持、エラー可視化、signal-driven lifecycle への一本化。

## 設計方針

1. **Connector-keyed Registry** — `Map<string, MonitorEntry>`。キーは `gdkmonitor.connector`（"eDP-1" 等）。index はシフトするので使わない
2. **Primary signal**: `app.get_monitors()` の `Gio.ListModel::items-changed` を直接購読。diff は registry との突合で求める
3. **Safety net signals**: 各 `Gdk.Monitor::invalidate` と `notify::valid` を per-monitor で connect
4. **非同期 destroy**: `invalidate` は run-first signal で dispatch 中に reentrant するため、ハンドラで **`GLib.idle_add` に defer** してから `removeMonitor` を呼ぶ
5. **gnim `createRoot` スコープ**: 各 monitor の window 群を `createRoot(dispose => ...)` 内で構築。`onCleanup` で Accessor subscribers、signal handler、window destroy を一括 teardown
6. **Idempotency flag** — `entry.disposed` で invalidate と items-changed 二重発火を吸収
7. **Visible errors** — `try/catch {}` を廃止し `console.warn` でログ
8. **hyprctl polling は safety net のみ** — 5000ms に延長、検知時も `reconcile()`（diff のみ）を呼び全破棄はしない

## 実装手順

### Step 1: window name を connector ベースへ統一

8 surface の name を `${prefix}:${monitorIndex}` から `${prefix}:${monitor}`（connector）に変更。controller は `startsWith(prefix)` でフィルタしているので非互換変更なし。

対象:
- `src/surfaces/bar/Bar.tsx:56`
- `src/surfaces/network/NetworkPanel.tsx:50`
- `src/surfaces/popups/BatteryPopup.tsx:29`
- `src/surfaces/notifications/NotificationCenter.tsx:43`
- `src/surfaces/notifications/NotificationPopup.tsx:68`
- `src/surfaces/dashboard/SwipeDashboard.tsx:167`
- `src/surfaces/dashboard-mode/DashboardMode.tsx:69`
- `src/surfaces/workspace/WorkspaceWindow.tsx:21`

`LauncherWindow.tsx` は既に connector 名を使用（変更不要）。各 `*Props` に `monitor: string` を追加する。`monitorIndex` は UI 装飾用途に残してもよい。

### Step 2: `src/app/monitor-registry.ts` を新規作成

主要 API:

```ts
export interface MonitorEntry {
  connector: string
  monitor: Gdk.Monitor
  windows: Gtk.Window[]
  dispose: () => void
  disposed: boolean
}

export function createMonitorRegistry(
  factory: (m: Gdk.Monitor, connector: string, idx: number) => Gtk.Window[]
): {
  addMonitor(m: Gdk.Monitor, idx: number): void
  removeMonitor(connector: string): void
  reconcile(): void
  disposeAll(): void
  registry: Map<string, MonitorEntry>
}
```

`addMonitor` 内で `createRoot((dispose) => {...})` を張り、その中で:
- factory を呼んで windows 作成
- `gdkmonitor.connect("invalidate", () => GLib.idle_add(..., () => { removeMonitor(connector); return false }))`
- `gdkmonitor.connect("notify::valid", () => { if (!valid) GLib.idle_add(...) })`
- `onCleanup(() => { disconnect handlers; safeDisposeWindow 全部 })`
- `registry.set(connector, { ..., disposed: false })`

`removeMonitor(connector)`:
- `entry.disposed` なら return（idempotent）
- `entry.disposed = true` を最初にセット
- `entry.dispose()` → onCleanup 連鎖発火
- `registry.delete(connector)`

`reconcile()`:
- 現在の `app.get_monitors()` の connector 集合を取る
- registry にあって現在にないものを `removeMonitor` （先）
- 現在にあって registry にないものを `addMonitor`（後）

`safeDisposeWindow(w)`:
- `app.remove_window(w)` → `w.visible = false` → `w.destroy()` の順
- 各段階で例外は `console.warn` に出す

純関数 `computeDiff(regKeys: Set<string>, currentKeys: Set<string>)` を export してテスト可能に。

### Step 3: `src/app/bootstrap.ts` の書き換え

旧 `syncMonitorWindows`, `pollHyprMonitorTopology`, `scheduleMonitorSync`, `readHyprMonitorSignature`, `notify::monitors` connect、`disposeWindow` を**全削除**。

`createMonitorWindows` のシグネチャを `(gdkmonitor, connector, idx) => Gtk.Window[]` にし、各 surface へ `monitor: connector` を渡す。

`main()` を以下に置換:

```ts
main() {
  const reg = createMonitorRegistry((m, connector, idx) =>
    createMonitorWindows(m, connector, idx))

  const monitors = app.get_monitors()
  const itemsChangedId = monitors.connect("items-changed", () => reg.reconcile())

  const pollId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
    reg.reconcile()
    return true
  })

  app.connect("shutdown", () => {
    try { monitors.disconnect(itemsChangedId) } catch (e) { console.warn(e) }
    GLib.source_remove(pollId)
    reg.disposeAll()
  })

  reg.reconcile()
}
```

### Step 4: launcher-controller は変更なし

既に `launcher:${monitorName}`。hyprctl で focused monitor を取得して window.name と突き合わせるロジックはそのまま動く。

### Step 5: `tests/app/monitor-registry.test.ts` 新規作成

純関数 `computeDiff` と `MonitorEntry` idempotency のみテスト（GTK 依存部分はモック困難）:

- 空 registry + 1 monitor 追加 → toAdd=[eDP-1], toRemove=[]
- [eDP-1, DP-1] registry + [DP-1] 現在 → toRemove=[eDP-1]
- 同じ connector 重複 addMonitor → 2 回目は no-op
- `removeMonitor` を 2 回呼ぶ → `disposed` flag で 2 回目は no-op

## Edge Cases

- **items-changed 先・invalidate 来ない**: reconcile の diff で removeMonitor 駆動、invalidate handler は onCleanup で既に disconnect 済みなので無害
- **invalidate の reentrancy**: `GLib.idle_add` で defer することで、GDK の signal dispatch が完了してから destroy される
- **add と remove 同時（例: DP 切替）**: reconcile で remove 先、add 後の順序で処理する
- **connector が null/empty**: fallback key を `idx-${idx}` で作る
- **重複 addMonitor**: `registry.has(connector)` ガードで無視

## 変更対象ファイル一覧

| 操作 | ファイル |
|------|----------|
| 新規 | `src/app/monitor-registry.ts` |
| 新規 | `tests/app/monitor-registry.test.ts` |
| 変更 | `src/app/bootstrap.ts`（`main()` 書き換え、旧ロジック削除） |
| 変更 | `src/surfaces/bar/Bar.tsx` |
| 変更 | `src/surfaces/network/NetworkPanel.tsx` |
| 変更 | `src/surfaces/popups/BatteryPopup.tsx` |
| 変更 | `src/surfaces/notifications/NotificationCenter.tsx` |
| 変更 | `src/surfaces/notifications/NotificationPopup.tsx` |
| 変更 | `src/surfaces/dashboard/SwipeDashboard.tsx` |
| 変更 | `src/surfaces/dashboard-mode/DashboardMode.tsx` |
| 変更 | `src/surfaces/workspace/WorkspaceWindow.tsx` |

## 回避しきれないリスク

1. **C 層 dangling ref**: GDK/wayland-client が内部で monitor proxy を leak している場合、gjs 側で救えない。GTK4 / Hyprland のアップグレードを待つ
2. **LayerShell surface destroy**: `valid==false` 遷移後の destroy は compositor プロトコルエラーになり得るが、invalidate → idle_add → destroy の経路でタイミングを最小化している
3. **Safety-net poll の scope**: 5000ms poll の内側でも `createRoot` は正しく張られる（同期呼び出しのため scope 伝播に問題なし）

## 検証方法

1. `ags bundle app.ts /tmp/smoke.js --gtk 4` — bundle 成功
2. `npm run check` — 型チェック + テスト通過
3. 3 モニタ起動 → `app.windows.length === 27`（3×9）、registry.size === 3
4. lid close → registry.size === 2、外部 2 モニタの bar が flicker なく維持、SEGV なし、`coredumpctl list` に新規エントリなし
5. lid open → registry.size === 3、eDP-1 の 9 window 再生成
6. 外部 HDMI 抜差 ×10 連続 → SEGV なし、`ps -o rss` でメモリリークなし
7. `hyprctl dispatch focusmonitor` で launcher が focused monitor に出ることを確認
8. `journalctl --user -f` で `console.warn` 系のエラーが出ていないか監視
