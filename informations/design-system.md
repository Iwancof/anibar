# AGS Design System — "Terminal HUD" v2

作成: 2026-07-02。oracle (gpt-5.5-pro) レビューを反映した改訂版。
全 surface の統一デザイン言語の定義。改修・新規 UI は必ずこれに従う。

## 0. 方針

現状 3 系統のデザイン言語（Tokyo Night カード / ネオン HUD 直書き / Cyberpunk Np）のうち、
**最も作り込まれた NetworkPanel (Np*) の言語を正**とし全 surface を寄せる。
抽象化するのは「cyan のテーマ」ではなく **密度・文言・状態表現・実機語彙・固定スロット感**。
迷ったら NetworkPanel の実物に合わせる。

## 1. カラートークン

`theme.yaml` が単一ソース → `gen-theme.py` が `_theme.scss` と `src/shared/theme-tokens.ts` を生成。
style.scss / Cairo コードへの hex/rgba 直書きは禁止。

**基底色**と**役割トークン**を分離する（α 付きトークンをさらに α 化しない）:

| 基底 | 値 |
|---|---|
| `base-deep` | `#0a0e14` |
| `base-panel` | `#0c1018` |
| `base-card` | `#111826` |
| `border` | `#1a2436` |
| `text` | `#e0e6f0` |
| `text-muted` | `#8a95b3` |
| `text-faint` | `#5a6a7e` |
| `accent` | `#00e5ff` (cyan) — 旧 `#00ffcc`/`#7aa2f7` は全て置換 |
| `accent-alt` | `#ff2d78` (magenta) — TX/RX 等データ視覚化ペアのみ |
| `ok` `#00ff9d` / `warn` `#ffb627` / `crit` `#ff3d3d` / `info` `#00aaff` | 意味色 |

役割トークン例: `surface.panel.bg = rgba(base-panel, .92)`、backdrop = `rgba(base-deep, .5)`。
α は 0.08 / 0.18 / 0.35 / 0.6 / 0.92 の 5 段。

**状態表現**（全インタラクティブ要素で共通）:
- hover: border を `rgba(accent, .35)` に tint（背景は変えない）
- selected/active: accent border + `rgba(accent, .08)` fill
- disabled: `text-faint` + shadow なし
- focus (キーボード): selected と同一
- 禁止: hover での glow・拡大・影追加

## 2. スケール

- **radius**（Np 実測に寄せる。丸い=汎用カード臭）: `xs=2`(チップ) / `sm=4`(タイル・badge) / `md=6`(行・ボタン) / `lg=8`(パネル・カード) / `pill=999`。12px 以上は禁止。
- **font-size** 7 段: `caption=10` / `dense=11`(AP メタ・log 行・bar compact 等の密度優先箇所) / `body=12` / `emph=14` / `title=17` / `display=26` / `hero=46`。
- **font-weight**: 400 / 600 / 800。`bold` キーワード禁止。
- **letter-spacing**（役割別）: eyebrow=`0.10em` / panel-title=`0.12em` / hero-clock=`0.04em`。px 単位禁止。
- **spacing**: 4px グリッド — 4 / 8 / 12 / 16 / 24。
- **shadow**: パネルのみ `0 8px 32px rgba(0,0,0,.6)`。カード・タイルは **border のみ**（影禁止）。
- **禁止**: グラデーション、glow、多重 shadow、虹色ゲージ。
- **font**: 本文 = `$font-family`、アイコン = `HackGen Console NF`（`font-icon` トークン）。

## 3. TSX 側寸法トークン（theme-tokens.ts）

JSX の `widthRequest` 等のマジックナンバーはここから取る:
`panel.width.main=520 / side=380 / narrow=340`、`label.width.sm=80`、
`popup.animCloseMs=200`（controller と SCSS で共有）、`list.slots.ap=50 / notif=20 / flows=15 / log=30`、
色は `[r,g,b]` 0-1 で Cairo 用にも出力。
※ 1 箇所でしか使わない描画都合の数値までトークン化しない。

## 4. アイコン

- Nerd Font グリフのみ。Unicode 記号（⏮▶⏸⏭✕✓●‹›）・絵文字・国旗絵文字は禁止。
- `src/shared/ui/icons.ts` に定数定義し `<Icon>` 経由で使用。
  `ICONS.play=󰐊 pause=󰏤 prev=󰒮 next=󰒭 close=󰅖 check=󰄬 bluetooth=󰂯 btOff=󰂲 btConnected=󰂱 bell=󰂚 wifi=󰤨`
- 国旗は 2 文字国コード badge（`JP` `CH`）。
- `preview:icons` で全グリフを並べて豆腐化・絵文字化を目視検収する。

## 5. 文言規約 + copy dictionary

- パネルタイトル: `● TITLE::SUB` ALL CAPS（`POWER::SYSTEM`, `NET::LINK`, `BT::DEVICES`）+ 右肩メタ。
- セクション見出し (eyebrow): ALL CAPS + caption + 0.10em + rule 線。
- サブラベル: `A::B` 形式（`LID::SWITCH`, `CPU::TURBO`）。`_` 区切り廃止。
- ボタン: ALL CAPS 短語。アイコンは任意、ラベルは必須ではない（icon-only 可）。
- 空値: `—` のみ（`shared/format.ts` の `placeholder()`）。
- **empty/loading/error も HUD 語彙で**: `SCAN::IDLE`, `DBUS::DOWN`, `LINK::DOWN`, `NO HISTORY`, 空スロットは薄 border の空行（大きな blank card 禁止）。
- **実機語彙を積極的に出す**: `wlp194s0`, `hci0`, `RSSI`, `RTT`, `eDP-1` 等。設計説明文・マーケ文言は UI に出さない。

| 旧 | 新 |
|---|---|
| `AC_IN` | `AC::IN` |
| `Clear all` | `CLEAR ALL` |
| `Connect` / `Save` / `Revert` | `CONNECT` / `SAVE` / `REVERT` |
| `Dashboard`(title) | 各 surface の役割名 (`WS::OVERVIEW` 等) |
| `N/A` `--` `---` `?` | `—` |
| `LID_ACTION` | `LID::ACTION` |

## 6. Bar grammar

Bar 右側は `[Icon][compact value]` のモジュール列。グループ間に separator（`rgba(border,1)` 1px）。
- 例: `󰕾 0%`(vol) / `󰤨`(wifi, SSID は出さない→panel で見る) / `󰂱 2`(bt 接続数) / `󰂚 1`(notif) / `あ|A`(IME chip) / `󰁹 94`(bat)
- 生テキストラベル（`VOL0 0%`、SSID 生表示）は禁止。値は最大 4 文字、省略は `…` でなく丸め。
- 左: workspace pills + spectrum + player。中央: clock。

## 7. 共通コンポーネント（src/shared/ui/、CSS prefix `Ui*`）

anatomy を固定する。**ModuleCard は正ではない**（旧世代、廃止方向）。

| コンポーネント | anatomy |
|---|---|
| `Icon` | `<label class="UiIcon" label={ICONS.x}/>` フォント=font-icon |
| `PanelHeader` | 左 status dot ● + title(caps/0.12em) + 右肩 meta |
| `SectionHeader` | eyebrow label + 水平 rule |
| `StatTile` | value(emph/mono) + unit + label(caption) + tone class。border のみ、影なし |
| `InfoRow` | label(width=token) + value。密度 dense |
| `ToggleRow` | label + `A::B` サブラベル + HUD トグル（矩形 track+knob、accent 単色） |
| `CommandButton` | icon? + CAPS label |
| `PlayerControls` | prev/play/next、Icon 使用 |
| `NotificationCard` | app 名 + 時刻(timeAgo) + summary + body、urgency tone |
| `TabBar` | caps タブ + active=accent 下線 or 塗り |
| `PopupShell` | window + backdrop + Esc 閉じ + open/closing クラス。**view のみ**（controller は app 層） |

- 固定スロットリストは `fixedSlots()` 純ヘルパで（汎用 JSX コンポーネント化はしない）。
- ヘルパ統合: `timeAgo`/`placeholder` → `shared/format.ts`、`signalIcon`/`countryBadge` → `modules/wifi/domain.ts`、`isOnAC` → `modules/battery/domain.ts`。

## 8. Motion policy

- open/close: 200ms（トークン `popup.animCloseMs` と SCSS keyframes を同期）。
- infinite アニメ禁止（例外: scan 中の dot pulse のみ）。critical は blink しない。
- hover/press はコスメティック変化のみ（§1 状態表現）。

## 9. Surface role matrix

| surface | 役割 | 主情報 | 禁止 |
|---|---|---|---|
| Bar | 常時 telemetry | ws/clock/vol/net/bt/notif/bat | 生テキスト、SSID |
| NetworkPanel | ネットワーク診断 | identity/dns/bw/quality/latency/flows/AP | — |
| BatteryPopup | 電源制御 | %/draw/health/consumers/power controls | 虹色ゲージ、iOS トグル |
| BluetoothPopup | BT 制御 | adapter power/devices/battery/scan | pairing UI (v1) |
| NotificationCenter | 通知履歴 | 履歴 20 slots + DND | — |
| NotificationPopup | 一時通知 | 最新 3 件 | — |
| DashboardMode | 全画面 glance | 時計/player/net/power の複合 | 独自実装（共通コンポーネント必須） |
| WorkspaceWindow | ws 一覧/display 編集 | ws cards / layout editor | 丸カード |
| Launcher | コマンドパレット | 検索+結果 8 slots | — |
| SwipeDashboard | **廃止候補**。W3 で再定義判断（quick command tray 案） | — | 現状の空カード列 |

## 10. 構造・命名規約

- ネストは「パネル > カード」2 階層まで。
- CSS prefix: 共有 = `Ui*`、surface 固有 = フル名 PascalCase（改修時に移行）。
- window name prefix / controller は `src/app/window-controller.ts` の `makeWindowController(prefix, opts)` に集約。
  controller は monitor-registry の available な connector の window のみ present する。
- SCSS 構成: `style.scss`(エントリ) + `styles/_mixins.scss` `_animations.scss` `_ui.scss` + surface 別 partial。

## 11. Negative examples（見たら差し戻す）

- Title Case の汎用カード見出し（`Dashboard`）
- `✕` `✓` `▶` 等の Unicode アイコン、国旗絵文字、`✕` リテラル
- 虹色 battery gauge、iOS 風緑トグル、glow パルス
- `Overlay first, modules second...` のような設計説明文の UI 露出
- 下半分が空の巨大パネル、radius 12px 超の丸カード
- `N/A` / `--` / `VOL0 0%` のような生テキスト

## 12. 検証

- `npm run check`（typecheck + test 全 green 維持）
- 再汚染ガード: `scripts/check-design.sh`（styles への hex 直書き・src への Unicode アイコン・Gdk.KEY_Escape コピペの新規追加を grep 検出）
- 視覚変更: `bash scripts/ui-test.sh <preview>` + 実機 `grim`。`ags request <scope> open`（引数はクォートしない）
