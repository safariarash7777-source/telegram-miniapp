/** Read-only local acceptance helper, deliberately outside production tsconfig.
 * Requires sibling P04 checkout at the pinned checkpoint; never calls an API/DB.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import financialInput from '../../../portfolio-p04-canonical-20261002/lib/portfolio/financialInput';
const {normalisePosition}=financialInput;
for(const [name,expected] of [['CANONICAL-CONTRACT.md','c7f8c2810819b555b52c9c6bac59bd24aad8138fcf753158d5a37b22cb64c407'],['IMPORT-MAPPING.md','fd1459961fff48f1c304f48585a1c04d9b6f64938bd033b88cd58e6263f727aa']])assert.equal(createHash('sha256').update(readFileSync(new URL('../../../portfolio-p04-canonical-20261002/docs/ops/seasonal-program/p04/'+name,import.meta.url))).digest('hex'),expected);
import {previewPortfolio,snapshotDigest,ADAPTER_VERSION,type LegacyRow,type Review} from '../../server/p05/portfolio-preview';
const rows:LegacyRow[]=[{id:7,telegramId:'synthetic-A',assetType:'stock',name:'نمونه ساختگی',quantity:'12.500000',buyPrice:'2000.00',currentPrice:'2200.00',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-02T00:00:00Z'}];
const review:Review={sourceKey:'mini5-synthetic:7',sourceDigest:snapshotDigest(rows),canonicalVersion:4,linkEpoch:'synthetic-epoch-1',adapterVersion:ADAPTER_VERSION,unit:'سهم',assetClass:'stock',symbol:null,manualLabel:'نمونه ساختگی',ownershipPct:50,asOf:'2026-10-02'};
const p=previewPortfolio({namespace:'mini5-synthetic',telegramId:'synthetic-A',bindingVerified:true,linkEpoch:review.linkEpoch,sourceState:'ready',sourceComplete:true,canonicalState:'ready',canonicalVersion:4,canonicalPositionKeys:['site-existing'],supportedAssetClasses:['stock'],rows,reviews:[review],receipts:[]});
assert.equal(p.rows[0].state,'ready');const canonical=normalisePosition(p.rows[0].candidate);
assert.equal(canonical.qty,12.5);assert.equal(canonical.ownership_pct,50);assert.equal(canonical.valuation_mode,'unpriced');assert.equal(canonical.valuation_status,'missing');assert.equal(canonical.declared_value,null);assert.equal(canonical.valuation_source,null);assert.equal(canonical.valuation_as_of,null);assert.equal(canonical.cost_basis,undefined);assert.equal(p.commitBlocked,true);
writeFileSync(new URL('./synthetic-preview.json',import.meta.url),JSON.stringify({syntheticOnly:true,proof:'read-only P04 normalizer, not native/Auth/DB acceptance',preview:p,normalizedCandidate:canonical},null,2)+'\n');
console.log('PASS: P05 synthetic candidate consumed unchanged by pinned P04 normalisePosition; unpriced/missing, no inferred cost/value, commit blocked. No API/DB/Telegram call.');
