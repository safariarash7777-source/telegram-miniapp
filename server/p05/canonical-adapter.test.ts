import {it,expect} from 'vitest';
import {readCanonicalPreview,READ_CONTRACT,RECEIPT_CONTRACT,type CanonicalPorts,type Binding,type CanonicalRead,type ReceiptRead,type AdapterRequest} from './canonical-adapter';
import {ADAPTER_VERSION,snapshotDigest,rowDigest,type LegacyRow,type Review} from './portfolio-preview';
const binding:Extract<Binding,{status:'ready'}>={status:'ready',nativeUserId:'synthetic-site-A',telegramId:'synthetic-tg-A',linkEpoch:'epoch1',accountBinding:'unresolved',accountRef:null};
const rows:LegacyRow[]=[{id:7,telegramId:binding.telegramId,assetType:'stock',name:'نمونه',quantity:'2.500000',buyPrice:'10.00',currentPrice:'11.00',createdAt:'2026-10-01',updatedAt:'2026-10-02'}];
const canonical:Extract<CanonicalRead,{state:'ready'|'empty'}>={contractVersion:READ_CONTRACT,state:'ready',ownerId:binding.nativeUserId,version:{id:'v4-synthetic',version:4},positions:[{position_key:'site-existing',qty:7,unit:'عدد',asset_class:'other',symbol:null,manual_label:'نمونه سایت',as_of:'2026-10-02'}],debts:[{debt_key:'debt1',balance_toman:99}],supportedAssetClasses:['stock','other']};
const token='synthetic-operation-1',contentHash='a'.repeat(32);
const operation={clientToken:token,expectedCanonicalContentHash:contentHash};
function ports(patch:Partial<CanonicalPorts>={}):CanonicalPorts{return {resolveBinding:async()=>binding,readSource:async()=>({state:'ready',namespace:'mini5-synthetic',ownerTelegramId:binding.telegramId,complete:true,rows}),readCanonical:async()=>canonical,lookupReceipt:async()=>({contractVersion:RECEIPT_CONTRACT,state:'unknown',ownerId:binding.nativeUserId}),...patch};}
const request:AdapterRequest={reviews:[]};
function review():Review{return {sourceKey:'mini5-synthetic:7',sourceDigest:snapshotDigest(rows),canonicalVersion:4,linkEpoch:'epoch1',adapterVersion:ADAPTER_VERSION,assetClass:'stock',symbol:null,manualLabel:'نمونه',ownershipPct:50,asOf:'2026-10-02',unit:'سهم'};}
it('executes injected reads, returns private preview, never writes or changes legacy; unknown account blocks',async()=>{
 const calls:string[]=[];const p=ports({readCanonical:async()=>{calls.push('read');return canonical;},lookupReceipt:async()=>{throw Error('not requested');}});
 const r=await readCanonicalPreview(p,request);expect(r.state).toBe('preview');expect(r.commitBlocked).toBe(true);
 if(r.state==='preview'){expect(r.receipt).toBe('not_requested');expect(r.blockers).toContain('canonical_account_binding_unresolved');expect(r.blockers).toContain('legacy_writer_unchanged');}
 expect(calls).toEqual(['read']);expect(Object.keys(p).sort()).toEqual(['lookupReceipt','readCanonical','readSource','resolveBinding']);
});
for(const status of ['unauthenticated','unlinked','unavailable'] as const)it(status+' rejects before source reads',async()=>{
 let read=false;const r=await readCanonicalPreview(ports({resolveBinding:async()=>({status}),readCanonical:async()=>{read=true;return canonical;}}),request);expect(r.state).toBe('hold');expect(r.preview).toBeNull();expect(read).toBe(false);
});
for(const [name,p] of [
 ['source outage',ports({readSource:async()=>({state:'error'})})],
 ['source incomplete',ports({readSource:async()=>({state:'ready',namespace:'mini5-synthetic',ownerTelegramId:binding.telegramId,complete:false,rows})})],
 ['foreign source',ports({readSource:async()=>({state:'ready',namespace:'mini5-synthetic',ownerTelegramId:'B',complete:true,rows})})],
 ['canonical outage',ports({readCanonical:async()=>({contractVersion:READ_CONTRACT,state:'error'})})],
 ['foreign canonical',ports({readCanonical:async()=>({...canonical,ownerId:'B'})})],
 ['false empty',ports({readCanonical:async()=>({...canonical,state:'empty'})})],
 ['duplicate canonical',ports({readCanonical:async()=>({...canonical,positions:[canonical.positions[0],canonical.positions[0]]})})],
 ['duplicate debt',ports({readCanonical:async()=>({...canonical,debts:[canonical.debts[0],canonical.debts[0]]})})],
 ['invalid numeric payload',ports({readCanonical:async()=>({...canonical,positions:[{...canonical.positions[0],qty:NaN}]})})],
 ['reader thrown sensitive error',ports({readCanonical:async()=>{throw Error('must-never-leak-private-secret');}})],
] as const)it(name+' fails closed without source details',async()=>{
 const r=await readCanonicalPreview(p,request);expect(r.state).toBe('hold');expect(r.preview).toBeNull();expect(r.contextDigest).toBeNull();expect(JSON.stringify(r)).not.toContain('must-never-leak');
});
it('unknown runtime receipt state and contract drift fail closed',async()=>{
 const p=ports({lookupReceipt:async()=>({contractVersion:RECEIPT_CONTRACT,state:'unexpected',ownerId:binding.nativeUserId} as unknown as ReceiptRead)});
 expect((await readCanonicalPreview(p,{...request,priorOperation:operation})).state).toBe('hold');
 expect((await readCanonicalPreview(ports({readCanonical:async()=>({...canonical,contractVersion:'future'} as unknown as CanonicalRead)}),request)).state).toBe('hold');
});
it('obsolete none receipt does not prove missing operation or permit replay',async()=>{
 expect((await readCanonicalPreview(ports({lookupReceipt:async()=>({contractVersion:RECEIPT_CONTRACT,state:'none',ownerId:binding.nativeUserId} as unknown as ReceiptRead)}),{...request,priorOperation:operation})).state).toBe('hold');
});
it('ready recorded empty snapshot differs from no-version empty and errors',async()=>{
 const recorded=await readCanonicalPreview(ports({readCanonical:async()=>({...canonical,positions:[],debts:[]})}),request);
 const absent=await readCanonicalPreview(ports({readCanonical:async()=>({...canonical,state:'empty',version:null,positions:[],debts:[]})}),request);
 expect(recorded.state).toBe('preview');expect(absent.state).toBe('preview');expect(recorded.contextDigest).not.toBe(absent.contextDigest);
});
it('review requires full context digest; matching digest makes candidate ready but commit remains blocked',async()=>{
 const first=await readCanonicalPreview(ports(),request);expect(first.state).toBe('preview');
 expect((await readCanonicalPreview(ports(),{reviews:[review()]})).state).toBe('hold');
 const reviewed=await readCanonicalPreview(ports(),{reviews:[review()],approvedContextDigest:first.contextDigest!});
 expect(reviewed.state).toBe('preview');if(reviewed.state==='preview'){expect(reviewed.preview.rows[0].candidate?.qty).toBe(2.5);expect(reviewed.commitBlocked).toBe(true);expect(reviewed.previewDigest).not.toBe(first.previewDigest);}
});
for(const [name,changed] of [
 ['version UUID',{...canonical,version:{id:'same-number-different-id',version:4}}],
 ['canonical amount',{...canonical,positions:[{...canonical.positions[0],qty:8}]}],
 ['debt amount',{...canonical,debts:[{...canonical.debts[0],balance_toman:100}]}],
 ['supported catalog',{...canonical,supportedAssetClasses:['other']}],
] as const)it(name+' invalidates review even if numeric version unchanged',async()=>{
 const first=await readCanonicalPreview(ports(),request);
 const r=await readCanonicalPreview(ports({readCanonical:async()=>changed}),{reviews:[review()],approvedContextDigest:first.contextDigest!});expect(r.state).toBe('hold');
});
it('object key and position/debt order do not change context digest',async()=>{
 const a={...canonical,positions:[...canonical.positions,{position_key:'another',qty:1}],debts:[...canonical.debts,{debt_key:'another',balance_toman:1}]};
 const b={...a,positions:[...a.positions].reverse().map(r=>Object.fromEntries(Object.entries(r).reverse())),debts:[...a.debts].reverse()};
 expect((await readCanonicalPreview(ports({readCanonical:async()=>a}),request)).contextDigest).toBe((await readCanonicalPreview(ports({readCanonical:async()=>b}),request)).contextDigest);
});
for(const patch of [{linkEpoch:'epoch2'},{nativeUserId:'B'},{telegramId:'B'},{accountBinding:'verified',accountRef:'account1'}] as const)it('binding drift '+Object.keys(patch)[0]+' during reads hides preview',async()=>{
 let n=0;const r=await readCanonicalPreview(ports({resolveBinding:async()=>++n===1?binding:{...binding,...patch}}),request);expect(r.state).toBe('hold');expect(r.preview).toBeNull();
});
for(const state of ['pending','unknown','conflict','error'] as const)it('receipt '+state+' holds without blind retry',async()=>{
 let calls=0;const r=await readCanonicalPreview(ports({lookupReceipt:async()=>{calls++;return state==='error'?{contractVersion:RECEIPT_CONTRACT,state}:{contractVersion:RECEIPT_CONTRACT,state,ownerId:binding.nativeUserId};}}),{...request,priorOperation:operation});
 expect(r.state).toBe('hold');expect(calls).toBe(1);
});
const accepted:Extract<ReceiptRead,{state:'accepted'}>={contractVersion:RECEIPT_CONTRACT,state:'accepted',ownerId:binding.nativeUserId,clientToken:token,canonicalContentHash:contentHash,createdVersion:{id:'v4-synthetic',version:4}};
for(const [name,patch] of [
 ['token',{clientToken:'other'}],['content hash',{canonicalContentHash:'b'.repeat(32)}],['owner',{ownerId:'B'}],['version ID',{createdVersion:{id:'other',version:4}}],['future version',{createdVersion:{id:'v5',version:5}}],
 ['unverified source mapping',{migrationMappings:[{sourceKey:'mini5-synthetic:7',rowDigest:rowDigest(rows[0]),positionKey:'mini:mini5-synthetic:7'}]}],
] as const)it('receipt '+name+' cannot certify import',async()=>{
 const r=await readCanonicalPreview(ports({lookupReceipt:async()=>({...accepted,...patch})}),{...request,priorOperation:operation});expect(r.state).toBe('hold');
});
it('matched existing canonical receipt is not completed migration, amount equality, or permission to commit',async()=>{
 const r=await readCanonicalPreview(ports({lookupReceipt:async()=>accepted}),{...request,priorOperation:operation});expect(r.state).toBe('preview');
 if(r.state==='preview'){expect(r.receiptMatched).toBe(true);expect(r.commitBlocked).toBe(true);expect(r.preview.counts?.alreadyImported).toBe(0);expect(r.blockers).toContain('member_confirmation_and_real_receipt_acceptance_open');}
});
it('accepted receipt can precede latest site edit, yet mappings do not claim latest amount equality',async()=>{
 const positions=[...canonical.positions,{position_key:'mini:mini5-synthetic:7',qty:999}];
 const r=await readCanonicalPreview(ports({readCanonical:async()=>({...canonical,version:{id:'v5',version:5},positions}),lookupReceipt:async()=>({...accepted,migrationMappingsVerified:true,migrationMappings:[{sourceKey:'mini5-synthetic:7',rowDigest:rowDigest(rows[0]),positionKey:'mini:mini5-synthetic:7'}]})}),{...request,priorOperation:operation});
 expect(r.state).toBe('preview');if(r.state==='preview'){expect(r.preview.counts?.alreadyImported).toBe(1);expect(r.commitBlocked).toBe(true);expect(r.preview.rows[0].candidate).toBeNull();}
});
it('SHA256 preview digest is never accepted as canonical MD5; token is bounded',async()=>{
 for(const op of [{...operation,expectedCanonicalContentHash:'a'.repeat(64)},{...operation,clientToken:'a'.repeat(201)},{...operation,clientToken:' padded '}])expect((await readCanonicalPreview(ports(),{...request,priorOperation:op})).state).toBe('hold');
});
