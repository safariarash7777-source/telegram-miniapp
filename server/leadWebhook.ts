/**
 * Copying a consultation lead to the Portfolio platform.
 *
 * This is the Mini App half of the lead path:
 *
 *   Mini App form → MySQL (local, authoritative) → Telegram notification
 *                 → THIS → Portfolio /api/leads/webhook → Supabase `leads`
 *
 * Design rule: **the local MySQL row is the lead.** The platform copy is a
 * convenience for the admin workflow. So nothing here is allowed to throw,
 * and the caller must already have committed the local row before calling.
 *
 * Recorded as blockers `B-019` (fire-and-forget) and `B-020` (undocumented
 * env vars guaranteeing 401) in the Portfolio COMMAND-CENTER.
 */

/** How long we are willing to wait for the platform before giving up. */
const TIMEOUT_MS = 5000;

const DEFAULT_PLATFORM_URL = "https://portfolio-platform-fawn.vercel.app";

export type LeadPayload = {
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
 * is the one field an operator might want, and it is exactly the field we must
 * not write, so the correlation handle is the telegram id instead.
 */
function logFailure(result: Extract<CopyLeadResult, { ok: false }>, telegramId: LeadPayload["telegram_id"]) {
  console.error(
    JSON.stringify({
      event: "lead_webhook_failed",
      reason: result.reason,
      status: result.status ?? null,
      detail: result.detail ?? null,
      telegram_id: telegramId ?? null,
      at: new Date().toISOString(),
    })
  );
}

export async function copyLeadToPlatform(payload: LeadPayload): Promise<CopyLeadResult> {
  const secret = process.env.PLATFORM_WEBHOOK_SECRET;
  const baseUrl = process.env.PLATFORM_WEBHOOK_URL || DEFAULT_PLATFORM_URL;

  // Previously this fell back to `|| ""`, which sent an empty secret header and
  // guaranteed a 401 that nobody could see (B-020). Failing loudly and early is
  // strictly better than a silent, permanent 401.
  if (!secret) {
    const result = { ok: false as const, reason: "not_configured" as const, detail: "PLATFORM_WEBHOOK_SECRET is not set" };
    logFailure(result, payload.telegram_id);
    return result;
  }

  try {
    const res = await fetch(`${baseUrl}/api/leads/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": secret,
      },
      body: JSON.stringify(payload),
      // Bounded wait. Without this a hung platform keeps the handler alive
      // until the runtime kills it, taking the whole request with it.
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    // A 401 or 500 is a *resolved* promise. The old `.catch()` never saw them,
    // so every rejected lead was logged as a success.
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const result = {
        ok: false as const,
        reason: "rejected" as const,
        status: res.status,
        detail: body.slice(0, 200),
      };
      logFailure(result, payload.telegram_id);
      return result;
    }

    return { ok: true, status: res.status };
  } catch (e) {
    const isTimeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    const result = {
      ok: false as const,
      reason: isTimeout ? ("timeout" as const) : ("network" as const),
      detail: e instanceof Error ? e.message : String(e),
    };
    logFailure(result, payload.telegram_id);
    return result;
  }
}
