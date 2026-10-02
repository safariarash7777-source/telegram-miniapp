# P04 agreement checkpoint — 2026-10-02

P04 owner explicitly acknowledged pure read-only preview in task 01a0fcb5-2bca-7071-afec-26a21f1f4995. Canonical DTO v0.1 is existing shape only; no future endpoint commitment. No default ownership100, price/cost basis inference or false empty state. Account/memberConfirmedAt/receipt are unresolved extensions and `commitBlocked=true`.

Read sources at P04 commit `ab2a0fdb52cd1f2d791687f346bd4126acef6922`:

- docs/ops/seasonal-program/p04/CANONICAL-CONTRACT.md SHA256 C7F8C2810819B555B52C9C6BAC59BD24AAD8138FCF753158D5A37B22CB64C407
- docs/ops/seasonal-program/p04/IMPORT-MAPPING.md SHA256 FD1459961FFF48F1C304F48585A1C04D9B6F64938BD033B88CD58E6263F727AA

P05 owns no canonical API/schema. New pure adapter emits unpriced candidate DTOs only, retains raw source decimals, computes immutable row/snapshot digests and exposes reconciliation counts. Mocks use injected trusted-state flags and synthetic rows; they do not prove source export completeness, native Auth, actual receipts or freeze fences. No new shared financial model or runtime import path is created. Contract code is unmounted and cannot migrate or send anything.
