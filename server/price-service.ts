/**
 * Price Service — fetches live Iranian market prices
 *
 * Sources (in priority order):
 * 1. @tala_hajiabdollahi Telegram channel → طلای ۱۸ عیار، سکه (FREE scraping)
 * 2. TGJU API → دلار، یورو، اونس جهانی
 * 3. Fallback static data (last known prices)
 *
 * Cache TTL: 5 minutes
 */

import { getCachedChannelPrices } from './channel-scraper.js';

export interface PriceItem {
  price: number;       // numeric value in original currency
  change: number;      // absolute change
  changePercent: number; // percentage change
  isUp: boolean;
  source?: string;     // data source label
}

export interface MarketPrices {
  gold18: PriceItem;       // طلای ۱۸ عیار — تومان/گرم
  usd: PriceItem;          // دلار — تومان
  eur: PriceItem;          // یورو — تومان
  goldOunce: PriceItem;    // اونس جهانی — دلار
  coinEmami: PriceItem;    // سکه امامی — تومان
  coinHalf: PriceItem;     // نیم‌سکه — تومان
  coinQuarter: PriceItem;  // ربع‌سکه — تومان
  coinPahlavi: PriceItem;  // تمام پهلوی — تومان
  abshode: PriceItem;      // آبشده — تومان
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

    const priceStr = row[3]?.replace(/,/g, "") ?? "0";
    const changeHtml = row[4] ?? "";
    const pctHtml = row[5] ?? "";

    const price = parseFloat(priceStr) || 0;
    const isUp = changeHtml.includes("high");
    const changeRaw = changeHtml.replace(/<[^>]+>/g, "").replace(/,/g, "").trim();
    const pctRaw = pctHtml.replace(/<[^>]+>/g, "").replace("%", "").trim();

    const change = (isUp ? 1 : -1) * (parseFloat(changeRaw) || 0);
    const changePercent = (isUp ? 1 : -1) * (parseFloat(pctRaw) || 0);

    return { price, change, changePercent, isUp, source: 'tgju' };
  } catch (err) {
    console.warn(`[Prices] TGJU ${symbol} error:`, err);
    return null;
  }
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Coin derivation from gold price ─────────────────────────────────────────
// Used as fallback when channel scraping fails
function deriveCoinPrices(gold18Tomans: number, gold18Change: number, isUp: boolean): {
  coinEmami: PriceItem;
  coinHalf: PriceItem;
  coinQuarter: PriceItem;
  coinPahlavi: PriceItem;
} {
  // Approximate multipliers based on gold 18k price in tomans
  return {
    coinEmami: {
      price: Math.round(gold18Tomans * 12.4),
      change: Math.round(gold18Change * 12.4),
      changePercent: 0,
      isUp,
      source: 'derived',
    },
    coinHalf: {
      price: Math.round(gold18Tomans * 5.0),
      change: Math.round(gold18Change * 5.0),
      changePercent: 0,
      isUp,
      source: 'derived',
    },
    coinQuarter: {
      price: Math.round(gold18Tomans * 2.6),
      change: Math.round(gold18Change * 2.6),
      changePercent: 0,
      isUp,
      source: 'derived',
    },
    coinPahlavi: {
      price: Math.round(gold18Tomans * 10.0),
      change: Math.round(gold18Change * 10.0),
      changePercent: 0,
      isUp,
      source: 'derived',
    },
  };
}

// ── Fallback data ─────────────────────────────────────────────────────────────
function getFallback(): MarketPrices {
  const gold18Tomans = 17678000; // تومان/گرم
  const coins = deriveCoinPrices(gold18Tomans, 0, true);
  return {
    gold18: { price: gold18Tomans, change: 0, changePercent: 0, isUp: true, source: 'fallback' },
    usd: { price: 98500, change: 0, changePercent: 0, isUp: true, source: 'fallback' },
    eur: { price: 112800, change: 0, changePercent: 0, isUp: true, source: 'fallback' },
    goldOunce: { price: 3350, change: 0, changePercent: 0, isUp: true, source: 'fallback' },
    abshode: { price: 76490000, change: 0, changePercent: 0, isUp: true, source: 'fallback' },
    ...coins,
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

  console.log("[Prices] Fetching live prices...");

  // 1. Try Telegram channel scraping for gold & coins
  const channelPrices = await getCachedChannelPrices();
  const channelMap = new Map(channelPrices.map(p => [p.item, p]));

  // 2. Fetch TGJU for dollar, euro, ounce (sequential with delays)
  const usd = await fetchTgjuSymbol("price_dollar_rl");
  await delay(400);
  const eur = await fetchTgjuSymbol("price_eur");
  await delay(400);
  const goldOunce = await fetchTgjuSymbol("ons");

  // 3. Build gold18 from channel or TGJU
  let gold18: PriceItem | null = null;

  const channelGold = channelMap.get('gold18');
  if (channelGold?.sell) {
    // Channel gives price in tomans, convert to consistent unit
    const sellTomans = channelGold.sell;
    const buyTomans = channelGold.buy ?? sellTomans;
    const avgTomans = Math.round((sellTomans + buyTomans) / 2);
    gold18 = {
      price: avgTomans,
      change: 0,
      changePercent: 0,
      isUp: true,
      source: '@tala_hajiabdollahi',
    };
  } else {
    // Fallback to TGJU (returns in rials, convert to tomans)
    const tgjuGold = await fetchTgjuSymbol("geram18");
    if (tgjuGold) {
      gold18 = {
        ...tgjuGold,
        price: Math.round(tgjuGold.price / 10), // ریال → تومان
        change: Math.round(tgjuGold.change / 10),
        source: 'tgju',
      };
    }
  }

  // 4. Build coin prices from channel or derive from gold
  let coinEmami: PriceItem;
  let coinHalf: PriceItem;
  let coinQuarter: PriceItem;
  let coinPahlavi: PriceItem;
  let abshode: PriceItem;

  const channelHalf = channelMap.get('halfCoin');
  const channelQuarter = channelMap.get('quarterCoin');
  const channelPahlavi = channelMap.get('pahlaviCoin');
  const channelAbshode = channelMap.get('abshode');

  if (channelHalf?.sell && channelQuarter?.sell && channelPahlavi?.sell) {
    // Use channel data directly (in tomans)
    const halfAvg = Math.round(((channelHalf.sell ?? 0) + (channelHalf.buy ?? channelHalf.sell ?? 0)) / 2);
    const quarterAvg = Math.round(((channelQuarter.sell ?? 0) + (channelQuarter.buy ?? channelQuarter.sell ?? 0)) / 2);
    const pahlaviAvg = Math.round(((channelPahlavi.sell ?? 0) + (channelPahlavi.buy ?? channelPahlavi.sell ?? 0)) / 2);

    coinHalf = { price: halfAvg, change: 0, changePercent: 0, isUp: true, source: '@tala_hajiabdollahi' };
    coinQuarter = { price: quarterAvg, change: 0, changePercent: 0, isUp: true, source: '@tala_hajiabdollahi' };
    coinPahlavi = { price: pahlaviAvg, change: 0, changePercent: 0, isUp: true, source: '@tala_hajiabdollahi' };
    // Emami coin ≈ 2 × full Pahlavi (approximate)
    coinEmami = { price: Math.round(pahlaviAvg * 1.05), change: 0, changePercent: 0, isUp: true, source: 'derived' };
  } else if (gold18) {
    const derived = deriveCoinPrices(gold18.price, gold18.change, gold18.isUp);
    coinEmami = derived.coinEmami;
    coinHalf = derived.coinHalf;
    coinQuarter = derived.coinQuarter;
    coinPahlavi = derived.coinPahlavi;
  } else {
    const fallback = getFallback();
    coinEmami = fallback.coinEmami;
    coinHalf = fallback.coinHalf;
    coinQuarter = fallback.coinQuarter;
    coinPahlavi = fallback.coinPahlavi;
  }

  if (channelAbshode?.sell) {
    const abshodeAvg = Math.round(((channelAbshode.sell ?? 0) + (channelAbshode.buy ?? channelAbshode.sell ?? 0)) / 2);
    abshode = { price: abshodeAvg, change: 0, changePercent: 0, isUp: true, source: '@tala_hajiabdollahi' };
  } else if (gold18) {
    abshode = { price: Math.round(gold18.price * 4.33), change: 0, changePercent: 0, isUp: true, source: 'derived' };
  } else {
    abshode = getFallback().abshode;
  }

  // 5. Build final USD price (TGJU returns in rials, convert to tomans)
  const usdTomans = usd
    ? { ...usd, price: Math.round(usd.price / 10), change: Math.round(usd.change / 10), source: 'tgju' }
    : getFallback().usd;

  const eurTomans = eur
    ? { ...eur, price: Math.round(eur.price / 10), change: Math.round(eur.change / 10), source: 'tgju' }
    : getFallback().eur;

  const ounce = goldOunce ?? getFallback().goldOunce;

  const finalGold18 = gold18 ?? getFallback().gold18;

  const result: MarketPrices = {
    gold18: finalGold18,
    usd: usdTomans,
    eur: eurTomans,
    goldOunce: ounce,
    coinEmami,
    coinHalf,
    coinQuarter,
    coinPahlavi,
    abshode,
    updatedAt: new Date().toISOString(),
    source: (gold18 || usd) ? "live" : "fallback",
  };

  _cache = result;
  _cacheTime = Date.now();
  console.log(`[Prices] Prices updated — source: ${result.source}, gold18: ${finalGold18.price} تومان`);
  return result;
}
