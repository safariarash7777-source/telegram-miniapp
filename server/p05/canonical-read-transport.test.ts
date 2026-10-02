import {it,expect} from 'vitest';
import {createP04ReadConnector} from './canonical-read-transport';
import {READ_CONTRACT,RECEIPT_CONTRACT,readCanonicalPreview,type CanonicalPorts} from './canonical-adapter';
const token='synthetic-op',hash='a'.repeat(32),owner='synthetic-A',origin='https://synthetic.invalid';
const snapshot={contractVersion:READ_CONTRACT,state:'ready',ownerId:owner,version:{id:'version4',version:4},positions:[],debts:[],supportedAssetClasses:['equity_ir'],accountRef:null,memberConfirmedAt:null};
const accepted={contractVersion:RECEIPT_CONTRACT,status:'accepted',ownerId:owner,clientToken:token,canonicalContentHash:hash,canonicalVersion:{id:'version4',version:4},migrationMappings:null,migrationComplete:false,reused:true};
const response=(body:unknown,status=200,cache='private, no-store')=>Response.json(body,{status,headers:{'cache-control':cache}});
for(const value of ['http://synthetic.invalid','https://user:pass@synthetic.invalid','https://synthetic.invalid/path','https://synthetic.invalid/?owner=B'])it('rejects unsafe canonical destination '+value,()=>expect(()=>createP04ReadConnector(value,async()=>{throw Error('must not call');})).toThrow());
it('GET native owner snapshot and POST read-only receipt use exact approved routes, no owner/position write payload',async()=>{
 const calls:{url:string;init:RequestInit|undefined}[]=[];
 const connector=createP04ReadConnector(origin,async(url,init)=>{calls.push({url:String(url),init});return response(init?.method==='GET'?snapshot:accepted);});
 expect((await connector.readCanonical()).state).toBe('ready');expect((await connector.lookupReceipt(token,hash)).state).toBe('accepted');
 expect(calls.map(c=>c.url)).toEqual([origin+'/api/portfolio/holdings',origin+'/api/portfolio/holdings/receipt']);
 expect(calls[0].init?.method).toBe('GET');expect(calls[0].init?.body).toBeUndefined();
 expect(JSON.parse(String(calls[1].init?.body))).toEqual({client_token:token,expectedCanonicalContentHash:hash});
 expect(calls.every(c=>c.init?.redirect==='error'&&c.init?.cache==='no-store')).toBe(true);
 expect(calls[1].init?.headers).not.toHaveProperty('authorization');expect(calls[1].init?.headers).not.toHaveProperty('cookie');
});
for(const status of [401,403,404,503])it('HTTP '+status+' is read error, never empty/none',async()=>{
 const c=createP04ReadConnector(origin,async()=>response({},status));expect((await c.readCanonical()).state).toBe('error');expect((await c.lookupReceipt(token,hash)).state).toBe('error');
});
it('missing server contract/owner metadata is not fabricated from GET/client',async()=>{
 for(const value of [{...accepted,ownerId:undefined},{...accepted,contractVersion:undefined}])expect((await createP04ReadConnector(origin,async()=>response(value)).lookupReceipt(token,hash)).state).toBe('error');
});
for(const value of [{status:'unknown',clientToken:token},{status:'unknown',observation:accepted}])it('missing or unconfirmed receipt holds unknown, not none',async()=>{
 const c=createP04ReadConnector(origin,async()=>response({contractVersion:RECEIPT_CONTRACT,ownerId:owner,...value}));expect((await c.lookupReceipt(token,hash)).state).toBe('unknown');
});
it('canonical token conflict409 is preserved',async()=>expect((await createP04ReadConnector(origin,async()=>response({...accepted,status:'conflict'},409)).lookupReceipt(token,hash)).state).toBe('conflict'));
it('migration-complete or mapping assertion absent from current service is rejected',async()=>{
 for(const value of [{...accepted,migrationComplete:true},{...accepted,migrationMappings:[]}])expect((await createP04ReadConnector(origin,async()=>response(value)).lookupReceipt(token,hash)).state).toBe('error');
});
it('cached or malformed/throwing response fails closed without error leakage',async()=>{
 for(const transport of [async()=>response(snapshot,200,'public, max-age=100'),async()=>new Response('bad json',{headers:{'cache-control':'no-store'}}),async()=>{throw Error('private-cookie-secret');}]){
  const c=createP04ReadConnector(origin,transport);expect((await c.readCanonical()).state).toBe('error');expect(JSON.stringify(await c.lookupReceipt(token,hash))).not.toContain('private-cookie');
 }
});
it('malformed token/hash stops before transport',async()=>{
 let calls=0;const c=createP04ReadConnector(origin,async()=>{calls++;return response(accepted);});
 expect((await c.lookupReceipt(token,'a'.repeat(64))).state).toBe('error');expect((await c.lookupReceipt(' padded ',hash)).state).toBe('error');expect(calls).toBe(0);
});
it('end-to-end connector plus injected binding/source returns blocked preview on accepted canonical receipt',async()=>{
 const connector=createP04ReadConnector(origin,async(_url,init)=>response(init?.method==='GET'?snapshot:accepted));
 const ports:CanonicalPorts={...connector,resolveBinding:async()=>({status:'ready',nativeUserId:owner,telegramId:'synthetic-tg',linkEpoch:'epoch1',accountBinding:'unresolved',accountRef:null}),readSource:async()=>({state:'ready',namespace:'mini5-synthetic',ownerTelegramId:'synthetic-tg',complete:true,rows:[]})};
 const r=await readCanonicalPreview(ports,{reviews:[],priorOperation:{clientToken:token,expectedCanonicalContentHash:hash}});expect(r.state).toBe('preview');expect(r.commitBlocked).toBe(true);
 if(r.state==='preview'){expect(r.receiptMatched).toBe(true);expect(r.preview.counts?.source).toBe(0);expect(r.blockers).toContain('legacy_writer_unchanged');}
});
