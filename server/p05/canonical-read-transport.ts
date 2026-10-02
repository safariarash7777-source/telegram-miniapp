import {READ_CONTRACT,RECEIPT_CONTRACT,type CanonicalPorts,type CanonicalRead,type ReceiptRead} from './canonical-adapter';

/** Requires a caller-supplied owner-native read transport; no credentials/default fetch. */
export function createP04ReadConnector(approvedOrigin:string,ownerReadTransport:typeof fetch):Pick<CanonicalPorts,'readCanonical'|'lookupReceipt'> {
  const origin=new URL(approvedOrigin);
  if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('approved_canonical_origin_required');
  const unavailable=():ReceiptRead=>({contractVersion:RECEIPT_CONTRACT,state:'error'});
  return {
    async readCanonical(){
      try{
        const response=await ownerReadTransport(new URL('/api/portfolio/holdings',origin),{method:'GET',redirect:'error',cache:'no-store',headers:{accept:'application/json'},signal:AbortSignal.timeout(5000)});
        if(!response.ok||!response.headers.get('cache-control')?.includes('no-store'))return {contractVersion:READ_CONTRACT,state:'error'};
        const value=await response.json();
        if(!value||value.contractVersion!==READ_CONTRACT||!['ready','empty'].includes(value.state)||typeof value.ownerId!=='string'||!Array.isArray(value.positions)||!Array.isArray(value.debts)||!Array.isArray(value.supportedAssetClasses))return {contractVersion:READ_CONTRACT,state:'error'};
        // The orchestrator validates owner/version/identities/finite payload and binding.
        return value as CanonicalRead;
      }catch{return {contractVersion:READ_CONTRACT,state:'error'};}
    },
    async lookupReceipt(clientToken,expectedCanonicalContentHash){
      if(!clientToken||clientToken.length>200||clientToken!==clientToken.trim()||!/^[a-f0-9]{32}$/.test(expectedCanonicalContentHash))return unavailable();
      try{
        const response=await ownerReadTransport(new URL('/api/portfolio/holdings/receipt',origin),{method:'POST',redirect:'error',cache:'no-store',headers:{'content-type':'application/json',accept:'application/json',origin:origin.origin},body:JSON.stringify({client_token:clientToken,expectedCanonicalContentHash}),signal:AbortSignal.timeout(5000)});
        if((!response.ok&&response.status!==409)||!response.headers.get('cache-control')?.includes('no-store'))return unavailable();
        const value=await response.json();
        if(!value||value.contractVersion!==RECEIPT_CONTRACT||typeof value.ownerId!=='string')return unavailable();
        // Missing row/token-only lookup is unknown. No pending ledger is invented.
        if(value.status==='unknown'||value.status==='conflict')return {contractVersion:RECEIPT_CONTRACT,state:value.status,ownerId:value.ownerId};
        if(response.ok&&value.status==='accepted'&&value.migrationComplete===false&&value.migrationMappings===null&&typeof value.clientToken==='string'&&typeof value.canonicalContentHash==='string'&&value.canonicalVersion){
          return {contractVersion:RECEIPT_CONTRACT,state:'accepted',ownerId:value.ownerId,clientToken:value.clientToken,canonicalContentHash:value.canonicalContentHash,createdVersion:value.canonicalVersion};
        }
        return unavailable();
      }catch{return unavailable();}
    },
  };
}
