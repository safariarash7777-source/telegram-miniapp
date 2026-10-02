import { describe, it, expect } from 'vitest';
import {ADAPTER_VERSION,previewPortfolio,rowDigest,snapshotDigest,sourceKey,quantityCandidate,planWriteAuthority,type PreviewInput,type LegacyRow,type Review} from './portfolio-preview';
const row:LegacyRow={id:7,telegramId:'synthetic-A',assetType:'stock',name:'نمونه ساختگی با نماد نامعلوم',quantity:'12.500000',buyPrice:'2000.00',currentPrice:'2200.00',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-02T00:00:00Z'};
const initial:PreviewInput={namespace:'mini5-synthetic',telegramId:'synthetic-A',bindingVerified:true,linkEpoch:'synthetic-epoch-1',sourceState:'ready',sourceComplete:true,canonicalState:'ready',canonicalVersion:4,canonicalPositionKeys:['existing-site-position'],supportedAssetClasses:['stock','gold'],rows:[row],reviews:[],receipts:[]};
const review:Review={sourceKey:sourceKey(initial.namespace,row.id),sourceDigest:snapshotDigest([row]),canonicalVersion:4,linkEpoch:initial.linkEpoch,adapterVersion:ADAPTER_VERSION,unit:'سهم',assetClass:'stock',symbol:null,manualLabel:row.name,ownershipPct:50,asOf:'2026-10-02'};
const ready={...initial,reviews:[review]};
describe('P05 pure portfolio preview, synthetic only',()=>{
  it('retains unknown ownership/unit and raw prices without guessing or mutating source',()=>{
    const before=JSON.stringify(initial),p=previewPortfolio(initial);
    expect(p.rows[0].state).toBe('unresolved');expect(p.rows[0].candidate).toBeNull();
    expect(p.rows[0].source.buyPrice).toBe('2000.00');expect(p.commitBlocked).toBe(true);expect(JSON.stringify(initial)).toBe(before);
  });
  it('maps reviewed unpriced DTO; keeps existing canonical rows counted, never emits a POST',()=>{
    const p=previewPortfolio(ready);expect(p.rows[0].candidate).toEqual({position_key:'mini:mini5-synthetic:7',symbol:null,manual_label:row.name,asset_class:'stock',qty:12.5,unit:'سهم',as_of:'2026-10-02',ownership_pct:50,valuation_mode:'unpriced',cost_basis:null});
    expect(p.counts).toEqual({source:1,ready:1,unresolved:0,alreadyImported:0,conflicts:0,canonicalRetained:1});
    expect(p.commitBlocked).toBe(true);expect(p.blockers).toContain('live_transport_not_implemented');
    expect(p.rows[0].candidate).not.toHaveProperty('user_id');expect(p.rows[0].candidate).not.toHaveProperty('current_price');
  });
  for(const [name,patch] of [
    ['unverified identity',{bindingVerified:false}],['missing link epoch',{linkEpoch:''}],
    ['source outage',{sourceState:'error'}],['incomplete source',{sourceComplete:false}],
    ['canonical outage',{canonicalState:'error'}],['invalid namespace',{namespace:'production/foreign'}],
    ['foreign owner',{rows:[{...row,telegramId:'synthetic-B'}]}],['duplicate source',{rows:[row,row]}],
    ['invalid row ID',{rows:[{...row,id:-1}]}],['duplicate receipt',{receipts:[{sourceKey:'x',rowDigest:'x',positionKey:'x'},{sourceKey:'x',rowDigest:'x',positionKey:'x'}]}],
    ['duplicate review',{reviews:[review,review]}],['false empty canonical',{canonicalState:'empty'}],
    ['invalid base',{canonicalVersion:NaN}],['duplicate canonical keys',{canonicalPositionKeys:['x','x']}],
    ['false ready canonical',{canonicalVersion:0}],
  ] as const)it(name+' fails closed without source private details',()=>{
    const p=previewPortfolio({...ready,...patch} as PreviewInput);expect(p.counts).toBeNull();expect(p.rows).toEqual([]);expect(p.sourceDigest).toBeNull();expect(p.commitBlocked).toBe(true);
  });
  it('successful empty source differs from unavailable source and keeps canonical snapshot',()=>{
    const p=previewPortfolio({...initial,rows:[]});expect(p.counts?.source).toBe(0);expect(p.counts?.canonicalRetained).toBe(1);
    expect(previewPortfolio({...initial,rows:[],sourceState:'error'}).counts).toBeNull();
  });
  for(const [name,patch] of [
    ['unit missing',{unit:''}],['ownership missing',{ownershipPct:NaN}],['ownership zero',{ownershipPct:0}],['ownership over100',{ownershipPct:101}],['ownership precision',{ownershipPct:33.333}],
    ['ambiguous instrument',{symbol:'TEST'}],['no instrument',{manualLabel:null}],['unsupported class',{assetClass:'invented'}],['invalid date',{asOf:'2026-02-30'}],
    ['stale canonical base',{canonicalVersion:3}],['changed link epoch',{linkEpoch:'old'}],['adapter revision',{adapterVersion:'old'}],['changed source digest',{sourceDigest:'old'}],
  ] as const)it(name+' keeps row unresolved and commit blocked',()=>{
    const p=previewPortfolio({...initial,reviews:[{...review,...patch}]});expect(p.rows[0].candidate).toBeNull();expect(p.rows[0].state).toBe('unresolved');expect(p.commitBlocked).toBe(true);
  });
  it('changed source makes old approval unusable, including price-only legacy writes',()=>{
    expect(previewPortfolio({...ready,rows:[{...row,currentPrice:'2201.00'}]}).rows[0].blockers).toContain('source_changed_since_review');
  });
  it('identical durable mock mapping prevents reimport; does not assert canonical value unchanged',()=>{
    const p=previewPortfolio({...ready,canonicalPositionKeys:['existing-site-position','mini:mini5-synthetic:7'],receipts:[{sourceKey:review.sourceKey,rowDigest:rowDigest(row),positionKey:'mini:mini5-synthetic:7'}]});
    expect(p.rows[0].state).toBe('already_imported');expect(p.rows[0].candidate).toBeNull();expect(p.counts?.alreadyImported).toBe(1);
  });
  for(const [name,keys,receipt] of [
    ['collision without receipt',['mini:mini5-synthetic:7'],null],
    ['changed source receipt',['mini:mini5-synthetic:7'],{sourceKey:review.sourceKey,rowDigest:'old',positionKey:'mini:mini5-synthetic:7'}],
    ['deleted canonical row',[],{sourceKey:review.sourceKey,rowDigest:rowDigest(row),positionKey:'mini:mini5-synthetic:7'}],
    ['wrong receipt target',['different'],{sourceKey:review.sourceKey,rowDigest:rowDigest(row),positionKey:'different'}],
  ] as const)it(name+' blocks silent overwrite/recreation',()=>{
    const p=previewPortfolio({...ready,canonicalPositionKeys:keys,receipts:receipt?[receipt]:[]});expect(p.rows[0].state).toBe('conflict');expect(p.rows[0].candidate).toBeNull();
  });
  it('reordered snapshot hashes identically; modified row hashes differently',()=>{
    const other={...row,id:8};expect(snapshotDigest([row,other])).toBe(snapshotDigest([other,row]));expect(rowDigest(row)).not.toBe(rowDigest({...row,updatedAt:'different'}));
  });
  it('same-name distinct source rows are not aggregated or identified by price',()=>{
    const other={...row,id:8,currentPrice:'11.00'},rows=[row,other],digest=snapshotDigest(rows);
    const p=previewPortfolio({...initial,rows,reviews:[{...review,sourceDigest:digest},{...review,sourceKey:sourceKey(initial.namespace,8),sourceDigest:digest}]});
    expect(p.counts?.ready).toBe(2);expect(new Set(p.rows.map(r=>r.candidate?.position_key)).size).toBe(2);
    expect(p.rows.every(r=>r.candidate?.cost_basis===null&&r.candidate?.valuation_mode==='unpriced')).toBe(true);
  });
  it('500 already imported rows remain replayable without double counting capacity',()=>{
    const rows=Array.from({length:500},(_,x)=>({...row,id:x+1}));const receipts=rows.map(r=>({sourceKey:sourceKey(initial.namespace,r.id),rowDigest:rowDigest(r),positionKey:`mini:${sourceKey(initial.namespace,r.id)}`}));
    const p=previewPortfolio({...initial,rows,canonicalPositionKeys:receipts.map(r=>r.positionKey),receipts});expect(p.counts?.alreadyImported).toBe(500);expect(p.blockers).not.toContain('merged_snapshot_capacity_exceeded');
  });
  it('candidate exceeding full canonical snapshot capacity cannot commit',()=>{
    const p=previewPortfolio({...ready,canonicalPositionKeys:Array.from({length:500},(_,x)=>'site-'+x)});expect(p.blockers).toContain('merged_snapshot_capacity_exceeded');expect(p.commitBlocked).toBe(true);
  });
  for(const raw of ['0','-1','1e3','NaN','۱۲','1.0000001','999999999999.123456'])it('rejects unsafe source quantity '+raw,()=>expect(quantityCandidate(raw)).toBeNull());
  for(const raw of ['12.500000','0.000001','100000000000.000000'])it('exact quantity conversion '+raw,()=>expect(quantityCandidate(raw)).toBe(Number(raw)));
});
describe('single-writer planning, no actual barrier or receipt backend',()=>{
  for(const stage of ['legacy','review','pending','canonical','unknown','rollback'] as const)
    for(const frozen of [true,false])for(const receipt of ['none','pending','accepted','unknown'] as const)
      it(`${stage}/${frozen}/${receipt} admits at most one planned writer`,()=>{
        const p=planWriteAuthority({stage,sourceFrozen:frozen,receipt});
        expect(p).toBe(stage==='legacy'&&!frozen&&receipt==='none'?'legacy_only':stage==='canonical'&&frozen&&receipt==='accepted'?'canonical_only':'hold_all');
      });
  it('lost response and rollback hold both mocked writes; accepted receipt with broken fence holds',()=>{
    const calls:string[]=[];
    for(const i of [{stage:'unknown',sourceFrozen:true,receipt:'unknown'},{stage:'rollback',sourceFrozen:true,receipt:'accepted'},{stage:'canonical',sourceFrozen:false,receipt:'accepted'}] as const){const p=planWriteAuthority(i);if(p!=='hold_all')calls.push(p);}
    expect(calls).toEqual([]);
  });
});
