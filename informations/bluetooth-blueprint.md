# AGS modules/runtime アーキテクチャ調査と Bluetooth モジュール設計図

## 1. モジュールの標準形（battery / network を例に）

レイヤは 5 つ。データは「runtime source → module service → surface」の一方向で、すべて gnim の `Accessor` を props として引き回す（グローバル store なし。唯一の例外は display-layout の singleton、後述）。

### domain.ts — 純粋ロジック（GLib/Gio/gnim 非依存）
- 型（Snapshot）とパース・派生計算のみ。`src/modules/battery/domain.ts:5-14` の `BatterySnapshot`、`estimateBatteryMinutes` (`domain.ts:38`)、`batteryTone` (`domain.ts:59`)。network は `NetworkSnapshot` (`src/modules/network/domain.ts:5-13`) と `parseNmcliDeviceStatus` (`domain.ts:41`) のようにコマンド出力のパーサも domain に置く（runtime 側でコマンドを叩き、文字列を domain に渡してパース）。
- tone は共通の `HealthTone`（`src/shared/health.ts`）を返す。
- ここが `tsconfig.pure.json:14-16` の include（`src/modules/**/domain.ts`, `view-model.ts`, `bar-view-model.ts`）対象で、node テスト・tsc 検査可能な純粋領域。**gi:// を import してはいけない**。

### ports.ts — Source インターフェース（依存性逆転の境界）
- `export interface XxxSource { snapshot: Accessor<XxxSnapshot | null> }` のみ。battery: `src/modules/battery/ports.ts:5-7`、network: `src/modules/network/ports.ts:5-7`。nullable かどうかは「取得失敗があり得るか」で決まる（battery/volume は `| null`、network/service-health は EMPTY スナップショットで非 null）。

### view-model.ts / bar-view-model.ts — 純粋な表示変換
- `toXxxViewModel(snapshot)` が ModuleCard 用の `{title, headline, detail, meta, footer, tone}` を返す（`src/modules/battery/view-model.ts:6-13`, `src/modules/network/view-model.ts:6-13`）。
- bar-view-model は共通の `BarIndicatorViewModel {id, icon, label, tone}`（`src/shared/bar-indicator.ts:3-8`）への変換。battery: `src/modules/battery/bar-view-model.ts:15`。network には bar-view-model がない（bar 表示は Bar.tsx 内の専用ボタンで実装）。

### service.ts — Source を受けて Accessor 束を返すファクトリ
- `createBatteryModule(source)` が `createMemo` で viewModel/barIndicator を派生し `{snapshot, viewModel, barIndicator}` を返す（`src/modules/battery/service.ts:17-26`）。network 版は barIndicator なし（`src/modules/network/service.ts:14-21`）。

### 付随ファイル
- `mocks.ts`: プレビュー用の固定 Snapshot 配列 + `createMockXxxSource`（`src/modules/battery/mocks.ts:39-43`）。`src/preview/battery.tsx:15-17` が `createBatteryModule(createMockBatterySource(state))` として利用。
- `Widget.tsx`: `ModuleCard` に viewModel を流すだけの薄い view（`src/modules/battery/Widget.tsx:11-22`）。

### 配線
- `src/modules/index.ts:24-31` の `createRuntimeAppModules()` が本物の runtime source を注入（battery/network/serviceHealth/volume の 4 つが `AppModules`）。`barIndicators()` (`index.ts:33-38`) が bar の indicator strip に流す Accessor 配列を返す（現在 volume のみ。battery は専用ウィジェットのためコメントで除外明記）。
- `src/app/bootstrap.ts:44-65` で全 source を生成し、`createMonitorWindows` (`bootstrap.ts:67-194`) で各モニタのウィンドウ（Bar, NetworkPanel, BatteryPopup, …）へ Accessor と action callback を props 渡し。モニタの増減は `createMonitorRegistry` + items-changed + 5 秒 safety poll で reconcile（`bootstrap.ts:205-257`）。

## 2. runtime source の標準形

`src/runtime/*-source.ts` は `createXxxSource(): XxxSource` ファクトリ。実装パターンは 3 系統:

1. **createPoll 型**（最も宣言的）: `createPoll(initial, POLL_MS, async fetch)` 一発。network (`src/runtime/network-source.ts:44`)、service-health (`service-health-source.ts:20`)、system-stats (`system-stats-source.ts:43`)、ime (`ime-source.ts:25`)、workspace (`workspace-source.ts:18`)、clock (`src/shared/runtime/clock.ts:6,37`)。
2. **createState + GLib.timeout_add ポーリング型**: 初回 fetch → `GLib.timeout_add(GLib.PRIORITY_DEFAULT, POLL_MS, () => { fetch().then(set); return GLib.SOURCE_CONTINUE })`。wifi (`wifi-source.ts:112-121`)、pwsave (`pwsave-source.ts:31-34`)、latency (`latency-source.ts:58-65`)、dns/session/connections/quality/bandwidth も同型。
3. **createState + subprocess イベント駆動型**: `subprocess([cmd], line => ...)` で行ストリームを読み `setState`。volume（`pactl subscribe` → `volume-source.ts:34-41`）、player（`playerctl --follow` → `player-source.ts:32-38`）、spectrum（cava → `spectrum-source.ts:15-26`）、battery（`upower --monitor` をトリガに sysfs を debounce 付き再読込、`battery-source.ts:61-86`。イベント嵐を 1 秒 debounce で間引く `scheduleRefresh` パターンが重要）。

共通要素:
- 外部コマンドは `safeExec`（失敗時に空文字を返す、`src/runtime/command.ts:3-9`）、ファイル読みは `fileExists/readTextFile/readNumberFile`（`src/runtime/fs.ts`）。
- Astal ライブラリ利用は notification-source のみ（`gi://AstalNotifd` → `notification-source.ts:2`）。GObject シグナル (`notifd.connect("notified", ...)`) で push 駆動。
- **cleanup の扱い**: runtime source は `startMainApp()` で 1 回だけ生成されるプロセス寿命の singleton であり、timeout/subprocess の解除は基本的に**していない**（意図的）。例外は 2 つ: (a) display-layout-source は `dispose()` を持ち `GLib.source_remove(pollId)` する（`display-layout-source.ts:125-129`）＋ `getDisplayLayoutSource()` singleton（`:135-141`）、(b) ウィジェット寿命のタイマーは `scopedTimeoutAdd`（gnim の `onCleanup` で source_remove、`src/shared/runtime/scoped-timeout.ts:14-49`）を使う（例: `src/surfaces/bar/BatteryBarWidget.tsx:42-46`）。モニタ抜き差しでウィンドウが destroy される環境なので「ウィンドウ内で作るタイマーは必ず scoped、source 内は不要」が実質の規約。

## 3. 標準形からのばらつき

| モジュール | 構成 | 外れ方 |
|---|---|---|
| battery, volume | domain/ports/service/view-model/bar-view-model/mocks/Widget | 完全な標準形（バーは volume のみ indicator strip、battery は専用 `BatteryBarWidget.tsx`） |
| network, service-health | 同上 - bar-view-model | barIndicator なし。network の bar 表示は `Bar.tsx:110-147` にインライン実装 |
| wifi | domain.ts のみ | ports がなく `WifiSource` interface とアクション（connect/rescan）を runtime 側で定義（`src/runtime/wifi-source.ts:19-23`）。service/view-model なし、surface (`NetworkPanel`, `Bar.tsx`) が snapshot を直接消費 |
| workspace | domain.ts のみ | source は createPoll、アクション `switchToWorkspace` は source ファイルのトップレベル関数（`workspace-source.ts:22-24`）を Bar.tsx が直接 import |
| power-save | domain.ts のみ | source interface + アクション（toggleMeasure/toggleAll）は `runtime/pwsave-source.ts:11-16`。lid-action も power-save/domain の型を借用（`lid-action-source.ts:3`） |
| system-stats | domain.ts + ports.ts | service/view-model なし（BatteryPopup が snapshot を直接描画） |
| launcher, display-layout | domain.ts のみ | display-layout は唯一 dispose() と singleton getter を持つ。launcher の source は `runtime/app-source.ts`（Gio.AppInfo 列挙、Accessor ですらない静的リスト + 検索関数） |
| ime, spectrum, player, notification, netmon 系 | modules/ ディレクトリなし | Snapshot 型ごと runtime ファイル内で定義（`ime-source.ts:5-8`, `player-source.ts:6-10`）。純粋パーサが runtime に同居しテスト不能なのが標準形との最大の乖離 |

要するに「テストしたい純粋ロジックが生まれた時点で modules/<name>/domain.ts に切り出す」が実態の運用で、ports/service/view-model まで揃うのは bar か ModuleCard に乗る 4 モジュールだけ。

## 4. Bluetooth モジュール設計図（Gio.DBus × BlueZ）

前提確認済み: AstalBluetooth typelib は未インストール（`/usr/lib/girepository-1.0/` には Astal-3.0/4.0, AstalIO, AstalNotifd のみ）。system bus に `org.bluez` (bluetoothd) が存在。`Gio` の import 前例は `src/runtime/app-source.ts:1`。

### 作るべきファイル一覧

```
src/modules/bluetooth/domain.ts          … Snapshot 型 + parseManagedObjects + tone/icon 純粋関数
src/modules/bluetooth/ports.ts           … BluetoothSource interface
src/modules/bluetooth/view-model.ts      … toBluetoothViewModel (ModuleCard 用 6 フィールド)
src/modules/bluetooth/bar-view-model.ts  … toBluetoothBarIndicator (BarIndicatorViewModel)
src/modules/bluetooth/service.ts         … createBluetoothModule(source)
src/modules/bluetooth/mocks.ts           … bluetoothPreviewStates + createMockBluetoothSource
src/modules/bluetooth/Widget.tsx         … ModuleCard ラッパ（プレビュー用）
src/runtime/bluetooth-source.ts          … Gio.DBus 実装
src/app/bluetooth-controller.ts          … network-controller.ts の複製（PREFIX "bluetooth-popup:"）
src/surfaces/popups/BluetoothPopup.tsx   … BatteryPopup/NetworkPanel 型のオーバーレイ窓
src/preview/bluetooth.tsx                … 任意（preview:bluetooth スクリプト追加）
tests/modules/bluetooth.domain.test.ts   … node:test + node:assert/strict
tests/modules/bluetooth.view-model.test.ts / bluetooth.bar-view-model.test.ts
```
tsconfig.pure.json は glob (`src/modules/**/domain.ts` 等) 済みのため変更不要。

### 公開 snapshot 型（domain.ts、gi 非依存）

```ts
export interface BluetoothDeviceSnapshot {
  path: string              // D-Bus object path（一意キー）
  address: string           // Device1.Address
  name: string              // Alias ?? Name ?? Address
  icon: string | null       // Device1.Icon ("audio-headset" 等)
  paired: boolean
  trusted: boolean
  connected: boolean
  rssi: number | null       // Device1.RSSI（未接続スキャン時のみ）
  batteryPercent: number | null  // org.bluez.Battery1.Percentage
}

export interface BluetoothSnapshot {
  available: boolean        // Adapter1 が 1 つでも見つかったか
  powered: boolean          // Adapter1.Powered
  discovering: boolean      // Adapter1.Discovering
  devices: BluetoothDeviceSnapshot[]   // paired または既知デバイス（connected 降順→名前順）
}
```

domain.ts にはさらに:
- `parseManagedObjects(objects: Record<string, Record<string, Record<string, unknown>>>): BluetoothSnapshot` — GetManagedObjects の deep_unpack **後**の素 JS オブジェクトを受ける（unpack は runtime 側。これで node テスト可能）。`org.bluez.Adapter1` / `org.bluez.Device1` / `org.bluez.Battery1` インターフェースを走査し、Battery1 は同一 object path の Device1 にマージ。
- `connectedDevices(s)`, `bluetoothTone(s): HealthTone`（!available→muted / !powered→muted / 接続デバイスの battery≤20→warning / それ以外 healthy）— `batteryTone` (`battery/domain.ts:59`) と同じ流儀。

### ports.ts

標準 4 モジュールは snapshot のみだが、Bluetooth はパネル操作が必須なので wifi (`wifi-source.ts:19-23`) / pwsave (`pwsave-source.ts:11-16`) の「アクション同居 Source」前例に従い、ただし置き場所だけは modules 側の ports.ts に置く（mock 実装のため）:

```ts
export interface BluetoothSource {
  snapshot: Accessor<BluetoothSnapshot>
  setPowered: (on: boolean) => Promise<void>
  connectDevice: (path: string) => Promise<boolean>
  disconnectDevice: (path: string) => Promise<boolean>
  startDiscovery: () => Promise<void>
  stopDiscovery: () => Promise<void>
}
```

### runtime/bluetooth-source.ts（Gio.DBus 実装）

battery-source（イベント→debounce→全量再読込、`battery-source.ts:57-86`）と同型にするのが最も安全:

1. `const bus = Gio.DBus.system`
2. `refreshSnapshot()`: `bus.call("org.bluez", "/", "org.freedesktop.DBus.ObjectManager", "GetManagedObjects", null, null, Gio.DBusCallFlags.NONE, -1, null, cb)` → `result.deep_unpack()` を素 JS 化（Variant は `recursiveUnpack()`）→ `parseManagedObjects` → `setSnapshot`。失敗時は `{available:false, powered:false, discovering:false, devices:[]}`（network の OFFLINE_SNAPSHOT 前例 `network-source.ts:10-18`）。
3. push 更新: `bus.signal_subscribe(null=sender, "org.freedesktop.DBus.Properties", "PropertiesChanged", null, null, Gio.DBusSignalFlags.NONE, ...)` を path_namespace `/org/bluez` 相当で 1 本、`org.freedesktop.DBus.ObjectManager` の `InterfacesAdded`/`InterfacesRemoved` を各 1 本。ハンドラは中身を見ずに `scheduleRefresh()`（`battery-source.ts:61-73` の refreshSourceId ガード + `GLib.timeout_add` debounce 300–1000ms をそのまま流用）。ペアリング嵐・RSSI 更新嵐への耐性が battery の upower 対策と同じ理屈で得られる。
4. アクション: `bus.call("org.bluez", path, "org.bluez.Device1", "Connect", ...)` / `Disconnect`、`Adapter1` へは `org.freedesktop.DBus.Properties.Set("org.bluez.Adapter1","Powered", GLib.Variant.new_boolean(on))`、`StartDiscovery`/`StopDiscovery`。各アクション後は wifi の connect 後 refresh（`wifi-source.ts:128-137`）に倣い `refreshSnapshot()`。
5. cleanup: 他 source 同様プロセス寿命 singleton とし dispose なしで可（signal_subscribe の id は保持だけしておく）。ウィジェット側でタイマーを足す場合のみ `scopedTimeoutAdd`。

### bar への表示

`Bar.tsx:110-147` の NetBarBtn と同型の専用ボタンを推奨（クリックで popup を開くには BarIndicatorStrip では不可。`BarIndicatorStrip.tsx` は label 表示のみでクリックハンドラを持たない）:
- BarProps に `bluetoothSnapshot: Accessor<BluetoothSnapshot>` と `onToggleBluetoothPopup: () => void` を追加し、end box（`Bar.tsx:108`）の NetBarBtn の隣に `<button class="BtBarBtn" onClicked={...}>`。アイコンは `createMemo` で `!available||!powered → 󰂲` / `connected → 󰂱 (+接続数 or battery%)` / `powered → 󰂯`。
- 併せて `toBluetoothBarIndicator` も実装しておけば、クリック不要になった場合 `barIndicators()` (`src/modules/index.ts:33`) に足すだけで strip 表示に切替可能（volume 前例）。

### popup / panel の接続方法（既存パターンに厳密準拠）

1. `src/app/bluetooth-controller.ts`: `network-controller.ts:1-49` をそのまま複製し `PREFIX = "bluetooth-popup:"`。`animating` ガード・`closing`/`open` cssClasses・200ms アニメまで同一。
2. `src/surfaces/popups/BluetoothPopup.tsx`: `BatteryPopup.tsx:25-73` の骨格を踏襲 — `name={\`bluetooth-popup:${props.monitor}\`}`、`visible={false}`、`anchor={TOP|LEFT|RIGHT|BOTTOM}`、`layer={Astal.Layer.TOP}`、`keymode={Astal.Keymode.ON_DEMAND}`、onRealize で Escape → `closeBluetoothPopup()`、背面は Backdrop ボタン。パネル内容: 電源スイッチ（`setPowered`）、デバイス一覧（connected/paired/その他、Connect/Disconnect ボタン、battery% 表示）、Scan ボタン（`startDiscovery`）。アクションは NetworkPanel の `onConnect`/`onRescan` (`bootstrap.ts:110-111`) と同様に props 経由で渡す。
3. `src/modules/index.ts`: `AppModules` に `bluetooth: BluetoothModule` を追加、`createRuntimeAppModules()` で `createBluetoothModule(createBluetoothSource())`。ただしアクションを popup に渡すため、bootstrap では wifi 同様に source 自体を別変数で持つか、`BluetoothModule` に source のアクションを再エクスポートする（`{snapshot, viewModel, barIndicator, setPowered, connectDevice, ...}`）。後者が props 配線が素直。
4. `src/app/bootstrap.ts`: `createMonitorWindows` の配列（`bootstrap.ts:72-193`）に `BluetoothPopup({gdkmonitor, monitor, monitorIndex, snapshot, onSetPowered, onConnectDevice, ...})` を追加、Bar props に `bluetoothSnapshot` と `onToggleBluetoothPopup: toggleBluetoothPopup` を追加。
5. `src/app/request-handler.ts`: `battery`/`network` scope（`request-handler.ts:76-92`）と同型の `bluetooth` scope（toggle/open/close）を追加 → `ags request bluetooth toggle` が使える。

### bluetoothctl subprocess 案との比較（一言）

`subprocess(["bluetoothctl"])` で `[CHG] Device ...` 行を追う案は volume/player と同型で書けるが、出力が人間向け（ANSI カラー・書式がバージョンで変わる・Battery1 の % が取れない・初期状態の全量列挙に `devices`+`info` の別ポーリングが要る）ため、パーサが domain に置けても脆い。D-Bus 案は型付きプロパティ + push 通知 + Battery1 が揃い、コード量 +100 行程度で確実に元が取れる。イベントトリガ（変化検知だけ bluetoothctl、読み出しは D-Bus）とする折衷も不要 — ObjectManager シグナルで足りる。

## 5. tests/ の構造と power-save.domain.test.ts の失敗原因

- 構造: `tests/modules/*.test.ts`（domain / view-model / bar-view-model の純粋関数のみ対象）と `tests/shared/*.test.ts`。ランナーは `package.json` の `"test": "node --experimental-strip-types --test tests/shared/*.test.ts tests/modules/*.test.ts"`。gi:// 依存が皆無な純粋層だけを import するのが前提（typecheck も同じ境界: `tsconfig.pure.json:12-17`）。
- 12 ファイル中 11 が `import assert from "node:assert/strict"` + `import test from "node:test"` 形式（例: `tests/modules/battery.view-model.test.ts:1-2`）。
- **失敗原因（実行で確認済み）**: `tests/modules/power-save.domain.test.ts:1` のみ `import { describe, it, expect } from "bun:test"`。node の ESM ローダは `bun:` スキームを解決できず `ERR_UNSUPPORTED_ESM_URL_SCHEME: Received protocol 'bun:'` で即死。`npm test` 実測で 68 件中この 1 ファイルだけ fail（67 pass）。
- **修正案（推奨）**: 他テストと同じ node 形式へ書き換える。
  - `import assert from "node:assert/strict"` / `import { describe, it } from "node:test"`（node:test は describe/it を named export しているので describe 構造は維持できる）
  - `expect(x).toBe(y)` → `assert.equal(x, y)`、`expect(arr).toHaveLength(n)` → `assert.equal(arr.length, n)`、`expect(x).toBeNull()` → `assert.equal(x, null)`、`expect(bool).toBe(true)` → `assert.ok(bool)`。対象は `power-save.domain.test.ts:23-25, 40-42, 57-61, 64-67, 78-80, 85-100`。
  - 代替案（bun をランナーにする）は package.json の test script と他 11 ファイルの前提を壊すため不採用が妥当。