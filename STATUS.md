# Status

## 2026-07-02 全体リファクタ（デザイン統一 + Bluetooth）

Fable 5 主導・Codex 委譲（隔離 worktree 方式）で全面リファクタを実施。

- **設計**: `informations/design-system.md`（Terminal HUD v2、oracle レビュー反映済み）が唯一のデザイン規約。
- **W0**: dead code 削除（NetworkPopup/DashboardWindow ほか -918 行）、power-save テストの node 移行（テスト全 green 化）。
- **W1**: theme.yaml 単一ソース化（`_theme.scss` + `src/shared/theme-tokens.ts` を生成）、SCSS partial 分割（styles/）、パレットの np 基準収束（accent #00e5ff、意味色 ok/warn/crit/info）。
- **W2**: 共通 UI 層 `src/shared/ui/`（Icon/PanelHeader/SectionHeader/StatTile/InfoRow/ToggleRow/PlayerControls/NotificationCard/TabBar/PopupShell）+ `makeWindowController` factory（7 controller → controllers.ts、monitor 可用性フィルタ付き）。
- **W3**: 全 surface を HUD 言語へ統一。Battery（虹色ゲージ・glow・iOS トグル廃止）、DashboardMode、NotificationCenter、Launcher、Workspace/Display 編集、Bar（右側を icon+値のモジュール文法に）、SwipeDashboard → **GLANCE パネル**に再設計。
- **W4**: Bluetooth モジュール新設（BlueZ D-Bus 直、AstalBluetooth 不使用）: `src/modules/bluetooth/`（純粋層+テスト）、`src/runtime/bluetooth-source.ts`（ObjectManager + discovery 所有権 + NameOwnerChanged）、bar モジュール + BluetoothPopup + `ags request bluetooth`。
- **バグ修正**: 通知ポップアップが一度も表示されない既存バグ（onRealize が未表示 window で発火しない）を修正。dev.sh / ui-test.sh の孤児 gjs 対策。
- **検証**: `npm run check`（typecheck + tests + design guard）green 維持。各 Wave で実機スクリーンショット確認済み。

### 運用メモ
- エージェント作業は worktree 必須（AGENTS.md 冒頭参照）。`~/.claude/skills/worktree-delegate` に手順。
- window name prefix は `src/app/window-controller.ts` の WINDOW_PREFIXES が一覧。WorkspaceWindow は `workspace:`（CLI の `ags request dashboard` は互換 alias）。

## 過去の課題（未解決のまま保留）
- lid close/open での SEGV（HANDOFF.md 参照、2026-04 の調査記録）。monitor-registry は mark-unavailable 方式で回避運用中。今回のリファクタでは registry のライフサイクルには手を入れていない。
