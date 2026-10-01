import {useState} from 'react';
import {Link} from 'wouter';
export default function PlatformConnection(){
 const [token,setToken]=useState(''),[confirmation,setConfirmation]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <main className="max-w-lg mx-auto p-6 space-y-5"><Link href="/profile">بازگشت به حساب</Link><h1 className="text-2xl font-bold">اتصال به حساب سایت</h1><p>ابتدا در سایت وارد شوید و اتصال را آغاز کنید. فرمان اتصال را اینجا وارد کنید؛ سپس کد تأیید را در همان نشست سایت بنویسید.</p>
 <form className="space-y-4" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/platform-connection/prove',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});const b=await r.json();if(!r.ok)throw new Error(b.error);setConfirmation(b.confirmation);setToken('');}catch(e){setError(e instanceof Error?e.message:'اتصال انجام نشد.');}finally{setBusy(false);}}}>
 <label htmlFor="platform-token" className="block">فرمان اتصال سایت</label><input id="platform-token" dir="ltr" autoComplete="off" className="w-full rounded-lg border p-3" value={token} onChange={e=>setToken(e.target.value)} required/>
 <button type="submit" disabled={busy} className="min-h-11 rounded-lg border px-5 py-3">{busy?'در حال بررسی…':'تأیید سمت تلگرام'}</button></form>
 {error&&<p role="alert">{error}</p>}{confirmation&&<section className="space-y-3"><p>هنوز اتصال نهایی یا رضایت اعلان ثبت نشده است. این کد را فقط در صفحه‌ای از سایت وارد کنید که خودتان اتصال را آغاز کردید.</p><label htmlFor="platform-confirmation">کد تأیید</label><textarea id="platform-confirmation" dir="ltr" readOnly className="w-full rounded-lg border p-3 break-all" value={confirmation}/></section>}
 </main>;
}
