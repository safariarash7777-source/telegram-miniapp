import { createHash } from 'node:crypto';

/** Unmounted pure preview of P04's existing DTO; never a persistence/valuation model. */
export const ADAPTER_VERSION = 'p05-mini-holdings-preview.v0.1';
export type LegacyRow = {
  id: number; telegramId: string; assetType: string; name: string;
  quantity: string; buyPrice: string; currentPrice: string;
  createdAt: string; updatedAt: string;
};
export type Review = {
  sourceKey: string; sourceDigest: string; unit: string;
  canonicalVersion: number; linkEpoch: string; adapterVersion: string;
  assetClass: string; symbol: string | null; manualLabel: string | null;
  ownershipPct: number; asOf: string;
};
export type MappingReceipt = { sourceKey: string; rowDigest: string; positionKey: string };
export type PreviewInput = {
  namespace: string; telegramId: string; bindingVerified: boolean; linkEpoch: string;
  sourceState: 'ready' | 'error'; sourceComplete: boolean;
  canonicalState: 'ready' | 'empty' | 'error'; canonicalVersion: number;
  canonicalPositionKeys: readonly string[]; supportedAssetClasses: readonly string[];
  rows: readonly LegacyRow[]; reviews: readonly Review[]; receipts: readonly MappingReceipt[];
};
/** Exact snake_case write boundary from P04 normalisePosition, unpriced only. */
export type Candidate = {
  position_key: string; symbol: string | null; manual_label: string | null;
  asset_class: string; qty: number; unit: string; as_of: string;
  ownership_pct: number; valuation_mode: 'unpriced'; cost_basis: null;
};
export type PreviewRow = {
  sourceKey: string; rowDigest: string; source: Readonly<LegacyRow>;
  state: 'ready' | 'unresolved' | 'already_imported' | 'conflict';
  blockers: string[]; candidate: Candidate | null;
};
export type Preview = {
  adapterVersion: typeof ADAPTER_VERSION; commitBlocked: true;
  blockers: string[]; sourceDigest: string | null; baseVersion: number | null;
  counts: { source: number; ready: number; unresolved: number; alreadyImported: number; conflicts: number; canonicalRetained: number } | null;
  rows: PreviewRow[];
};
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const nonempty = (s: unknown): s is string => typeof s === 'string' && !!s.trim();
const date = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
export function sourceKey(namespace: string, id: number): string { return `${namespace}:${id}`; }
export function rowDigest(r: LegacyRow): string {
  // Fixed field order; unknown extra fields never enter a review/receipt implicitly.
  return hash([r.id, r.telegramId, r.assetType, r.name, r.quantity, r.buyPrice, r.currentPrice, r.createdAt, r.updatedAt]);
}
export function snapshotDigest(rows: readonly LegacyRow[]): string {
  return hash([...rows].sort((a,b) => a.id-b.id).map(r => [r.id,rowDigest(r)]));
}
/** DECIMAL(18,6) positive strings must survive canonical number conversion unchanged. */
export function quantityCandidate(raw: string): number | null {
  if (typeof raw !== 'string' || !/^\d{1,12}(?:\.\d{1,6})?$/.test(raw)) return null;
  const [whole,fraction=''] = raw.split('.');
  const scaled = BigInt(whole)*BigInt(1000000) + BigInt(fraction.padEnd(6,'0'));
  const value = Number(raw);
  if (scaled <= BigInt(0) || !Number.isFinite(value)) return null;
  const [w,f=''] = value.toFixed(6).split('.');
  return BigInt(w)*BigInt(1000000)+BigInt(f) === scaled ? value : null;
}
function rejected(reason: string): Preview {
  return { adapterVersion:ADAPTER_VERSION,commitBlocked:true,blockers:[reason],sourceDigest:null,baseVersion:null,counts:null,rows:[] };
}
export function previewPortfolio(i: PreviewInput): Preview {
  // These flags belong to the future trusted adapter, never a browser authority.
  if (!i.bindingVerified || !nonempty(i.telegramId) || !nonempty(i.linkEpoch)) return rejected('current_verified_identity_required');
  if (i.sourceState !== 'ready' || !i.sourceComplete) return rejected('source_unavailable_or_incomplete');
  if (i.canonicalState === 'error') return rejected('canonical_unavailable');
  if (!/^mini5-[a-z0-9-]{1,48}$/.test(i.namespace)) return rejected('verified_source_namespace_required');
  if (!Number.isSafeInteger(i.canonicalVersion) || i.canonicalVersion < 0 || i.rows.length>500 || i.canonicalPositionKeys.length>500) return rejected('canonical_version_or_capacity_invalid');
  if (i.canonicalState==='empty' && (i.canonicalVersion!==0 || i.canonicalPositionKeys.length)) return rejected('canonical_empty_state_inconsistent');
  if (i.canonicalState==='ready' && i.canonicalVersion===0) return rejected('canonical_ready_state_inconsistent');
  if (i.rows.some(r => r.telegramId!==i.telegramId)) return rejected('source_owner_mismatch');
  const ids=i.rows.map(r=>r.id),keys=new Set(i.canonicalPositionKeys);
  if (ids.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(ids).size!==ids.length||keys.size!==i.canonicalPositionKeys.length) return rejected('duplicate_or_invalid_position_identity');
  const receiptKeys=i.receipts.map(r=>r.sourceKey),reviewKeys=i.reviews.map(r=>r.sourceKey);
  if (new Set(receiptKeys).size!==receiptKeys.length||new Set(reviewKeys).size!==reviewKeys.length) return rejected('duplicate_review_or_receipt');
  const dig=snapshotDigest(i.rows);
  const rows=i.rows.map((source):PreviewRow=>{
    const key=sourceKey(i.namespace,source.id),rd=rowDigest(source),positionKey=`mini:${key}`;
    const result:PreviewRow={sourceKey:key,rowDigest:rd,source:{...source},state:'unresolved',blockers:[],candidate:null};
    const receipt=i.receipts.find(r=>r.sourceKey===key);
    if(receipt){
      if(receipt.positionKey!==positionKey||!keys.has(receipt.positionKey)||receipt.rowDigest!==rd){result.state='conflict';result.blockers=['receipt_source_or_canonical_conflict'];}
      else result.state='already_imported'; // Does not assert unchanged canonical amounts.
      return result;
    }
    if(keys.has(positionKey)){result.state='conflict';result.blockers=['position_key_collision_without_receipt'];return result;}
    const review=i.reviews.find(r=>r.sourceKey===key);
    if(!review){result.blockers=['member_mapping_confirmation_required'];return result;}
    if(review.sourceDigest!==dig){result.blockers=['source_changed_since_review'];return result;}
    if(review.canonicalVersion!==i.canonicalVersion||review.linkEpoch!==i.linkEpoch||review.adapterVersion!==ADAPTER_VERSION){result.blockers=['review_context_changed'];return result;}
    const qty=quantityCandidate(source.quantity);
    if(qty===null)result.blockers.push('invalid_or_precision_losing_quantity');
    if(!nonempty(review.unit))result.blockers.push('quantity_unit_required');
    if(!nonempty(review.assetClass)||!i.supportedAssetClasses.includes(review.assetClass))result.blockers.push('canonical_asset_class_required');
    if(!!review.symbol===!!review.manualLabel||review.symbol!==null&&!nonempty(review.symbol)||review.manualLabel!==null&&!nonempty(review.manualLabel))result.blockers.push('exactly_one_reviewed_instrument_required');
    if(!Number.isFinite(review.ownershipPct)||review.ownershipPct<=0||review.ownershipPct>100||Math.abs(review.ownershipPct*100-Math.round(review.ownershipPct*100))>1e-8)result.blockers.push('explicit_ownership_confirmation_required');
    if(!date(review.asOf))result.blockers.push('member_confirmed_as_of_required');
    if(result.blockers.length)return result;
    result.state='ready';result.candidate={position_key:positionKey,symbol:review.symbol,manual_label:review.manualLabel,asset_class:review.assetClass,qty:qty!,unit:review.unit,as_of:review.asOf,ownership_pct:review.ownershipPct,valuation_mode:'unpriced',cost_basis:null};
    return result;
  });
  return {adapterVersion:ADAPTER_VERSION,commitBlocked:true,blockers:['P00_P01_P04_runtime_gates','account_confirmation_receipt_contract_pending','live_transport_not_implemented',...(keys.size+rows.filter(r=>r.state==='ready').length>500?['merged_snapshot_capacity_exceeded']:[])],sourceDigest:dig,baseVersion:i.canonicalVersion,rows,
    counts:{source:rows.length,ready:rows.filter(r=>r.state==='ready').length,unresolved:rows.filter(r=>r.state==='unresolved').length,alreadyImported:rows.filter(r=>r.state==='already_imported').length,conflicts:rows.filter(r=>r.state==='conflict').length,canonicalRetained:keys.size}};
}

/** Pure intended authority plan: no DB barrier/route guard is implemented by this. */
export function planWriteAuthority(i:{stage:'legacy'|'review'|'pending'|'canonical'|'unknown'|'rollback';sourceFrozen:boolean;receipt:'none'|'pending'|'accepted'|'unknown'}):'legacy_only'|'canonical_only'|'hold_all' {
  if(i.stage==='legacy'&&!i.sourceFrozen&&i.receipt==='none')return 'legacy_only';
  if(i.stage==='canonical'&&i.sourceFrozen&&i.receipt==='accepted')return 'canonical_only';
  return 'hold_all';
}
