/**
 * Price Service — fetches live Iranian market prices from TGJU
 * with in-memory caching to avoid rate-limiting.
 *
 * Symbols used (each fetched individually with ?draw=1&start=0&length=1):
 *   geram18       → طلای ۱۸ عیار (ریال/گرم)
 *   price_dollar_rl → دلار آمریکا (ریال)
 *   price_eur     → یورو (ریال)
 *   ons           → اونس جهانی طلا (دلار)
 *
 * Coin prices (سکه امامی، نیم‌سکه، ربع‌سکه) are derived from
 * gold price + standard formulas since TGJU blocks those symbols
 * from server-side requests.
 *
 * Cache TTL: 5 minutes to avoid rate-limiting.
 */

export interface PriceItem {
  price: number;       // numeric value in original currency
  change: number;      // absolute change
  changePercent: number; // percentage change
  isUp: boolean;
}

export interface MarketPrices {
  gold18: PriceItem;       // طلای ۱۸ عیار — ریال/گرم
  usd: PriceItem;          // دلار — ریال
  eur: PriceItem;          // یورو — ریال
  goldOunce: PriceItem;    // اونس جهانی — دلار
  coinEmami: PriceItem;    // سکه امامی — ریال (derived)
  coinHalf: PriceItem;     // نیم‌سکه — ریال (derived)
  coinQuarter: PriceItem;  // ربع‌سکه — ریال (derived)
  updatedAt: string;
  source: "live" | "fallback" | "cached";
}

// ── In-memory cache ──────────────────────────────────────────────────────────
let _cache: MarketPrices | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── TGJU fetch helper ────────────────────────────────────────────────────────
async function fetchTgjuSymbol(symbol: string): Promise<PriceItem | null> {
  try {
    const url = `https://api.tgju.org/v1/market/indicator/summary-table-data/${symbol}?draw=1&start=0&length=1`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ArashSafariBot/1.0)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[Prices] TGJU ${symbol} HTTP ${res.status}`);
      return null;
    }

    const data = await res.json() as { data?: string[][] };
    const row = data?.data?.[0];
    if (!row || row.length < 6) return null;

    // row[3] = close/current price (most recent)
    // row[4] = change (HTML with class high/low)
    // row[5] = change percent (HTML)
    const priceStr = row[3]?.replace(/,/g, "") ?? "0";
    const changeHtml = row[4] ?? "";
    const pctHtml = row[5] ?? "";

    const price = parseFloat(priceStr) || 0;
    const isUp = changeHtml.includes("high");
    const changeRaw = changeHtml.replace(/<[^>]+>/g, "").replace(/,/g, "").trim();
    const pctRaw = pctHtml.replace(/<[^>]+>/g, "").replace("%", "").trim();

    const change = (isUp ? 1 : -1) * (parseFloat(changeRaw) || 0);
    const changePercent = (isUp ? 1 : -1) * (parseFloat(pctRaw) || 0);

    return { price, change, changePercent, isUp };
  } catch (err) {
    console.warn(`[Prices] TGJU ${symbol} error:`, err);
    return null;
  }
}

// ── Delay helper ─────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Coin derivation ──────────────────────────────────────────────────────────
// Standard Iranian market formulas:
// سکه امامی ≈ ۸.۱۳۳ گرم طلای ۲۴ عیار × قیمت اونس × نرخ دلار + حباب (~۱۵٪)
// But since we don't have exact coin API, we use approximate multipliers
// based on gold 18k price:
//   سکه امامی ≈ gold18 × 8.133 × (24/18) × 1.15  ≈ gold18 × 12.4
//   نیم‌سکه   ≈ gold18 × 4.0
//   ربع‌سکه   ≈ gold18 × 2.2
function deriveCoinPrices(gold18: PriceItem): {
  coinEmami: PriceItem;
  coinHalf: PriceItem;
  coinQuarter: PriceItem;
} {
  const emamiPrice = Math.round(gold18.price * 12.4);
  const halfPrice = Math.round(gold18.price * 4.0);
  const quarterPrice = Math.round(gold18.price * 2.2);

  const emamiChange = Math.round(gold18.change * 12.4);
  const halfChange = Math.round(gold18.change * 4.0);
  const quarterChange = Math.round(gold18.change * 2.2);

  return {
    coinEmami: {
      price: emamiPrice,
      change: emamiChange,
      changePercent: gold18.changePercent,
      isUp: gold18.isUp,
    },
    coinHalf: {
      price: halfPrice,
      change: halfChange,
      changePercent: gold18.changePercent,
      isUp: gold18.isUp,
    },
    coinQuarter: {
      price: quarterPrice,
      change: quarterChange,
      changePercent: gold18.changePercent,
      isUp: gold18.isUp,
    },
  };
}

// ── Fallback data ─────────────────────────────────────────────────────────────
function getFallback(): MarketPrices {
  const gold18: PriceItem = { price: 174627000, change: 2057000, changePercent: 1.19, isUp: true };
  return {
    gold18,
    usd: { price: 1753950, change: 10950, changePercent: 0.63, isUp: true },
    eur: { price: 2007600, change: 23100, changePercent: 1.16, isUp: true },
    goldOunce: { price: 4175.38, change: 52.06, changePercent: 1.26, isUp: true },
    ...deriveCoinPrices(gold18),
    updatedAt: new Date().toISOString(),
    source: "fallback",
  };
}

// ── Main fetch function ───────────────────────────────────────────────────────
export async function getLivePrices(): Promise<MarketPrices> {
  // Return cache if fresh
  if (_cache && Date.now() - _cacheTime < CACHE_TTL_MS) {
    return { ..._cache, source: "cached" };
  }

  console.log("[Prices] Fetching live prices from TGJU...");

  // Fetch sequentially with small delays to avoid rate-limiting
  const gold18 = await fetchTgjuSymbol("geram18");
  await delay(500);
  const usd = await fetchTgjuSymbol("price_dollar_rl");
  await delay(500);
  const eur = await fetchTgjuSymbol("price_eur");
  await delay(500);
  const goldOunce = await fetchTgjuSymbol("ons");

  // If we got at least gold and USD, consider it a success
  if (gold18 && usd) {
    const coins = deriveCoinPrices(gold18);
    const result: MarketPrices = {
      gold18,
      usd,
      eur: eur ?? { price: 2007600, change: 0, changePercent: 0, isUp: true },
      goldOunce: goldOunce ?? { price: 4175, change: 0, changePercent: 0, isUp: true },
      ...coins,
      updatedAt: new Date().toISOString(),
      source: "live",
    };

    _cache = result;
    _cacheTime = Date.now();
    console.log("[Prices] Live prices fetched successfully");
    return result;
  }

  // Use cache if available (even if stale)
  if (_cache) {
    console.warn("[Prices] Using stale cache");
    return { ..._cache, source: "cached" };
  }

  // Last resort: fallback
  console.warn("[Prices] Using fallback prices");
  return getFallback();
}
