# P05 inventory — 2026-10-02

Execution reference: arash-product-plan-v0.1/00,01,03,04 read unchanged. P00 remains release-manifest owner; no combined baseline is declared accepted here. Read-only site191@a83f71d922a93ec2bfb398a306d7b282ce1db81f and195@31c44ab635b672b589b7833bcbc78b41d36f1e75; mini5@26c885cdf6aac1401e7feb9d7312df525ddd25e2 is this isolated branch base. Existing site189/193 and mini5 remain separate, unchanged inputs. Prior NEXT09 runtime policy rejection persists.

## File ownership

P05 owns new `server/p05/*` and `docs/p05/*` in `telegram-p05-portfolio-20261002` / `codex/p05-portfolio-preview-20261002`. No changes to routers, db, Drizzle schema/migrations, package scripts, UI or site files. P04 owns site `lib/portfolio`, holdings/debts APIs, financial UI/schema. Shared coordinator checkout is read-only. Reports delivered by PR/file references, not by editing shared status/decision documents. Dependency/runtime files remain unchanged.

## Verified mini5 model

| Source | Fact | Consequence |
|---|---|---|
| drizzle/schema.ts:portfolioAssets;0001_tranquil_sandman.sql | `portfolio_assets.id` integer auto-increment, owner `telegramId` varchar64 | local row ID is neither Telegram identity nor canonical position/version UUID; source namespace required |
| same | assetType gold/stock/currency/crypto/other; name free text | no verified catalog/security identifier; member must select mapping; no fuzzy-name match |
| same | quantity DECIMAL(18,6); buyPrice/currentPrice DECIMAL(18,2), not null | preserve raw decimal strings; no implicit float rounding, unknown price unit or cost-basis interpretation |
| same | createdAt/updatedAt timestamps | row timestamp is not market-price asOf or actual transaction date; no historical versions |
| same | no currency/unit/account/ownership/source/event columns, no asset-owner foreign key | missing information requires review; do not default ownership100 or infer gold grams/equity shares/IRT |
| server/routers.ts:307–365 | portfolio.list/addAsset/updateAsset/deleteAsset use telegramProcedure; ID owner from ctx.telegramSession | verified Telegram session scopes source only; linked native site identity still required; admin flag never advisor consent |
| server/db.ts:187–237 | owner-scoped list/update/delete; update only currentPrice; delete physically removes row | no transaction/transfer/real-broker evidence; preserve snapshot before any authorized cutover; deletion history cannot be reconstructed |
| server/db.ts | unavailable DB returns []/undefined | transport must positively verify snapshot completeness/DB readiness and rows, never equate outage with empty/success |
| drizzle/0002_perpetual_sally_floyd.sql | telegramId index only | no migration receipt, freeze/epoch, tombstone or duplicate-source constraint |
| client/src + repository search | no portfolio.list/addAsset/updateAsset/deleteAsset callsite or portfolio page at mini5 | API/model exists; user portfolio editing UI not verified. Dashboard/Calculator price labels are not guarantees of stored portfolio price currency |
| ROADMAP.md | future asset_transactions and expanded types proposed | proposal is not installed schema or history |

No live MySQL read, real member counts, assets, secrets or Telegram API accessed. Source counts, invalid rows, duplicates and deleted history remain UNKNOWN until authorized snapshot. P04 canonical is `member_holding_versions/member_holding_positions` plus debts, not target `portfolio_versions` or Arash reference portfolio. Current POST `/api/portfolio/holdings` is full-version optimistic write using `base_version/client_token`; site-owned GET/import/receipt surface is not yet settled. P05 creates none.

## Two separate outputs

1. Telegram identity/notification: reuse189+193+mini5 proof, opt-in, unlink, scoped deep link and delivery receipts. No new Auth/consent/publication model. Existing unit/isolated SQL evidence is historical; native two-sided runtime/bot acceptance still open. No blocked built-server retry, alternate server/tool/chat or real bot operation.
2. Portfolio migration: source inventory, reviewed mapping, difference preview, future durable receipt and reversible single-writer cutover. Connection alone does not migrate assets. This draft is not a migration, consent, financial advice or customer release.
