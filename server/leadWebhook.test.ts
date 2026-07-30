import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { copyLeadToPlatform, type LeadPayload } from "./leadWebhook";

/**
 * Tests for the Portfolio lead copy (B-019 / B-020).
 *
 * The contract under test is deliberately narrow and defensive:
 *   - the local MySQL row is the authoritative lead and is already committed
 *     before this runs, so this function must NEVER throw;
 *   - every outcome must be *explicit*, because the original bug was that
 *     failures looked exactly like successes;
 *   - failure logs must never carry personal data or the secret.
 */

const PAYLOAD: LeadPayload = {
  source: "miniapp",
  name: "علی رضایی",
  phone: "09121234567",
  topic: "مشاوره سرمایه‌گذاری",
  message: "می‌خواهم دربارهٔ سبد بلندمدت صحبت کنم",
  preferred_date: "1405-05-10",
  preferred_time: "10:00",
  telegram_username: "alirezaei",
  telegram_id: 987654321,
};

const SECRET = "s3cr3t-value-that-must-never-be-logged";

let fetchMock: ReturnType<typeof vi.fn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

/** Everything written to console.error during a test, joined. */
const loggedText = () =>
  errorSpy.mock.calls.map((c) => c.map((a) => String(a)).join(" ")).join("\n");

beforeEach(() => {
  vi.stubEnv("PLATFORM_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("PLATFORM_WEBHOOK_URL", "https://platform.example");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  errorSpy.mockRestore();
});

// ── 1) Missing secret ───────────────────────────────────────────────────────

describe("missing webhook secret", () => {
  test("makes no outbound request at all", async () => {
    vi.stubEnv("PLATFORM_WEBHOOK_SECRET", "");
    await copyLeadToPlatform(PAYLOAD);
    // The old code sent an empty header and collected a guaranteed 401.
    // Not sending is strictly better: no wasted call, and the reason is explicit.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns an explicit operational result, not a silent success", async () => {
    vi.stubEnv("PLATFORM_WEBHOOK_SECRET", "");
    const result = await copyLeadToPlatform(PAYLOAD);
    expect(result).toEqual({
      ok: false,
      reason: "not_configured",
      detail: expect.stringContaining("PLATFORM_WEBHOOK_SECRET"),
    });
  });

  test("never throws — the local MySQL lead must survive", async () => {
    vi.stubEnv("PLATFORM_WEBHOOK_SECRET", "");
    await expect(copyLeadToPlatform(PAYLOAD)).resolves.toBeDefined();
  });
});

// ── 2) Success ──────────────────────────────────────────────────────────────

describe("successful response", () => {
  test("2xx is reported as ok with the status", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    await expect(copyLeadToPlatform(PAYLOAD)).resolves.toEqual({ ok: true, status: 200 });
  });

  test("sends the secret as a header and the payload as JSON body", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, text: async () => "" });
    await copyLeadToPlatform(PAYLOAD);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://platform.example/api/leads/webhook");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Webhook-Secret"]).toBe(SECRET);
    expect(JSON.parse(init.body)).toEqual(PAYLOAD);
  });

  test("logs nothing on success", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    await copyLeadToPlatform(PAYLOAD);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

// ── 3) Non-2xx ──────────────────────────────────────────────────────────────

describe("non-2xx response", () => {
  test("401 is a failure, not a success", async () => {
    // The original `.catch()` never saw this: a 401 is a *resolved* promise.
    // B-020 guaranteed 401s, and every one of them was logged as success.
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => "unauthorized" });
    const result = await copyLeadToPlatform(PAYLOAD);
    expect(result).toMatchObject({ ok: false, reason: "rejected", status: 401 });
  });

  test("500 is a failure too", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => "boom" });
    const result = await copyLeadToPlatform(PAYLOAD);
    expect(result).toMatchObject({ ok: false, reason: "rejected", status: 500 });
  });

  test("a huge response body is truncated, not logged whole", async () => {
    const huge = "x".repeat(5000);
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => huge });
    const result = await copyLeadToPlatform(PAYLOAD);
    if (result.ok) throw new Error("expected failure");
    expect(result.detail!.length).toBeLessThanOrEqual(200);
    expect(loggedText().length).toBeLessThan(1500);
  });

  test("an unreadable body does not turn a 4xx into a crash", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => {
        throw new Error("stream already consumed");
      },
    });
    const result = await copyLeadToPlatform(PAYLOAD);
    expect(result).toMatchObject({ ok: false, reason: "rejected", status: 403 });
  });
});

// ── 4) Timeout / abort / network ────────────────────────────────────────────

describe("timeout and network failure", () => {
  test("a timeout is classified as timeout, not as a generic error", async () => {
    const err = new Error("The operation was aborted due to timeout");
    err.name = "TimeoutError";
    fetchMock.mockRejectedValue(err);
    const result = await copyLeadToPlatform(PAYLOAD);
    expect(result).toMatchObject({ ok: false, reason: "timeout" });
  });

  test("an abort is also treated as a timeout", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    fetchMock.mockRejectedValue(err);
    expect(await copyLeadToPlatform(PAYLOAD)).toMatchObject({ ok: false, reason: "timeout" });
  });

  test("a plain network error is classified as network", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await copyLeadToPlatform(PAYLOAD)).toMatchObject({ ok: false, reason: "network" });
  });

  test("the request carries an abort signal so it cannot hang forever", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    await copyLeadToPlatform(PAYLOAD);
    expect(fetchMock.mock.calls[0][1].signal).toBeDefined();
  });

  test("never throws on any failure mode — the local lead must survive", async () => {
    for (const rejection of [
      Object.assign(new Error("t"), { name: "TimeoutError" }),
      new Error("ECONNREFUSED"),
    ]) {
      fetchMock.mockRejectedValue(rejection);
      await expect(copyLeadToPlatform(PAYLOAD)).resolves.toBeDefined();
    }
  });
});

// ── 5) Logs must not leak ───────────────────────────────────────────────────

describe("failure logs never leak personal data or the secret", () => {
  const failures: [string, () => void][] = [
    ["missing secret", () => vi.stubEnv("PLATFORM_WEBHOOK_SECRET", "")],
    [
      "rejected",
      () => fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => "no" }),
    ],
    ["network", () => fetchMock.mockRejectedValue(new Error("ECONNREFUSED"))],
    [
      "timeout",
      () => fetchMock.mockRejectedValue(Object.assign(new Error("t"), { name: "TimeoutError" })),
    ],
  ];

  for (const [label, arrange] of failures) {
    test(`${label}: no name, phone, message or secret in the log`, async () => {
      arrange();
      await copyLeadToPlatform(PAYLOAD);
      const logged = loggedText();
      expect(logged.length).toBeGreaterThan(0); // it must log *something*
      expect(logged).not.toContain(PAYLOAD.name);
      expect(logged).not.toContain(PAYLOAD.phone);
      expect(logged).not.toContain(PAYLOAD.message!);
      expect(logged).not.toContain(PAYLOAD.telegram_username!);
      expect(logged).not.toContain(SECRET);
    });
  }

  test("the log is machine-parseable and carries a correlation handle", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => "no" });
    await copyLeadToPlatform(PAYLOAD);
    const entry = JSON.parse(loggedText());
    expect(entry.event).toBe("lead_webhook_failed");
    expect(entry.reason).toBe("rejected");
    expect(entry.status).toBe(401);
    // The telegram id is the one handle an operator can correlate on without
    // any personal data being written.
    expect(entry.telegram_id).toBe(PAYLOAD.telegram_id);
    expect(typeof entry.at).toBe("string");
  });
});

// ── 6/7) One request, never duplicated ──────────────────────────────────────

describe("exactly one outbound request", () => {
  test("a success sends exactly one request", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    await copyLeadToPlatform(PAYLOAD);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("a failure is not retried inside this function", async () => {
    // Retry belongs to a durable outbox, which is deliberately out of scope.
    // A silent in-function retry would double-post leads on a slow platform.
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => "boom" });
    await copyLeadToPlatform(PAYLOAD);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("a timeout is not retried either", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("t"), { name: "TimeoutError" }));
    await copyLeadToPlatform(PAYLOAD);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ── Config ──────────────────────────────────────────────────────────────────

test("falls back to the production Portfolio URL when PLATFORM_WEBHOOK_URL is unset", async () => {
  vi.stubEnv("PLATFORM_WEBHOOK_URL", "");
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "" });
  await copyLeadToPlatform(PAYLOAD);
  expect(String(fetchMock.mock.calls[0][0])).toContain("/api/leads/webhook");
});
