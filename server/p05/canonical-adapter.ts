import {createHash} from 'node:crypto';
import {ADAPTER_VERSION,previewPortfolio,snapshotDigest,type LegacyRow,type Review,type MappingReceipt,type Preview} from './portfolio-preview';

export const READ_CONTRACT='p04-canonical-read.v0.1';
export const RECEIPT_CONTRACT='p04-receipt-read.v0.1';
type Json=null|boolean|number|string|Json[]|{[key:string]:Json};
/** Translation envelopes owned jointly with P04; no new financial persistence model. */
export type Binding={status:'ready';nativeUserId:string;telegramId:string;linkEpoch:string;accountBinding:'unresolved'|'verified';accountRef:string|null}
 |{status:'unauthenticated'|'unlinked'|'unavailable'};
export type CanonicalRead={contractVersion:typeof READ_CONTRACT;state:'ready'|'empty';ownerId:string;version:{id:string;version:number}|null;positions:Record<string,Json>[];debts:Record<string,Json>[];supportedAssetClasses:string[];accountRef?:string|null;memberConfirmedAt?:string|null}
 |{contractVersion:typeof READ_CONTRACT;state:'error'};
export type SourceRead={state:'ready';namespace:string;ownerTelegramId:string;complete:boolean;rows:LegacyRow[]}|{state:'error'};
export type ReceiptRead={contractVersion:typeof RECEIPT_CONTRACT;state:'pending'|'unknown'|'conflict';ownerId:string}
 |{contractVersion:typeof RECEIPT_CONTRACT;state:'error'}
 |{contractVersion:typeof RECEIPT_CONTRACT;state:'accepted';ownerId:string;clientToken:string;canonicalContentHash:string;createdVersion:{id:string;version:number};migrationMappings?:MappingReceipt[];migrationMappingsVerified?:boolean};
export interface CanonicalPorts {
  resolveBinding():Promise<Binding>;
  readSource(binding:Extract<Binding,{status:'ready'}>):Promise<SourceRead>;
  /** Native owner from server session; no caller owner/user_id argument. */
  readCanonical():Promise<CanonicalRead>;
  lookupReceipt(clientToken:string,expectedCanonicalContentHash:string):Promise<ReceiptRead>;
}
export type AdapterRequest={reviews:Review[];approvedContextDigest?:string;priorOperation?:{clientToken:string;expectedCanonicalContentHash:string}};
export type AdapterResult={state:'hold';commitBlocked:true;reason:string;contextDigest:null;previewDigest:null;preview:null}
 |{state:'preview';commitBlocked:true;contextDigest:string;previewDigest:string;preview:Preview;receipt:'not_requested'|'accepted';receiptMatched:boolean;blockers:string[]};
const hold=(reason:string):AdapterResult=>({state:'hold',commitBlocked:true,reason,contextDigest:null,previewDigest:null,preview:null});
const text=(s:unknown):s is string=>typeof s==='string'&&s.trim().length>0;
/** Reject values JSON.stringify would silently erase/coerce; stable object key ordering. */
function stable(value:unknown):Json {
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'&&Number.isFinite(value))return Object.is(value,-0)?0:value;
  if(Array.isArray(value))return value.map(stable);
  if(typeof value==='object'&&value!==null&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null))return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable((value as Record<string,unknown>)[k])])) as Json;
  throw new Error('invalid_json_payload');
}
function digest(value:unknown){return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function indexed(rows:Record<string,Json>[],key:string){
  const ids=rows.map(r=>r[key]);
  if(ids.some(id=>!text(id))||new Set(ids).size!==ids.length||rows.length>500)throw new Error('invalid_canonical_identity');
  return [...rows].sort((a,b)=>(a[key] as string).localeCompare(b[key] as string,'en'));
}
function bindingKey(b:Extract<Binding,{status:'ready'}>){
  if(!text(b.nativeUserId)||!text(b.telegramId)||!text(b.linkEpoch)||!['verified','unresolved'].includes(b.accountBinding)||b.accountBinding==='verified'&&!text(b.accountRef)||b.accountBinding==='unresolved'&&b.accountRef!==null)throw new Error('invalid_binding');
  return [b.nativeUserId,b.telegramId,b.linkEpoch,b.accountBinding,b.accountRef];
}
export async function readCanonicalPreview(ports:CanonicalPorts,request:AdapterRequest):Promise<AdapterResult>{
  try{
    const binding=await ports.resolveBinding();
    if(binding.status!=='ready')return hold('binding_'+binding.status);
    const identity=bindingKey(binding);
    const op=request.priorOperation;
    if(op&&(!text(op.clientToken)||op.clientToken.length>200||op.clientToken!==op.clientToken.trim()||!/^[a-f0-9]{32}$/.test(op.expectedCanonicalContentHash)))return hold('invalid_prior_operation');
    const [source,canonical,receipt]=await Promise.all([ports.readSource(binding),ports.readCanonical(),op?ports.lookupReceipt(op.clientToken,op.expectedCanonicalContentHash):Promise.resolve(null)]);
    if(source.state!=='ready'||source.complete!==true)return hold('source_unavailable_or_incomplete');
    if(source.ownerTelegramId!==binding.telegramId)return hold('source_owner_mismatch');
    if(canonical.contractVersion!==READ_CONTRACT||(canonical.state!=='ready'&&canonical.state!=='empty'))return hold('canonical_contract_or_read_error');
    if(canonical.ownerId!==binding.nativeUserId)return hold('canonical_owner_mismatch');
    const positions=indexed(canonical.positions,'position_key'),debts=indexed(canonical.debts,'debt_key');
    if(!Array.isArray(canonical.supportedAssetClasses)||canonical.supportedAssetClasses.some(c=>!text(c)))return hold('canonical_catalog_invalid');
    if(canonical.state==='empty'&&(canonical.version!==null||positions.length||debts.length))return hold('canonical_empty_state_inconsistent');
    if(canonical.state==='ready'&&(!canonical.version||!text(canonical.version.id)||!Number.isSafeInteger(canonical.version.version)||canonical.version.version<=0))return hold('canonical_version_invalid');
    let mappings:MappingReceipt[]=[],receiptMatched=false;
    if(receipt){
      if(receipt.contractVersion!==RECEIPT_CONTRACT||receipt.state==='error')return hold('receipt_unavailable');
      if(!['pending','unknown','conflict','accepted'].includes(receipt.state))return hold('receipt_state_invalid');
      if(receipt.ownerId!==binding.nativeUserId)return hold('receipt_owner_mismatch');
      if(['pending','unknown','conflict'].includes(receipt.state))return hold('receipt_'+receipt.state);
      if(receipt.state==='accepted'){
        if(receipt.clientToken!==op!.clientToken||receipt.canonicalContentHash!==op!.expectedCanonicalContentHash)return hold('receipt_token_or_content_conflict');
        if(!canonical.version||!text(receipt.createdVersion.id)||!Number.isSafeInteger(receipt.createdVersion.version)||receipt.createdVersion.version<=0||receipt.createdVersion.version>canonical.version.version||receipt.createdVersion.version===canonical.version.version&&receipt.createdVersion.id!==canonical.version.id)return hold('receipt_canonical_version_conflict');
        if(receipt.migrationMappings?.length){
          if(receipt.migrationMappingsVerified!==true)return hold('migration_mapping_provenance_unverified');
          mappings=receipt.migrationMappings.filter(r=>r.sourceKey.startsWith(source.namespace+':'));
        }
        receiptMatched=true;
      }
    }
    // Revalidate current binding after asynchronous source/canonical/receipt reads.
    const current=await ports.resolveBinding();
    if(current.status!=='ready'||digest(bindingKey(current))!==digest(identity))return hold('binding_changed_during_read');
    const contextDigest=digest({adapterVersion:ADAPTER_VERSION,contractVersion:canonical.contractVersion,identity,namespace:source.namespace,sourceDigest:snapshotDigest(source.rows),canonicalVersion:canonical.version,positions,debts,accountRef:canonical.accountRef??null,memberConfirmedAt:canonical.memberConfirmedAt??null,supportedAssetClasses:[...canonical.supportedAssetClasses].sort()});
    if(request.reviews.length&&request.approvedContextDigest!==contextDigest)return hold('review_context_missing_or_changed');
    const preview=previewPortfolio({namespace:source.namespace,telegramId:binding.telegramId,bindingVerified:true,linkEpoch:binding.linkEpoch,sourceState:'ready',sourceComplete:true,canonicalState:canonical.state,canonicalVersion:canonical.version?.version??0,canonicalPositionKeys:positions.map(r=>r.position_key as string),supportedAssetClasses:canonical.supportedAssetClasses,rows:source.rows,reviews:request.reviews,receipts:mappings});
    if(preview.counts===null)return hold(preview.blockers[0]??'invalid_preview');
    const blockers=[...preview.blockers,...(binding.accountBinding!=='verified'?['canonical_account_binding_unresolved']:[]),'member_confirmation_and_real_receipt_acceptance_open','legacy_writer_unchanged'];
    const previewDigest=digest({contextDigest,reviews:[...request.reviews].sort((a,b)=>a.sourceKey.localeCompare(b.sourceKey,'en')),rows:preview.rows.map(r=>({sourceKey:r.sourceKey,state:r.state,candidate:r.candidate,blockers:r.blockers})).sort((a,b)=>a.sourceKey.localeCompare(b.sourceKey,'en')),receipt});
    return {state:'preview',commitBlocked:true,contextDigest,previewDigest,preview,receipt:receipt?.state==='accepted'?'accepted':'not_requested',receiptMatched,blockers};
  }catch{return hold('adapter_read_unavailable_or_invalid_payload');}
}
