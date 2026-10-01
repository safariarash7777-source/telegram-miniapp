import {createHmac} from 'node:crypto';
export const connectionToken=/^[a-f0-9]{64}$/;
export function signConnection(secret:string,time:string,body:string){return createHmac('sha256',secret).update('notifications.v1\n'+time+'\n'+body).digest('hex');}
export async function provePlatformConnection(token:string,verifiedTelegramId:string,transport:typeof fetch=fetch){
 if(process.env.NEXT09_ENABLED!=='true')throw new Error('اتصال هنوز فعال نشده است.');
 if(!connectionToken.test(token)||!/^[1-9][0-9]{0,15}$/.test(verifiedTelegramId))throw new Error('کد اتصال معتبر نیست.');
 const secret=process.env.NEXT09_BRIDGE_SECRET,raw=process.env.NEXT09_PLATFORM_ORIGIN;
 if(!secret||secret.length<32||!raw)throw new Error('تنظیم اتصال آماده نیست.');
 const base=new URL(raw);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw new Error('تنظیم اتصال آماده نیست.');
 const body=JSON.stringify({contractVersion:'notifications.v1',token,telegramId:verifiedTelegramId}),time=String(Date.now());
 const res=await transport(new URL('/api/telegram/connection-proof',base),{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-next09-time':time,'x-next09-signature':signConnection(secret,time,body)},body,signal:AbortSignal.timeout(5000)});
 if(!res.ok)throw new Error('اثبات اتصال انجام نشد؛ کد تازه از سایت بگیرید.');
 const b=await res.json();if(b.contractVersion!=='notifications.v1'||!connectionToken.test(b.confirmation))throw new Error('پاسخ اتصال معتبر نیست.');
 return {confirmation:b.confirmation as string,status:'site_confirmation_required' as const};
}
export function privateConnectionUpdate(message:{from?:{id?:number;is_bot?:boolean};chat?:{id?:number;type?:string}}){return message.chat?.type==='private'&&Number.isSafeInteger(message.from?.id)&&Number(message.from?.id)>0&&message.from?.is_bot!==true&&message.chat.id===message.from?.id;}
