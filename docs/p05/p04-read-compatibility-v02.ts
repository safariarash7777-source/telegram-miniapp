/** Executes actual P04 read handlers through P05's connector with injected DB/fetch mocks. */
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import p04 from '../../../portfolio-p04-canonical-20261002/lib/portfolio/financialReadHttp';
import {createP04ReadConnector} from '../../server/p05/canonical-read-transport';
import {readCanonicalPreview} from '../../server/p05/canonical-adapter';
const owner='synthetic-site-A',token='synthetic-operation-1',hash='a'.repeat(32),version={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',version:4};
const positions=[{position_key:'site-existing',symbol:null,manual_label:'نمونه سایت',asset_class:'equity_ir',qty:7,unit:'سهم',cost_basis:null,as_of:'2026-10-02',title:null,ownership_pct:50,valuation_mode:'unpriced',declared_value:null,valuation_source:null,valuation_as_of:null,valuation_status:'missing'}];
const debts=[{debt_key:'debt1',title:'نمونه بدهی',kind:'personal',balance_toman:99,currency:'IRT',balance_as_of:'2026-10-02',next_installment_toman:null,next_due_on:null,note:null}];
const db={authenticate:async()=>({user:{id:owner},error:false}),version:async(userId:string,lookup:{token?:string})=>{assert.equal(userId,owner);return lookup.token==='absent'?null:{...version,user_id:owner,content_hash:hash,note:null};},positions:async()=>positions,debts:async()=>debts};
let requests=0;
const connector=createP04ReadConnector('https://synthetic.invalid',async(url,init)=>{
 requests++;if(init?.method==='GET')return p04.getFinancialSnapshot(undefined,async()=>db);
 assert.equal(new URL(String(url)).pathname,'/api/portfolio/holdings/receipt');
 return p04.lookupFinancialReceipt(new Request(String(url),init),async()=>db);
});
const snapshot=await connector.readCanonical();assert.equal(snapshot.state,'ready');if(snapshot.state!=='error'){assert.equal(snapshot.ownerId,owner);assert.equal(snapshot.version?.id,version.id);assert.equal(snapshot.positions.length,1);assert.equal(snapshot.debts.length,1);}
const receipt=await connector.lookupReceipt(token,hash);assert.equal(receipt.state,'accepted');if(receipt.state==='accepted'){assert.equal(receipt.ownerId,owner);assert.deepEqual(receipt.createdVersion,version);assert.equal(receipt.migrationMappings,undefined);}
assert.equal((await connector.lookupReceipt('absent',hash)).state,'unknown');
assert.equal((await connector.lookupReceipt(token,'b'.repeat(32))).state,'conflict');
const result=await readCanonicalPreview({...connector,resolveBinding:async()=>({status:'ready',nativeUserId:owner,telegramId:'synthetic-tg-A',linkEpoch:'epoch1',accountBinding:'unresolved',accountRef:null}),readSource:async()=>({state:'ready',namespace:'mini5-synthetic',ownerTelegramId:'synthetic-tg-A',complete:true,rows:[]})},{reviews:[],priorOperation:{clientToken:token,expectedCanonicalContentHash:hash}});
assert.equal(result.state,'preview');assert.equal(result.commitBlocked,true);if(result.state==='preview'){assert.equal(result.receiptMatched,true);assert.equal(result.preview.counts?.canonicalRetained,1);assert.equal(result.preview.counts?.source,0);}
const ownerSourceHash=createHash('sha256').update(readFileSync(new URL('../../../portfolio-p04-canonical-20261002/lib/portfolio/financialReadHttp.ts',import.meta.url))).digest('hex');
writeFileSync(new URL('./p04-read-compatibility-v02.json',import.meta.url),JSON.stringify({syntheticOnly:true,ownerSourceHash,requests,nativeAuth:false,databaseConnected:false,realHTTP:false,checks:['GET full positions/debts owner version','accepted token/hash createdVersion','missing receipt unknown','content conflict preserved','adapter commit blocked and canonical retained'],result},null,2)+'\n');
console.log('PASS: 5 P04/P05 read-handler compatibility checks with mock DB/HTTP, owner metadata and separate MD5/context hashes. No native/SQL/live/network acceptance.');
