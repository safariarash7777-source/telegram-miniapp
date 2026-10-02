# P05 executable adapter ports v0.2 — P04 acknowledged

Scope: injectable, read-only adapter around the acknowledged P04 canonical DTO and existing NEXT09 identity/notification model. No endpoint URL invented, HTTP listener, database reader/writer, ledger, migration or legacy freeze installed. `commitBlocked=true` is unconditional.

P04 explicitly acknowledged field principles, selected the two read endpoints and added root receipt owner/contract metadata on 2026-10-02. Endpoint code remains P04-owned; P05 only implements translation/connector and mocks. Matching handler SHA256 at the mock witness:87232e74f891090059c7a7e7dc405af0748720c5b5595f1786149c7766659caa. Selected canonical development baseline is P00 PR195@31c44ab; miniapp source stays mini5@26c885c. P00 does not compose/admit189/193/mini6 into its sandbox baseline.

Final P04 code pin supersedes that historical worktree checkpoint: PR205@f58f6f0baea9a24987a7b7a7c4099b5a9d205804; read contract blob ce1a8f8295957a4409ed79a4ae54da25a0efb6f6, SHA2566ed6aa72d05c6932de9271e5975c5e76ae1189dd583368f7c95bed43164ebae0; handler blob d377b216a3084ac87e1be2737df266a8b2183927, SHA256a3a2bf89963c42e1f2db1c4a53e8279ae6ffe908fe176177d7bcbd093cf5f044. Hashes are Git blob LF bytes; worktree line endings are not a different API version. Fresh compatibility checks and prior witness are both retained. Full positions+note equality proves only canonical observation, never original operation kind: a debt write may carry holdings unchanged. Token/hash never proves account epoch, freeze or member confirmation.

## Canonical GET/read port

P04 owns future native-session GET/receipt lookup. Neither request accepts `user_id`, Telegram ID, advisor role or target/reference portfolio as owner authority. Response contract `p04-canonical-read.v0.1`: status ready/empty/error; private server-derived ownerId; version `{id,version}` or null; full current snake_case positions and debts, supportedAssetClasses. `empty` means no recorded version, not an empty recorded snapshot; ready with version+zero positions/debts is valid. Error/foreign owner never becomes empty. Full payload must be finite JSON, unique position_key/debt_key and bounded <=500 per side. Private no-store cache; Auth failure is not portfolio-empty. Do not expose internal fields or financial amounts to a model, logs, partner, group or other user.

## Binding/account port

Server resolves current native site user and verified mini Telegram session, then verifies SAME existing two-sided NEXT09 link and current link epoch. Status ready/unauthenticated/unlinked/unavailable. Ready fields: nativeUserId, telegramId, linkEpoch, accountBinding unresolved/verified and accountRef|null. Native identity and account ownership are distinct; accountRef is an opaque canonical-owned account reference, not a bank account invented by P05. Unknown account remains blocking. Admin/isAdmin never supplies binding or advisor consent.

Existing next09_connection exposes linked/legacyConnection/course/updates only; it does not expose verified Telegram ID or epoch. It cannot directly implement this trusted port. P01/P05 resolver acceptance remains OPEN; no RPC/identity table added here. This adapter's injected resolver can be a mock or later owner-approved integration; mock success is not identity acceptance. Re-read resolver after all reads; changed owner/Telegram/epoch/account fails closed without private payload.

## Source read port

Ownership-scoped immutable snapshot: ready with verified namespace, ownerTelegramId, complete=true and raw LegacyRow[]; error otherwise. DB unavailable/completeness unknown never returns successful empty. Real MySQL port must verify DB readiness, consistent snapshot/count and write-race handling; existing getPortfolioByTelegramId([] fallback) is insufficient. No direct MySQL adapter is activated in this package.

## Receipt/idempotency port

Owner-session lookup by same clientToken (max200), not client-selected user. Existing canonical member_holding_versions supplies client_token/content_hash/id/version; operation kind is encoded in the phase38 normalized SQL MD5, not a separate stored kind column. This is NOT P05 SHA256 preview digest. Lookup states accepted/unknown/conflict/error; abstract future pending also holds. Missing receipt is UNKNOWN, never none or proof that an original write cannot still commit. Accepted gives exact token, canonicalContentHash and canonical version `{id,version}`. Endpoint `reused=true` means the existing receipt is returned; it never counts new attempts or proves migration completion. Expected canonicalContentHash may be supplied only from a trusted prior operation's P04 normalization; wrong/absent hash cannot certify accepted import. Pending/unknown/error always holds; never generate new token, auto-retry a write or claim no commit.

Existing canonical receipt is NOT a full migration receipt: source namespace/rowDigest/positionKey/link epoch/account approval/freeze are not currently persisted there. `migrationMappings` optional future canonical-owned provenance; only owner-verified mappings may prevent reimport. No new receipt table is created and accepted canonical write alone never proves source freeze, member confirmation or completed migration. Current absence of authoritative mappings remains a gate; source-key collisions block.

## Context and preview digests

SHA256 contextDigest binds adapter version + verified owner/Telegram/link epoch/account binding/ref + source namespace/digest + full canonical version ID/number/positions/debts + canonical contract version/catalog. Object keys and row identities sort deterministically; reordered JSON rows do not alter meaning, changed values do. No digest is logged by adapter automatically.

Review submission must echo approvedContextDigest from a fresh first preview, in addition to source/base/epoch/version in each existing Review. Missing/stale context with reviews fails closed; preview input is never a generic migration approval. previewDigest additionally binds sorted mapping selections and resulting candidates/blockers + receipt observation. Account/member-confirmation/receipt/CAS/source-fence runtime acceptance still gates persistence; this digest is not SQL content_hash or authorization.

Snapshot/read drift requires refreshing preview, even if canonical version number stayed equal but version UUID/payload changed. Receipt matching doesn't assert equality of the latest canonical amounts. Adapter returns intended candidates and counts only; future write must merge ALL current canonical rows and let P04 enforce CAS/normalization, preserving debts/history.

## Executable scope

`server/p05/canonical-adapter.ts` awaits injected ports, handles failures and owner/contract/digest conflicts, rereads binding, and runs existing pure preview. It has no fetch/RPC/SQL/save/send/stop-legacy method. `canonical-read-transport.ts` connects only to the P04-selected `GET /api/portfolio/holdings` and read-only `POST /api/portfolio/holdings/receipt` with `{client_token,expectedCanonicalContentHash}`. No full-position POST is exposed. Injected owner-native transport is REQUIRED; no default fetch, cookie/key extraction or client-origin config. HTTPS approved origin, no redirect, no-store response, contract and owner metadata are required. It translates receipt `status/canonicalVersion` to port `state/createdVersion`; mappings remain absent and migrationComplete=false. P04 agreed root ownerId/receipt contract metadata on authenticated observations. Ports are interfaces of existing owner services, not a parallel domain model. Mock execution exercises orchestration; native HTTP/account/receipt/freeze acceptance remains separate.
