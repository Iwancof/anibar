# AGS Overlay Dashboard

AGS v3 / Astal GTK4 ベースの shell 設定です。  
この構成では、`OverlayDashboard` を UI の中心にしつつ、データソース・ドメインロジック・view-model・widget を分離して、単体テストと GTK preview を両立させています。

## Layout

```text
.
├── app.ts
├── style.scss
├── src/
│   ├── app/                  # bootstrap, request handling, window controllers
│   ├── modules/
│   │   └── <module>/
│   │       ├── domain.ts     # pure domain logic
│   │       ├── ports.ts      # runtime contract
│   │       ├── service.ts    # adapter -> view-model wiring
│   │       ├── view-model.ts # pure display shaping
│   │       ├── Widget.tsx    # GTK widget
│   │       └── mocks.ts      # preview data source
│   ├── preview/              # GTK single-surface previews
│   ├── runtime/              # real adapters for /sys, commands, systemd
│   ├── shared/               # formatters, tone model, shared UI
│   └── surfaces/             # bar / dashboard windows and views
├── tests/                    # Node-based tests for pure layers
```

## Dev commands

```bash
npm run typecheck
npm run test
npm run check
npm run preview:dashboard
npm run preview:battery
npm run preview:network
npm run preview:service-health
```

補足:

- `typecheck` は `pure/domain/view-model` 層を対象にします。
- `test` は Node の `--experimental-strip-types` を使って `.ts` のまま実行します。
- `preview:*` は本物の GTK widget を単体起動して見た目を確認します。

## Runtime policy

- `src/runtime/` は実システムへのアクセスだけを担当します。
- `/sys`, `systemctl`, `nmcli`, `tailscale` のような副作用や I/O はここへ閉じ込めます。
- `src/modules/<module>/domain.ts` と `view-model.ts` は pure に保ちます。
- widget は view-model を受け取るだけの薄い層にします。

## Module contract

新しい module を追加するときは、最低限この単位で揃えます。

1. `domain.ts`
   - 生データ型
   - 正規化
   - 閾値判定
   - pure helper
2. `ports.ts`
   - runtime adapter が満たす interface
3. `service.ts`
   - `source` から `viewModel` を作る wiring
4. `view-model.ts`
   - widget が直接使う表示用 shape
5. `Widget.tsx`
   - JSX 表示
6. `mocks.ts`
   - preview 用の固定データ or mock source

## Recommended workflow for a new module

1. `domain.ts` と `view-model.ts` を pure に書く。
2. `tests/` に pure 層のテストを追加する。
3. `mocks.ts` と `preview:<module>` entry を作る。
4. widget を preview で見ながら調整する。
5. 最後に `src/runtime/` の real adapter を追加する。
6. `src/surfaces/dashboard/` に差し込む。

この順番にすると、外部 API や system command がまだ無くても UI と表示ロジックを先に固められます。

## Current starter modules

- `battery`
- `network`
- `service-health`

これら 3 つで:

- `/sys` 読み取り
- command 実行
- 複数サービス集約
- pure view-model 変換
- preview 差し替え

を一通り試せるようにしてあります。

## Overlay control

- Hyprland からは `SUPER+I` で dashboard を toggle します。
- 内部的には `ags request dashboard toggle` を使っています。
- preview は本番 window とは別 instance で起動します。

## Validation strategy

- `npm run typecheck`
  - pure 層の型崩れを検知
- `npm run test`
  - pure 層の回帰を検知
- `ags bundle ... --gtk 4`
  - preview / app entry のスモーク確認に使える

表示サーバが無い環境では preview を実起動できないため、その場合は `ags bundle` を優先して構文と依存解決を確認します。
