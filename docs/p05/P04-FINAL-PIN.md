# P04 code checkpoint refresh — 2026-10-02

P04 PR205 code commit f58f6f0baea9a24987a7b7a7c4099b5a9d205804 is the shared reader/receipt input. The final read contract and handler Git blob IDs/SHA256 are pinned in PORTS-v0.2.md. Native acceptance and full owner build remain OPEN; owner report is not inherited as P05 evidence.

Six fresh mock compatibility checks PASS on the pinned handler, including its added invalid-original-positions400 boundary. The helper verifies imported worktree source equals the commit's LF Git blob after line-ending normalization before using it. No adapter product source changed, so the existing157 local unit/typecheck/light-bundle evidence remains applicable to the same product code0648c9195f7102536d195edb579520d611881902. No heavy build or unrelated suite was rerun.

Original five-check worktree witness remains in p04-read-compatibility-v02-original.json/txt; refreshed six-check result is p04-read-compatibility-v02.json/txt. HANDOFF-v0.2.json is historical; its old worktree source pin is superseded by this checkpoint and the committed P04 blobs. commitBlocked=true, legacy writer unchanged. Accepted receipt never proves original operation kind, source mapping/freeze, account epoch or member confirmation. No native/SQL/network/Telegram/Production/merge operation occurred; blocked built-server was not retried.
