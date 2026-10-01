export function leadCorrelationConfig(){
 const namespace=process.env.NEXT09_LEAD_NAMESPACE,first=Number(process.env.NEXT09_LEAD_FIRST_RECEIPT_ID);
 if(!namespace||!/^[a-z0-9][a-z0-9-]{0,35}$/.test(namespace)||!Number.isSafeInteger(first)||first<1)throw new Error('correlation not configured');
 return {namespace,first};
}
export function leadReference(id:number){const c=leadCorrelationConfig();if(!Number.isSafeInteger(id)||id<c.first)throw new Error('legacy receipt requires reconciliation');return c.namespace+':'+id;}
