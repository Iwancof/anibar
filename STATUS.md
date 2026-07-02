# Status

## 2026-04-17 20:40 JST

- 再現確認済み。`lid` 開閉直後の最新 coredump は `20:40:29 JST`, PID `161609`, `gtk_window_destroy` 経由の `SIGSEGV`。
- 現状の `src/app/monitor-registry.ts` では monitor cleanup 中に `window.destroy()` を呼んでいたが、これが crash point と一致している。
- `npm run dev | tee /tmp/ags_log` の `/tmp/ags_log` には wrapper (`scripts/dev.sh`) の出力しか残っておらず、AGS 本体の `console.log` は取得できていない。デバッグの一次情報としては `coredumpctl` / `journalctl` を優先する。

## いま進めている修正

- monitor detach / shutdown cleanup で `destroy()` をやめ、`visible = false` + `app.remove_window()` でアプリ管理外へ退避する方針に切り替えた。
- retired window は強参照で保持し、GJS/GTK finalization があとで `gtk_window_destroy` に再突入しないようにしている。

## 次の確認

- `npm run check`
- AGS 再起動後に `lid close/open` を再試験
- crash が止まったら、退避方式の副作用（window leak, controller からの誤参照, app shutdown 挙動）を確認

## 2026-04-17 20:51 JST

- `lid open` 単独では bar 消失なし、`lid close` で再度 SEGV。
- 最新 coredump は `20:51:05 JST`, PID `176284`。
- stack から `gtk_window_destroy` は消えた。つまり `destroy()` 経路は外れたが、monitor detach cleanup 中の別の GTK 操作でまだ落ちている。
- 次の修正は `remove_window` / `visible=false` をやめ、monitor disappearance 時は window を触らず stale entry として保持し、connector 再登場時に `gdkmonitor` を差し替える方針。

## 2026-04-18 13:35 JST

- 画面配置エディタの実装に着手。`Dashboard` 内に `Displays` タブを追加し、`hyprctl monitors all -j` を current state の source に使う方針。
- pure module `src/modules/display-layout/domain.ts` を新設し、JSON parse / preset / snap / `hyprctl keyword monitor ...` コマンド生成 / profile 保存形式を共通化。
- `scripts/layoutctl.ts` を追加し、UI とは別に `current`, `list`, `save`, `apply` の最小 CLI を用意する。
- 現在の既知事項: `npm test` 全体は既存の `tests/modules/power-save.domain.test.ts` が `bun:` import 依存で Node 実行に失敗するため赤い。今回追加の display-layout テスト単体は通過。
