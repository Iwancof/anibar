変更は割と細かくgit commitしてください。remoteはありませんので、pushは必要ないです。
開発中、重要な情報等があった場合、context compactionの影響を受けないよう、AGENTS.mdへ追記しても構いません。
その他、開発において重要な情報があった際は、./informationsの下にmarkdown形式で情報を追加しても構いません。その際、通し番号は振らないようにしてください。
また、なにか大規模な作業をする際は、現在の作業状態をSTATUS.mdに書き出し、適宜編集するようにしてください。
更に、この開発体制に問題がある場合、既存のAGENTS.mdを編集することも許可します。
このプロジェクトはClaude Codeで開発を行っており、途中で性能が足りずあなたに依頼されたプロジェクトになります。

## AGS デバッグメモ

- `npm run dev | tee /tmp/ags_log` の `/tmp/ags_log` には、現状 `scripts/dev.sh` の wrapper 出力しか残っていない。`ags run --gtk 4 &` の子プロセス側 `console.log` は取れていない前提で調査すること。
- `lid close/open` のクラッシュ調査では、まず `coredumpctl list -r` と `coredumpctl info <pid>` を見る。2026-04-17 時点の最新再現は `20:40:29 JST`, PID `161609`, `gtk_window_destroy` 経由の `SIGSEGV`。
- 2026-04-17 20:52 以降は `scripts/dev.sh` が AGS 本体の stdout/stderr を `/tmp/ags-runtime.log` に出す。wrapper ログ `/tmp/ags_log` と混同しないこと。
