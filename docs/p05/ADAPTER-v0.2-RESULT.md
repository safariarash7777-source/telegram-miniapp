# P05 adapter v0.2 — 2026-10-02 Tehran

Continuation of miniapp Draft PR6, isolated checkout/branch and same file ownership. Source base mini5@26c885c; previous P05 checkpoint a8ced161. Site193@712ff1c and existing Telegram bridge/proof/notification code remain unchanged. P00 owns composition/schema manifest; this continuation never substitutes an independently accepted release baseline.

P00-BASELINE and P00-RELEASE-MANIFEST were read fresh: canonical development baseline195@31c44ab,18 migrations reported installed in native sandbox ONLY,189/193 explicitly excluded. Mini6 is not combined with195. Those environment/CI/UI observations are P00's evidence and are not inherited as P05 acceptance. Existing mini source branch is preserved, and P04 consumes195; no extra checkout or shared file changes are required for this cross-repository read connector.

## What is executable

`server/p05/canonical-adapter.ts` orchestrates injected current identity binding, owner-only canonical read, immutable source snapshot and receipt lookup. It binds review to full source/canonical version UUID+number+payload/debts/catalog and link/account context. It rereads binding after asynchronous reads and fails closed on owner/epoch/account changes, catalog/contract errors or changed approved context. Canonical-only positions remain counted, unpriced candidates use the original P04 DTO, and no value/performance/cost is guessed.

`canonical-read-transport.ts` is a connectable P04 read connector: exact owner-selected GET `/api/portfolio/holdings` and **read-only** POST `/api/portfolio/holdings/receipt`. It requires an injected owner-native transport and an approved server-configured HTTPS origin; it reads no cookie/key itself, has no default live fetch, follows no redirects, requires no-store responses and validates server-derived owner/contract metadata. Only `{client_token,expectedCanonicalContentHash}` is sent to receipt lookup. No holdings/debt/source writes, send, migration, stop-legacy method or route mount exists.

P04 acknowledged the shared field contract and added independent root receipt ownerId/contractVersion; see [PORTS-v0.2](PORTS-v0.2.md). SQL MD5 canonicalContentHash is separate from SHA256 contextDigest/previewDigest. Missing receipt is unknown, never none or proof of absent commit. Accepted token/hash/created version observation is not source mapping, latest amount equality, migration completion or permission to write. Current service has migrationMappings=null and migrationComplete=false; baseVersion is not fabricated into its existing receipt. CAS remains original holdings POST base_version/client_token.

Existing native binding resolver/source export, canonical account/memberConfirmedAt, accepted migration provenance and source write fence are OPEN. The code is ready for approved service injection, not activated for members. `commitBlocked=true` is unconditional and **legacy writer remains unchanged**. No shadow financial/identity/notification/consent/receipt database is created.

## Fresh evidence (separate from native/runtime acceptance)

- 157 targeted tests PASS: 100 previous preview regressions affected by orchestration +40 adapter cases +17 HTTP connector cases. Source/owner errors expose no private preview; ready-empty vs no-version-empty differs; full canonical/debt/UUID drift invalidates review; receipt conflicts/unknown/missing metadata hold. There is no blind write retry.
- Full miniapp typecheck PASS. Only the two new adapter modules were bundled by esbuild (13.3KB +3.1KB,20ms); no heavy Vite build, server or Docker process started. Prior full UI build evidence is historical, not rerun. P00 was notified of serial lightweight verification due laptop memory constraints.
- Actual current P04 `getFinancialSnapshot/lookupFinancialReceipt` consumed through P05 connector: 5 checks PASS with **mock DB/auth/HTTP only**. Owner source SHA256 recorded in p04-read-compatibility-v02.json; no native GoTrue session or SQL query executed. Handler file was read from the owner's in-progress checkout, so that hash is the acceptance checkpoint until P04 commits/releases it; no final owner SHA is invented.
- Six fresh mock checks against actual unchanged site193 and mini5: signature/body binding; exact cohort+version next; separate notification categories/unlink command mapping and forged owner refusal; Auth401/503 private no-store; revoked/unlinked pre-send cancellation; generic fake-delivery scoped link and API-accepted≠read/transaction. SQL confirm/unlink mute reset inspected statically only. Zero real Telegram/HTTP calls. No new defect in these preserved contracts was found; no redundant product patch was made.
- Initial TypeScript union-narrowing failure retained in adapter-typecheck-first-failure-v02.txt, corrected and final typecheck log separate. This was a compile finding, not native product acceptance. Old unrelated suites were not rerun for activity.

## Gates and owner action

| Gate | Owner | Exact next action |
|---|---|---|
| Shared release/version/schema | P00 | Pin P04 read/receipt product SHA and this adapter SHA with schema/API digests; assign integration/runtime resources |
| Native account-link authority | P01/P05 | Implement/accept trusted resolver of SAME native owner + Telegram principal + existing link epoch; linked boolean/admin flag alone insufficient |
| Canonical read/receipt runtime | P04/P01 | Native owner-only GET and read-only lookup in approved sandbox, independent owner echo, cache/error/privacy; current mock witness isn't runtime acceptance |
| Account/member confirmation | P04/P00 | Accept canonical-owned account metadata and exact member-approved context; keep null/unresolved blocking until installed/accepted |
| Immutable source/reconciliation | P05/P04 | Authorized consistent MySQL export, actual counts/private row mapping and authoritative provenance; no DB [] fallback |
| Commit/idempotency/freeze/rollback | P04/P05/P00 | Authorize future full merged CAS write only after durable fence/drain and canonical receipt/provenance acceptance; unknown stays frozen during real cutover, rollback append-only with approval |
| Publication/notification runtime | P07/P03/P05 | Accept scoped version/cohort native journey and separate consent/unlink/revocation/read receipts; experimental bot operations need separate authorization |

P00 resource response or accepted release SHA is not presumed. No shared checkout edits, schema installs, legacy stops, customer sends, purchases, merge or Production. The prior `next start` rejection reason remains only `blocked by policy`; that action was not repeated via any command, tool, port, chat or alternate runtime. These module mocks are separately authorized independent work, not a substitute claimed to close the blocked built-server/native/bot acceptance.

Published/installed: nothing. Member-facing activation: none. Deliverable: connectable read adapter and mock/contract evidence, with persistence blocked. Draft PR6 head and final evidence are recorded in HANDOFF-v0.2.json after push; manager/P04 receive exact final SHA and open gates by authorized coordination.
