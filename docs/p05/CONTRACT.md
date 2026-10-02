# p05-mini-holdings-preview.v0.1 — owner review

Read-only preview adapter to P04 canonical holdings. P05 scope is source translation and orchestration contract; all valuation, access, normalization and version persistence remain with P04/P01. No import endpoint, identity table, holdings table, consent model or live writer is created.

## Mapping and review

| Legacy input | Canonical destination / required decision |
|---|---|
| telegramId | server verifies current mini session and NEXT09 two-sided binding to native site's user UUID/link epoch; never put source Telegram ID in a client-controlled canonical owner field |
| source namespace + local row id | deterministic opaque `position_key` candidate, persisted receipt binds namespace, row ID, owner, epoch and canonical position key; existing name/symbol is not dedupe identity |
| assetType + name | preserved source label; member chooses P04-supported asset_class and exactly one verified symbol or manual_label. No inferred stock ticker, gram/coin or currency denomination |
| quantity string | positive exact decimal within canonical-safe numeric range; explicit member-confirmed quantity unit; missing/zero/negative/precision loss blocks candidate |
| buyPrice/currentPrice | preserve source evidence only; currency/source/asOf/basis are absent. Never copy price as authoritative live quote, declared total value or cost_basis; never multiply to fabricate total/performance |
| ownership/account/as_of | explicit member confirmation; account unsupported in current DTO remains an open P04 field, never silently embedded or assigned; createdAt is not confirmation/trade date |
| unmappable row | unresolved review item; retain original; no zero/null-value substitute suggesting complete total |

Initial candidate is `valuation_mode=unpriced`, `cost_basis=null`, with explicit reviewed ownership/as_of/unit. It is merely a candidate for P04 normalization and member approval. Keep unknown price unknown. Stable reviewed contract must pin canonical field names/version/digest and supported classes; endpoint shape changes require a new adapter version. User review of current candidate does not certify broker holdings or missing historical transactions.

## Preview authority and reconciliation

Trusted server input includes verified native user/link binding, readable source snapshot with completeness proof, immutable source digest/count, current owner-only canonical version and position keys, and source-row receipt mapping. Pure mock flags are synthetic, never production proof. Member resolution is bound to source namespace/id/digest, canonical base version, link epoch and adapter version. Unknown DB/Auth/link/canonical status fails closed; no [] fallback.

Preview contains total source count; ready, unresolved, already-imported and conflict counts; each row's raw evidence, candidate or blocker; canonical-only positions retained count. Existing target/reference portfolio is excluded. Identical receipt→already-imported; absent/mismatched receipt or changed migrated row→conflict requiring review. If receipt position is absent from canonical snapshot, block reconciliation; do not recreate deleted canonical rows automatically. Key collision without receipt blocks. Repeating preview never writes.

P04 POST currently replaces the full holdings snapshot (debts preserved by canonical RPC); therefore eventual import must merge reviewed new positions with ALL unchanged current positions server-side. Do not POST only migrated rows, erase other accounts, aggregate duplicates by name or overwrite site edits. Conflicting source/canonical edits require member choice and fresh preview. CAS `base_version` is authoritative; token binds exact request, source digest and review. Persisting an operation key in process memory is not durable dedupe.

## Future receipt and single-writer protocol (NOT implemented)

Receipt: server-generated operation ID/client_token, adapter version, source namespace + owner binding/link epoch, source snapshot digest/count, exact reviewed mapping and payload digest, previous canonical version/id, returned canonical version/id, source-row→position-key map, accepted/unknown state, member approval timestamp and freeze epoch. Store in the canonical-owned operation mechanism selected by P04/P00, never a second financial ledger. Public report only aliases/counts/hashes; raw financial snapshot and identity mapping stay private with agreed retention.

1. P00 pins composition/schema/API digests. P01 verifies both identities/access and P04 finalizes read/normalize/import/receipt contracts. Owner authorizes synthetic acceptance separately; no real migration before these gates.
2. Future source write barrier covers every add/update/delete route AND direct/admin/job SQL writer; persisted source freeze epoch and ownership-scoped DB locking fence race requests. In-flight old writes drain. New legacy writes reject clearly; source snapshot/read remain available. Feature flag or application-only guard alone is insufficient proof.
3. Re-read immutable source under freeze; refresh canonical native user/access/link and version; preview differences. Changed digest/epoch/base version invalidates approval. Member approves exact full merged snapshot, not generic transfer consent.
4. Durable receipt enters pending BEFORE a single canonical POST. Commit receipt+mapping atomically with canonical write if selected mechanism supports it; otherwise keep freeze and reconcile by exact token/version through P04 owner contract. P05 must not invent cross-DB atomicity.
5. Timeout/lost response→unknown, source stays frozen. Query authoritative receipt by same token/payload; no new token, no blind retry, no success claim. After accepted receipt, canonical read is sole source for both clients, legacy remains read-only archive. Durable barrier persists across restart.
6. Counts and mapping reconcile before completion: source rows = unresolved + already-imported + newly accepted (with explicitly approved exclusions); no duplicated row import and all original canonical-only rows retained. Member observes SAME canonical version in both UIs. This runtime witness is separate from mocks.

## Rollback

No source deletion. Before commit, abort clears pending review only; re-enable old writes only after authoritative absence of canonical write and draining/reconciliation. Unknown commit stays frozen. After commit, prefer canonical-only mode and append corrective version from retained prior snapshot using current base-version CAS and exact member approval; never delete immutable history or replay stale snapshot over subsequent site edits. Reopening legacy writer requires separately authorized reverse reconciliation, current canonical export, new epoch/fence and one-writer proof. Merely switching a flag or routing to backup creates dual-write/lost data risk. Retention/export/history-after-expiry remains P01/product decision.

Open contract fields: P04-owned native canonical GET/receipt reconciliation API, account representation, positive completeness proof and MySQL freeze implementation, post-expiry history policy and member acceptance. Draft code may only be an unmounted preview/mock after P04 acknowledges the field contract; these open fields gate transport and migration.
