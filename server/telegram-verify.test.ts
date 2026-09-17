import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyTelegramInitData, parseTelegramUser, isInitDataExpired } from "./telegram-verify";

const BOT_TOKEN = "12345:TEST-TOKEN";

/** Build a validly-signed initData string the way Telegram does. */
function buildSignedInitData(user: object, authDate = Math.floor(Date.now() / 1000)): string {
  const params = new URLSearchParams();
  params.set("user", JSON.stringify(user));
  params.set("auth_date", String(authDate));
  params.set("query_id", "AAABBBCCC");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("verifyTelegramInitData", () => {
  const user = { id: 111111111, first_name: "کاربر", username: "user_a" };

  it("accepts correctly signed initData", () => {
    const initData = buildSignedInitData(user);
    expect(verifyTelegramInitData(initData, BOT_TOKEN)).toBe(true);
  });

  it("rejects initData signed with a different bot token", () => {
    const initData = buildSignedInitData(user);
    expect(verifyTelegramInitData(initData, "999:OTHER-TOKEN")).toBe(false);
  });

  it("rejects tampered initData (changed user id)", () => {
    const initData = buildSignedInitData(user);
    const tampered = initData.replace("111111111", "222222222");
    expect(verifyTelegramInitData(tampered, BOT_TOKEN)).toBe(false);
  });

  it("rejects garbage hashes without throwing", () => {
    expect(verifyTelegramInitData("user=x&auth_date=1&hash=zz", BOT_TOKEN)).toBe(false);
    expect(verifyTelegramInitData("", BOT_TOKEN)).toBe(false);
    expect(verifyTelegramInitData("user=x", BOT_TOKEN)).toBe(false);
  });

  it("parses the user payload", () => {
    const initData = buildSignedInitData(user);
    const parsed = parseTelegramUser(initData);
    expect(parsed).toMatchObject({ id: 111111111, first_name: "کاربر" });
  });

  it("flags expired initData", () => {
    const fresh = buildSignedInitData(user);
    expect(isInitDataExpired(fresh)).toBe(false);

    const stale = buildSignedInitData(user, Math.floor(Date.now() / 1000) - 7200);
    expect(isInitDataExpired(stale)).toBe(true); // default window is 1h
  });
});

describe("parseTelegramUser — percent signs in names", () => {
  // Reproduced against the real code: URLSearchParams.get already decodes, so
  // the extra decodeURIComponent threw URIError on a trailing "%" (login
  // returned null) and silently rewrote "100%41" to "100A".
  it("keeps a trailing percent sign instead of failing the login", () => {
    const initData = buildSignedInitData({ id: 5, first_name: "100%" });
    const parsed = parseTelegramUser(initData);
    expect(parsed).not.toBeNull();
    expect(parsed!.first_name).toBe("100%");
  });

  it("does not re-decode a percent escape inside a name", () => {
    const initData = buildSignedInitData({ id: 6, first_name: "100%41" });
    expect(parseTelegramUser(initData)!.first_name).toBe("100%41");
  });

  it("keeps other characters that survive one decode round", () => {
    const initData = buildSignedInitData({ id: 7, first_name: "a+b &c", username: "u_%20" });
    const parsed = parseTelegramUser(initData)!;
    expect(parsed.first_name).toBe("a+b &c");
    expect(parsed.username).toBe("u_%20");
  });

  it("still reads ordinary Persian names", () => {
    const initData = buildSignedInitData({ id: 8, first_name: "آرش" });
    expect(parseTelegramUser(initData)!.first_name).toBe("آرش");
  });
});

describe("isInitDataExpired — invalid and future timestamps", () => {
  it("treats a non-numeric auth_date as expired", () => {
    // parseInt("abc") is NaN and NaN > limit is false, so this used to pass.
    expect(isInitDataExpired("user=%7B%7D&auth_date=abc&hash=x")).toBe(true);
  });

  it("treats an empty auth_date as expired", () => {
    expect(isInitDataExpired("user=%7B%7D&auth_date=&hash=x")).toBe(true);
  });

  it("treats a far-future auth_date as expired", () => {
    const future = Math.floor(Date.now() / 1000) + 86400 * 365;
    expect(isInitDataExpired(`user=%7B%7D&auth_date=${future}&hash=x`)).toBe(true);
  });

  it("treats a zero or negative auth_date as expired", () => {
    expect(isInitDataExpired("user=%7B%7D&auth_date=0&hash=x")).toBe(true);
    expect(isInitDataExpired("user=%7B%7D&auth_date=-100&hash=x")).toBe(true);
  });

  it("tolerates small clock skew", () => {
    const slightlyAhead = Math.floor(Date.now() / 1000) + 60;
    expect(isInitDataExpired(`user=%7B%7D&auth_date=${slightlyAhead}&hash=x`)).toBe(false);
  });

  it("still accepts a fresh timestamp and rejects an old one", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isInitDataExpired(`user=%7B%7D&auth_date=${now}&hash=x`)).toBe(false);
    expect(isInitDataExpired(`user=%7B%7D&auth_date=${now - 7200}&hash=x`)).toBe(true);
  });
});
