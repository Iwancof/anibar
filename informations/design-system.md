# AGS Design System — "Terminal HUD"

作成: 2026-07-02。全 surface の統一デザイン言語の定義。改修・新規 UI は必ずこれに従う。

## 0. 方針

現状は 3 系統のデザイン言語が並立している（Tokyo Night 系カード / ネオン HUD 直書き系 / Cyberpunk Np 系）。
このうち**最も作り込まれ独自性がある NetworkPanel (Np*) の言語を正**とし、全 surface を寄せる。
Tokyo Night 系（$colors-accent #7aa2f7 等）の汎用カード UI は段階的に廃止する。

判断基準: 迷ったら NetworkPanel の見た目・密度・文言スタイルに合わせる。

## 1. カラートークン（theme.yaml が単一ソース）

`theme.yaml` → `scripts/gen-theme.py` → `_theme.scss` + `src/shared/theme-tokens.ts`（TS 側生成を新設）。
style.scss への hex/rgba 直書きは禁止。Cairo 描画も theme-tokens.ts を参照する。

| トークン | 値 | 用途 |
|---|---|---|
| `bg-deep` | `#0a0e14` | window/backdrop 系 |
| `bg-panel` | `rgba(12, 16, 24, 0.92)` | パネル背景 |
| `bg-card` | `#111826` | カード・行の背景 |
| `border` | `#1a2436` | 全ボーダー・区切り線 |
| `text` | `#e0e6f0` | 主要テキスト |
| `text-muted` | `#8a95b3` | 補助テキスト |
| `text-faint` | `#5a6a7e` | 最弱テキスト（eyebrow 等） |
| `accent` | `#00e5ff` (cyan) | 主アクセント。旧 `#00ffcc`/`#7aa2f7` は全てこれに置換 |
| `accent-alt` | `#ff2d78` (magenta) | 対アクセント（TX/RX ペア等のデータ視覚化のみ） |
| `ok` | `#00ff9d` | 正常 |
| `warn` | `#ffb627` | 警告 |
| `crit` | `#ff3d3d` | 危険 |
| `info` | `#00aaff` | 情報 |

- 透過は `rgba($token, α)` で表現。α は 0.08 / 0.18 / 0.35 / 0.6 / 0.92 の 5 段のみ。
- 虹色ゲージ・グラデーション・glow アニメ・多重 box-shadow は禁止。
- shadow は 2 種のみ: panel `0 8px 32px rgba(0,0,0,0.6)` / card `0 4px 12px rgba(0,0,0,0.4)`。

## 2. スケール

- **radius**: `xs=2px`(バー内チップ) / `sm=4px`(badge) / `md=8px`(ボタン・行・カード) / `lg=12px`(パネル) / `pill=999px`。それ以外の値は禁止（16/24px パネルは 12px に統一）。
- **font-size**: `caption=10px` / `body=12px` / `emph=14px` / `title=17px` / `display=26px` / `hero=46px` の 6 段。9/11/13px は隣接段へ丸める。
- **font-weight**: 400 / 600 / 800 の 3 段（`bold` キーワード禁止）。
- **letter-spacing**: `0.08em`(eyebrow/セクション見出し) / `0.12em`(パネルタイトル) の 2 種のみ。px 単位禁止。
- **spacing**: 4px グリッド — 4 / 8 / 12 / 16 / 24 / 32 のみ。JSX `spacing=` も同様（1,2,3,6,10 禁止）。
- **font**: 本文 = `$font-family`（モノスペース）、アイコン = `HackGen Console NF`（トークン `font-icon` 経由）。

## 3. アイコン

- **Nerd Font グリフのみ**。Unicode 記号（⏮▶⏸⏭✕✓●‹›）・絵文字・国旗絵文字は禁止。
- `src/shared/ui/icons.ts` に全グリフを定数定義し、`<Icon>` コンポーネント経由で使う。
  例: `ICONS.play=󰐊 pause=󰏤 prev=󰒮 next=󰒭 close=󰅖 check=󰄬 bluetooth=󰂯 bluetoothOff=󰂲 bluetoothConnected=󰂱`
- 国旗は 2 文字国コード（`JP` `CH`）のテキスト badge で表現。

## 4. 文言規約

- **パネルタイトル**: `● TITLE::SUB` 形式の ALL CAPS（例 `POWER::SYSTEM`, `NET::LINK`, `BT::DEVICES`）。ステータスドット + 右肩に状態メタ（`AC_IN` → `AC::IN` に統一）。
- **セクション見出し (eyebrow)**: ALL CAPS + caption サイズ + 0.08em + rule 線。例 `IDENTITY`, `TOP CONSUMERS`。
- **サブラベル**: `A::B` 形式に統一（`LID::SWITCH`, `CPU::TURBO`）。`_` 区切りは廃止。
- **ボタン文言**: ALL CAPS 短語（`CONNECT`, `CLEAR ALL`, `CLOSE`）。
- **空値**: `—`（em dash）のみ。`--`, `---`, `N/A`, `?` は `shared/format.ts` の `placeholder()` に置換。
- UI 文言は英語、コード内コメントは日本語。

## 5. 共通コンポーネント（src/shared/ui/）

改修・新規 surface は必ずこれらを使う。CSS クラスは `Ui*` prefix。

| コンポーネント | 役割 | 置換対象 |
|---|---|---|
| `PopupShell` | window + backdrop + Esc 閉じ + open/closing アニメクラス | 8 surface のコピペ雛形 |
| `PanelHeader` | ● TITLE::SUB + 右肩メタ | HudDot/NpHeader/NotifCenterTitle 等 |
| `SectionHeader` | eyebrow + rule | NpSectionHeader ×7 ほか |
| `StatTile` | 値上・ラベル下の縦タイル | QualitySection MiniCard / NpConnCard / HudStat |
| `InfoRow` | ラベル + 値の横行 | IdentitySection InfoRow ほか |
| `ToggleRow` | ラベル + HUD 風トグル（track+knob、accent 単色） | BatteryHudView の iOS 風トグル |
| `Icon` | Nerd Font グリフ表示 | 全 Unicode 記号 |
| `PlayerControls` | prev/play/next 3 ボタン | 3 箇所のコピペ |
| `NotificationCard` | 通知カード | NotifCard / NotifHistoryCard / SwipeDash 簡略版 |
| `TabBar` | タブ切替 | TabArea / WorkspaceView |
| `FixedList` | 固定スロットリストのイディオム | 12 箇所の Array.from 同型 |

ヘルパ統合: `timeAgo`/`placeholder` → `shared/format.ts`、`countryFlag→countryBadge`/`signalIcon` → `modules/wifi/domain.ts`、`isOnAC` → `modules/battery/domain.ts`。

## 6. 構造規約

- ネストは「パネル > カード」の 2 階層まで。3 階層目は border 無しの行（separator or インデント）。
- CSS prefix: 共有 = `Ui*`、surface 固有 = surface のフル名 PascalCase（新規・改修時に順次移行）。
- window name prefix と controller は `src/app/window-controller.ts` の `makeWindowController(prefix, opts)` に集約。
- controller の閉アニメ時間は theme.yaml `popup.anim-close-ms` と同期。

## 7. SCSS 構成

```
style.scss            # @use エントリのみ
styles/_mixins.scss   # %icon-btn-reset, @mixin popup-panel, %eyebrow-label, %dark-card 等
styles/_animations.scss
styles/_ui.scss       # Ui* 共通コンポーネント
styles/_bar.scss  _battery-hud.scss  _network-panel.scss  _notifications.scss
styles/_launcher.scss _workspace.scss _swipe-dash.scss _dashboard-mode.scss _preview.scss
```

## 8. 検証

- 変更のたび: `npm run check`（typecheck + test。テストは全 green を維持）
- 視覚変更: `bash scripts/ui-test.sh <preview>`（headless）+ 実機 `grim` スクリーンショットで確認
- `ags request <scope> open/close` で各 surface を開閉できる（引数はクォートせず分けて渡す）
