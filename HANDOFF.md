# AGS Lid Close/Open Crash — 引き継ぎ資料

**作成日**: 2026-04-17
**状態**: 未解決。lid open / lid close で gjs が SEGV する。

## 1. プロジェクト概要

### 技術スタック
- **AGS** (v4 系 / `ags run --gtk 4`) — GJS 上で動く Astal シェルランタイム
- **gnim** (v1.9.1) — JSX 風 reactive フレームワーク。`createRoot`, `onCleanup`, `createMemo`, `Accessor` を提供
- **GTK 4 + wayland-layer-shell** — Astal.Window は layer-shell surface
- **Wayland compositor**: **Hyprland v0.54.3**
- **GPU**: AMD Krackan (Radeon 840M/860M, gfx11.5.2)
- **OS**: Arch Linux, kernel 6.19.11
- **機体**: ThinkPad P14s Gen 6 AMD (21QLCTO1WW)
- **モニタ構成**: 内蔵 eDP-1 + 外部 HDMI-A-1 + 外部 DP-2 の 3 画面

### ディレクトリ構成（主要）
```
~/.config/ags/
├── app.ts                     — エントリポイント (startMainApp 呼び出しのみ)
├── package.json               — npm run dev, run, check, test
├── tsconfig.pure.json         — 型チェック用（domain/view-model 層限定）
├── src/
│   ├── app/
│   │   ├── bootstrap.ts              — ★ app.start の main() を実装
│   │   ├── monitor-registry.ts       — ★ 新規。モニタ別 lifecycle 管理
│   │   ├── launcher-controller.ts    — launcher:${connector} で focused 監視に present
│   │   ├── notification-controller.ts / popup-controller.ts / network-controller.ts
│   │   │                               — window.name startsWith(prefix) で一括制御
│   │   ├── dashboard-controller.ts   — 同上（prefix="dashboard:"）
│   │   ├── swipe-dashboard-controller.ts / dashboard-mode-controller.ts
│   │   └── request-handler.ts
│   ├── modules/                      — battery, network, wifi, volume, service-health,
│   │                                   workspace, system-stats, power-save, launcher, ime
│   │                                   (domain, ports, service, view-model, bar-view-model)
│   ├── surfaces/
│   │   ├── bar/Bar.tsx                       ★ 各モニタの上部バー
│   │   ├── bar/BatteryBarWidget.tsx          timeout 使用
│   │   ├── bar/PlayerWidget.tsx              timeout 使用
│   │   ├── bar/SpectrumWidget.tsx, PlayerWidget.tsx, BarIndicatorStrip.tsx
│   │   ├── network/NetworkPanel.tsx          ★ ネットワークポップアップ
│   │   ├── network/{Bandwidth,Latency,…}Section.tsx   timeout 使用
│   │   ├── popups/BatteryPopup.tsx           ★ バッテリーポップアップ
│   │   ├── launcher/LauncherWindow.tsx
│   │   ├── notifications/NotificationPopup.tsx       ★ + timeout 使用
│   │   ├── notifications/NotificationCenter.tsx      ★
│   │   ├── dashboard/SwipeDashboard.tsx              ★
│   │   ├── dashboard-mode/DashboardMode.tsx          ★
│   │   ├── dashboard-mode/WideSpectrum.tsx           timeout 使用
│   │   └── workspace/WorkspaceWindow.tsx             ★ (prefix="dashboard:")
│   ├── runtime/                      — GLib.timeout_add ベースの data source 群（常駐）
│   │                                   battery, network, wifi, bandwidth, latency, dns,
│   │                                   session, connections, notification, spectrum,
│   │                                   player, workspace, ime, pwsave, lid-action,
│   │                                   quality, system-stats, netmon, volume
│   ├── shared/
│   │   ├── monitor-diff.ts           ★ 新規。純関数 computeMonitorDiff
│   │   ├── runtime/scoped-timeout.ts ★ 新規。scopedTimeoutAdd helper
│   │   ├── bar-indicator.ts, format.ts, health.ts, ui/
│   └── preview/                      — 単体プレビュー用エントリ
├── tests/shared/monitor-diff.test.ts ★ 新規
├── tests/modules/…                   domain / view-model 層のユニットテスト
└── scripts/
    ├── dev.sh                        — テーマ生成 + ags run + inotifywait
    ├── dev-debug.sh                  ★ 新規だが未検証（後述、ユーザは使わず npm run dev で検証）
    └── gen-theme.py
```

### モニタ別 window 構成
各モニタに対して `bootstrap.ts::createMonitorWindows()` が以下 9 種の window を生成する:

| surface | window.name | prefix | 初期状態 |
|---------|------------|--------|---------|
| Bar | `bar:${connector}` | `bar:` | visible=true, realized=true |
| NetworkPanel | `network-popup:${connector}` | `network-popup:` | visible=false |
| BatteryPopup | `battery-popup:${connector}` | `battery-popup:` | visible=false |
| LauncherWindow | `launcher:${connector}` | `launcher:` | visible=false |
| NotificationPopup | `notifications:${connector}` | `notifications:` | visible=false |
| NotificationCenter | `notif-center:${connector}` | `notif-center:` | visible=false |
| SwipeDashboard | `swipe-dashboard:${connector}` | `swipe-dashboard:` | visible=false |
| DashboardMode | `dashboard-mode:${connector}` | `dashboard-mode:` | visible=false |
| WorkspaceWindow | `dashboard:${connector}` | `dashboard:` | visible=false |

3 モニタなら 27 windows 常駐。

## 2. 困っていること（本題）

`lid close` / `lid open` で gjs が SEGV する。特定の stack trace パターン:

```
(gjs:131067): Gdk-CRITICAL **: gdk_surface_get_display: assertion 'GDK_IS_SURFACE (surface)' failed
error: signal: segmentation fault (core dumped)

Stack trace of thread 131067:
#0  libgtk-4.so.1 + 0x3cab12
#1  libgtk-4.so.1 + 0xadfc4
#2  g_closure_invoke
#6  g_signal_emit
#7  gtk_window_destroy (libgtk-4.so.1 + 0x2f768a)      ← 決定的: destroy 中の signal dispatch
#8  libffi + ffi_call
#10 libgjs.so.0 ...
```

**確定事項**:
- クラッシュは `gtk_window_destroy` 実行中に GDK の signal（おそらく内部的な teardown signal）が dispatch され、そのハンドラが解放済み `GdkSurface` に `gdk_surface_get_display()` する時に起きる
- destroy されている window は **未 realize (realized=false, visible=false) の popup 系**。具体的には `network-popup:*` の destroy 呼び出し中にクラッシュした事例を観測
- `libgtk-4-debuginfo` が入っていないため `+0x3cab12` / `+0xadfc4` の関数名は不明

## 3. アーキテクチャ（自分が書き換えた）

### 旧実装 (git: `3118824 Poll Hyprland topology for monitor resync`)
- `app.connect("notify::monitors", scheduleMonitorSync)` + 150ms debounce
- `hyprctl monitors -j` の 1000ms polling
- `syncMonitorWindows()`: 全 monitor の全 window を `disposeWindow` で破棄 → 全 monitor の全 window を再生成
- `disposeWindow`: `try { close } catch; try { remove_window } catch; try { destroy } catch` — **エラーを全握り潰し**

### 新実装（現状）
設計プランは `~/.claude/plans/serialized-puzzling-feigenbaum.md` にある。

**`src/app/monitor-registry.ts`** (新規 232 行):
- connector 名をキーにした `Map<string, MonitorEntry>`
- `addMonitor(monitor, index)`:
  - `get_connector()` が null / 空なら `watchPendingConnector(monitor)` に回して registry に入れない
  - 確定したら `createRoot((dispose) => { ... })` スコープを張り、以下を登録:
    - `factory(monitor, connector, index)` で 9 windows 生成
    - `monitor.connect("invalidate", ...)` → `GLib.idle_add` 越しに `removeMonitor(connector)`
    - `monitor.connect("notify::valid", ...)` → valid=false で同様
    - `onCleanup`: signal disconnect + `safeDisposeWindow(w)` × 9
- `removeMonitor(connector)`:
  - idempotency flag `entry.disposed` でガード
  - `entry.dispose()` → createRoot の onCleanup 連鎖
- `reconcile()`:
  - `app.get_monitors()` と registry を diff、removed 先・added 後
  - connector 未確定の monitor は `watchPendingConnector` で watch

**`src/app/bootstrap.ts`** の `main()`:
- `createMonitorRegistry` で registry 作成
- `Gdk.Display.get_monitors()` (Gio.ListModel) の `items-changed` に connect
- items-changed で `scheduleReconcile("items-changed")` → `GLib.idle_add` で reconcile を defer（二重実行ガード付き）
- safety-net poll: `GLib.timeout_add` 5000ms で `scheduleReconcile("safety-poll")`
- shutdown で全 disconnect + `disposeAll()`

**`src/shared/runtime/scoped-timeout.ts`** (新規 53 行):
- `scopedTimeoutAdd(priority, ms, callback, label?)` — 内部で `GLib.timeout_add` + `onCleanup(() => GLib.source_remove(id))`
- dispose 後に callback が発火した場合 `GLib.SOURCE_REMOVE` を返して自己削除
- 全 active timeout を追跡するマップ `active: Map<number, string>` あり（デバッグ用）

**6 surface を `scopedTimeoutAdd` に移行**:
- `surfaces/bar/BatteryBarWidget.tsx` (30ms)
- `surfaces/bar/PlayerWidget.tsx` (30ms)
- `surfaces/dashboard-mode/WideSpectrum.tsx` (33ms)
- `surfaces/network/BandwidthSection.tsx` (500ms) — onRealize 内から function body に移動
- `surfaces/network/LatencySection.tsx` (2000ms)
- `surfaces/notifications/NotificationPopup.tsx` (30ms)

**8 surface に `monitor: string` prop 追加**、window name を `${prefix}:${connector}` に（Launcher は既に connector 名）。

## 4. 試したこと（時系列）

### Step 1: 根本原因っぽいもの特定 → monitor-registry を新設
一括破棄・一括再生成が悪いと判断。connector-keyed registry + per-monitor `Gdk.Monitor::invalidate` + `notify::valid` で差分更新に切り替え。
→ **再発**: `gdk_surface_get_display: assertion 'GDK_IS_SURFACE (surface)' failed`

### Step 2: surface の無保護 `GLib.timeout_add` が destroy 済み widget を参照する可能性
6 surface の timeout を `scopedTimeoutAdd` に置換。`onCleanup` で `GLib.source_remove`。items-changed の reconcile を `GLib.idle_add` に defer。
→ **再発**: 同じ assertion（20:15:19, 20:21:32, 20:21:56 など）

### Step 3: 詳細ログを仕込んでユーザに再現してもらう → 新しい根本原因発見
詳細ログから以下の sequence が判明:

```
20:21:54.249  items-changed pos=2 removed=0 added=1
              reconcile: current=[HDMI-A-1,DP-2,idx-2] ← 新 monitor は connector=null
              addMonitor begin: idx-2 (idx=2, valid=true)  ← fallback キーで登録
              … 9 windows 作成 …

20:21:56.370  [safety-poll で reconcile]
              reconcile: current=[HDMI-A-1,DP-2,eDP-1] ← 同じ monitor が今や connector=eDP-1
                         registry=[HDMI-A-1,DP-2,idx-2]
                         toAdd=[eDP-1] toRemove=[idx-2]  ← 誤判定
              removeMonitor(idx-2) → onCleanup → destroy 9 windows
              … bar:idx-2 destroy OK …
              dispose network-popup:idx-2 (realized=false, visible=false) → SEGV
```

**原因**: lid open 直後、新規 Gdk.Monitor は `get_connector()` が初期 null。2 秒後に "eDP-1" がセットされる。registry は最初 `idx-2` キーで登録 → 後で別 monitor と誤認 → 同一 monitor の windows を不要破棄 → 未 realize popup の destroy 中に surface assertion。

### Step 4: connector 確定まで待つ修正
- `addMonitor` で connector が null なら `pending: Map<Gdk.Monitor, handlerId>` に watch 登録（`monitor.connect("notify::connector", ...)`）
- connector 確定時に pending 解除 + reconcile 再実行
- `safeDisposeWindow` を `window.destroy()` 一発に簡略化（旧: remove_window + visible=false + destroy の 3 段、GDK 内部状態を壊していた可能性）

→ **これでも再発**（ユーザ報告「だめだ。動きません」、20:26:33 の coredump 131067 が最新）。stack trace に **`gtk_window_destroy`** が明示的に出現。

### Step 5 （未完）
詳細ログは取得できていない。`dev-debug.sh` を書いたが「動かなかった」とのこと（原因未調査）。Step 4 後の `ags-debug.log` は 20:21:10 の古い実行分しか残っておらず、最新の実行ログは不明。

## 5. 既知の失敗済み仮説

| 仮説 | 結果 |
|------|------|
| 全 window 一括破棄・再生成のタイミング問題 | 差分更新にしても再発 |
| `Gdk.Monitor::invalidate` 中の reentrant destroy | `GLib.idle_add` で defer しても再発 |
| 無保護 `GLib.timeout_add` が destroy 済み widget を参照 | `scopedTimeoutAdd` に移行しても再発 |
| connector null fallback での同一 monitor 誤認 | watch 戦略で防いだが、それでも destroy 自体が SEGV |
| `remove_window` → `visible=false` → `destroy` の 3 段が問題 | `destroy` のみに簡略化しても再発 |

## 6. 未検証の仮説 / 次の一手候補

### A) Astal.Window の layer-shell surface は gdkmonitor disconnect 時に特殊な teardown が要る
- `window.destroy()` で gjs が GTK 内部に入った瞬間、Astal の `unmap` → layer-shell の `destroy` → wl_output detach のどこかで assertion
- **検証**: layer-shell を手動で先に detach してから destroy する、あるいは visible=false に先にして surface を剥がす

### B) gnim Accessor subscriber が createRoot の teardown 前に発火する
- `createRoot` の onCleanup 順序: (a) gnim 内部が JSX 組み立て中に登録した subscriber、(b) 自分で追加した onCleanup
- `createRoot` の実装では `onCleanup` は LIFO で走るはず。自分の cleanup が最初に走り、subscriber teardown はその後。もし途中の g_signal_emit で subscriber が widget を更新しようとすると、widget は destroy 済み → surface assertion
- **検証**: onCleanup 内で何もせず `dispose()` だけ呼ぶ、または逆に cleanup の順序を明示的に制御

### C) 未 realize window の destroy 自体が GTK4 バグ
- `gtk_window_destroy` は `gtk_application_remove_window` を内部で呼ぶ。unrealize → destroy の経路で何らかの signal が発火
- GJS 側の `visible=false` setter は未 realize window に対して副作用を持つ可能性
- **検証**: 未 realize window は destroy せず visible のままでもよい / lazy に作る（visible=true の Bar だけ先に作り、popup は on-demand 生成）

### D) 同 `dashboard:` prefix 衝突
- `WorkspaceWindow` が `dashboard:${connector}` を使い `dashboard-controller` が `startsWith("dashboard:")` で制御。`DashboardMode` は `dashboard-mode:${connector}` なので別 prefix だが、`dashboard-mode:` も `startsWith("dashboard:")` にマッチする
- **検証**: `toggleDashboardVisibility` が両方の window を触るとき、monitor 削除後の残骸 window を掴んで visible 設定 → surface なし → assertion ではないか

### E) 初期ロード時の GDK output 遅延
- 起動直後 (t=0) は 2 モニタ (HDMI-A-1, DP-2)、3 秒後に 3 つ目が来る。この「遅れて来る monitor」は **常に connector=null で登場**。Step 4 fix で defer は効くが、その monitor が後で lid close されて invalidate 発火したときの経路が未検証
- **検証**: dummy テストでこの sequence を単体再現する

### F) `app.remove_window` や window.destroy 中の他の windows への影響
- `GtkApplication` は window list を `GListModel` として管理し、削除時に `items-changed` を emit する。これを誰かが subscribe していて、remove 中に他の window にアクセスしたら…
- **検証**: `app.windows` の subscriber / イテレータが coroutine 的に走ってないか確認

### G) AGS/Astal ライブラリ自体のバグを疑う
- `node_modules/ags/` と `node_modules/gnim/` を reading。Astal.Window が wl_output 変化時の自動 cleanup を提供しない仕様のため、この環境では限界なのかも
- **検証**: upstream issue tracker を当たる（Aylur/astal, Aylur/gnim）

## 7. 再現手順

1. `cd ~/.config/ags && AGS_FATAL_CRITICALS=1 npm run dev`
2. 3 モニタ接続状態で AGS 起動（eDP-1 が lid open で見える状態 or close 状態）
3. lid を close または open
4. 数秒以内に `gdk_surface_get_display` assertion → SEGV で落ちる
5. `coredumpctl info $(coredumpctl list -r --no-legend | head -1 | awk '{print $5}')` で stack trace
6. `journalctl --user -b -f` で並行して観測

### 参考: 取得済みログ例（Step 4 前、20:21:51 〜 20:21:56）
```
20:21:51.368 [bootstrap] main() start
              reconcile: current=[HDMI-A-1,DP-2] → addMonitor HDMI-A-1, DP-2
20:21:54.249 items-changed pos=2 removed=0 added=1
              reconcile: current=[HDMI-A-1,DP-2,idx-2] → addMonitor idx-2  ← 問題の核心
20:21:56.370 safety-poll reconcile:
              current=[HDMI-A-1,DP-2,eDP-1] registry=[HDMI-A-1,DP-2,idx-2]
              toAdd=[eDP-1] toRemove=[idx-2]
              removeMonitor(idx-2) → destroy 9 windows
              dispose bar:idx-2 → OK
              dispose network-popup:idx-2 → Gdk-CRITICAL ⇒ SEGV
```

## 8. 変更済みファイル一覧 (git diff base = e1315e6)

### 新規
- `src/app/monitor-registry.ts` — monitor lifecycle 中核
- `src/shared/monitor-diff.ts` — pure `computeMonitorDiff`
- `src/shared/runtime/scoped-timeout.ts` — lifecycle 付き timeout helper
- `tests/shared/monitor-diff.test.ts` — 6 件のテスト（全通過）
- `scripts/dev-debug.sh` — debug 用 dev runner（ユーザ報告では未動作、未調査）
- `src/app/notification-controller.ts` — （Untracked、前からあった？要確認）
- `HANDOFF.md` — この文書

### 変更
- `src/app/bootstrap.ts` — `main()` 全面書き換え。`syncMonitorWindows`, `pollHyprMonitorTopology`, `scheduleMonitorSync`, `readHyprMonitorSignature`, `disposeWindow` 削除。詳細ログ仕込み
- `src/surfaces/bar/Bar.tsx` — `monitor: string` prop 追加、`name={bar:${monitor}}`
- `src/surfaces/bar/BatteryBarWidget.tsx` — `scopedTimeoutAdd` 利用
- `src/surfaces/bar/PlayerWidget.tsx` — 同上
- `src/surfaces/dashboard-mode/DashboardMode.tsx` — monitor prop
- `src/surfaces/dashboard-mode/WideSpectrum.tsx` — `scopedTimeoutAdd`
- `src/surfaces/dashboard/SwipeDashboard.tsx` — monitor prop
- `src/surfaces/network/BandwidthSection.tsx` — `scopedTimeoutAdd`（onRealize 内から function body に移動）
- `src/surfaces/network/LatencySection.tsx` — `scopedTimeoutAdd`
- `src/surfaces/network/NetworkPanel.tsx` — monitor prop
- `src/surfaces/notifications/NotificationCenter.tsx` — monitor prop
- `src/surfaces/notifications/NotificationPopup.tsx` — monitor prop + `scopedTimeoutAdd`
- `src/surfaces/popups/BatteryPopup.tsx` — monitor prop
- `src/surfaces/workspace/WorkspaceWindow.tsx` — monitor prop (name は `dashboard:${monitor}` のまま、controller と互換)
- `tsconfig.pure.json` — `monitor-diff.ts` を include

## 9. 検証コマンド

- `npm run typecheck` — 型チェック (pass)
- `npm run test` — 単体テスト (`power-save.domain.test.ts` は pre-existing failure、無関係)
- `ags bundle app.ts /tmp/smoke.js --gtk 4` — バンドル成功確認
- `AGS_FATAL_CRITICALS=1 npm run dev` — 詳細ログ付き起動
- `coredumpctl list --since "10 min ago"` → `coredumpctl info <pid>`

## 10. 環境情報

```
OS: Arch Linux
Kernel: 6.19.11-arch1-1
Hyprland: v0.54.3 (tag)
GPU: AMD Krackan [1002:1114]
  linux-firmware-amdgpu: 20260309-1
BIOS: R2XET37W 1.17 (2025-11-07)
EC firmware: 1.9
gjs: 1.x (Arch packaged)
GTK: 4.x (Arch packaged, debuginfo なし)

ags package version: * (npm link or file), node_modules/ags/lib/gtk4/app.ts を直接参照
gnim: v1.9.1 (~/.config/ags/node_modules/gnim)
```

## 11. 関連する別系統の問題（参考）

lid close クラッシュには **2 系統** ある可能性:

1. **本件（本 md のメイン）**: AGS 内部のクラッシュ。`gdk_surface_get_display` assertion → SEGV
2. **Hyprland 本体のクラッシュ（別件、既知 issue）**: lid close → amdgpu gfx_v11_0 resume の page fault → MES timeout → Hyprland が `eglDupNativeFenceFDANDROID` で死亡。
   - 対症療法: S3 sleep に切り替え（`systemctl suspend`）で S4 hibernate 経路を回避
   - `/etc/systemd/logind.conf` の `HandleLidSwitch=suspend` 推奨

AGS 側の本件は Hyprland 側が落ちなくても独立に発生する。S3 sleep に切り替えれば amdgpu 側の事故は回避できるが、AGS のモニタ切断/復帰パスは lid close だろうが外部 HDMI 抜差だろうが走るので、本件が独立の課題として残る。

## 12. 直接の次アクション推奨

優先度順:

1. **最新コード（Step 4 後）で再現し、詳細ログを取る**
   ```
   rm -f ~/.local/state/ags/ags-debug.log
   AGS_FATAL_CRITICALS=1 G_MESSAGES_DEBUG=all GDK_DEBUG=misc,events npm run dev 2>&1 | tee /tmp/ags-run.log
   ```
   その後 lid close / open を 1 回だけ行い、`/tmp/ags-run.log` を最初から貼る。私が Step 4 後の実ログをまだ見ていないため、どこまで進んだかが不明。

2. **仮説 B (gnim Accessor subscriber 問題) を検証**
   - createRoot スコープ内で JSX 評価時に登録される subscriber が onCleanup より後に発火していないか
   - minimal reproducer: 1 バーのみのプロジェクトを作って lid close で SEGV するか確認

3. **仮説 A (layer-shell 手動 teardown)**
   - `safeDisposeWindow` で以下を試す:
     ```ts
     window.hide()                         // unmap surface
     await microtask()                     // let mainloop flush
     window.set_application(null as any)   // detach from app
     window.destroy()
     ```
   - または `Astal.Window.present_monitor(null)` 的な API が Astal 側にあるか確認

4. **仮説 C (未 realize は destroy しない)**
   ```ts
   function safeDisposeWindow(w: Gtk.Window) {
     if (!w.get_realized()) {
       // 未 realize は application から外すだけで GC に任せる
       try { app.remove_window(w) } catch (e) { warn(e) }
       return
     }
     try { w.destroy() } catch (e) { warn(e) }
   }
   ```

5. **Upstream 相談**
   - https://github.com/Aylur/astal/issues で layer-shell + multi-monitor + lid close 系の issue を検索
   - https://github.com/Aylur/gnim/issues で scope teardown の順序について確認

## 13. 連絡先・ポインタ

- プラン文書: `~/.claude/plans/serialized-puzzling-feigenbaum.md`
- coredump: `/var/lib/systemd/coredump/core.gjs.*.zst`（`coredumpctl dump <pid>` で展開可能）
- gjs 実行中バンドル: `${XDG_RUNTIME_DIR:-/tmp}/ags.js`（`ags run` が base64 decode して配置）
- AGS/Astal upstream: https://github.com/Aylur/astal, https://github.com/Aylur/gnim
- AGS docs: `node_modules/ags/README.md`（lib/gtk4/app.ts で App 実装確認可）
