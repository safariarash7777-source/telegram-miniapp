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
