/**
 * Copying a consultation lead to the Portfolio platform.
 *
 * This is the Mini App half of the lead path:
 *
 *   Mini App form → MySQL (durable local receipt) → existing Telegram notification
 *                 → THIS → Portfolio /api/leads/webhook → Supabase `leads`
 *
 * Platform `leads` remains the canonical CRM record (ADR-003). Its copy uses
 * namespace + local receipt ID, so retry never creates a new case. Local
 * storage must commit first and failures remain visible/pending.
 *
 * Recorded as blockers `B-019` (fire-and-forget) and `B-020` (undocumented
 * env vars guaranteeing 401) in the Portfolio COMMAND-CENTER.
 */

/** How long we are willing to wait for the platform before giving up. */
const TIMEOUT_MS = 5000;

const DEFAULT_PLATFORM_URL = "https://portfolio-platform-fawn.vercel.app";

export type LeadPayload = {
  external_ref?: string;
  source: string;
  name: string;
  phone: string;
  topic: string;
  message: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  telegram_username: string | null;
  telegram_id: number | string | null;
};

export type CopyLeadResult =
  | { ok: true; status: number }
  | { ok: false; reason: "not_configured" | "timeout" | "network" | "rejected"; status?: number; detail?: string };

/**
 * Structured, greppable failure log.
 *
 * Never logs the lead's name, phone or message — a failed webhook is an
 * operational event, not a reason to spill personal data into logs. The phone
 * and Telegram ID are personal data; logs carry only the opaque receipt reference.
 */
function logFailure(result: Extract<CopyLeadResult, { ok: false }>, correlationId: string | undefined) {
  console.error(
    JSON.stringify({
      event: "lead_webhook_failed",
      reason: result.reason,
      status: result.status ?? null,
      detail: result.detail ?? null,
      correlation_id: correlationId ?? null,
      at: new Date().toISOString(),
    })
  );
}

export async function copyLeadToPlatform(payload: LeadPayload): Promise<CopyLeadResult> {
  const secret = process.env.PLATFORM_WEBHOOK_SECRET;
  const baseUrl = process.env.PLATFORM_WEBHOOK_URL || DEFAULT_PLATFORM_URL;
  if(payload.external_ref){
    try{const target=new URL(process.env.PLATFORM_WEBHOOK_URL||'');if(target.protocol!=='https:'||target.username||target.password||target.search||target.hash||target.pathname!=='/')throw new Error('invalid origin');}
    catch{const result={ok:false as const,reason:'not_configured' as const,detail:'Explicit HTTPS platform origin required'};logFailure(result,payload.external_ref);return result;}
  }

  // Previously this fell back to `|| ""`, which sent an empty secret header and
  // guaranteed a 401 that nobody could see (B-020). Failing loudly and early is
  // strictly better than a silent, permanent 401.
  if (!secret) {
    const result = { ok: false as const, reason: "not_configured" as const, detail: "PLATFORM_WEBHOOK_SECRET is not set" };
    logFailure(result, payload.external_ref);
    return result;
  }

  try {
    const attempts=payload.external_ref?3:1;
    let res: Response | undefined;
    for(let i=0;i<attempts;i++){
      try{
        res=await fetch(new URL('/api/leads/webhook',baseUrl).href,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','X-Webhook-Secret':secret},body:JSON.stringify(payload),signal:AbortSignal.timeout(TIMEOUT_MS)});
        if(res.ok || res.status<500 || i===attempts-1)break;
      }catch(e){if(i===attempts-1)throw e;}
    }
    if(!res)throw new Error('copy unavailable');
    if(!res.ok){const result={ok:false as const,reason:'rejected' as const,status:res.status,detail:'HTTP rejected'};logFailure(result,payload.external_ref);return result;}
    return {ok:true,status:res.status};
  } catch (e) {
    const isTimeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    const result = {
      ok: false as const,
      reason: isTimeout ? ("timeout" as const) : ("network" as const),
      detail: 'transport unavailable',
    };
    logFailure(result, payload.external_ref);
    return result;
  }
}
