/**
 * Telegram Channel Scraper
 * Scrapes public Telegram channel preview pages (t.me/s/CHANNEL) to extract prices.
 * This is FREE - no API credentials needed, works with public channels only.
 *
 * Channels:
 * - @tala_hajiabdollahi → Gold 18k, Coins (half, quarter, full Pahlavi)
 * - TGJU API → Dollar, Euro, Ounce (fallback for private channels)
 */

interface ChannelPrice {
  item: string;
  sell: number | null;
  buy: number | null;
  source: string;
  fetchedAt: Date;
}

// Parse Persian number strings like "17,678,000" → 17678000
function parsePersianNumber(str: string): number | null {
  if (!str) return null;
  const cleaned = str.replace(/,/g, '').replace(/\s/g, '').trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

// Extract sell/buy prices for a named item from channel message text
function extractItemPrice(text: string, itemPattern: RegExp): { sell: number | null; buy: number | null } {
  const match = text.match(itemPattern);
  if (!match) return { sell: null, buy: null };

  // After matching the item name, find فروش and خرید lines
  const afterItem = text.slice(match.index! + match[0].length);
  const sellMatch = afterItem.match(/فروش[:\s]*([\d,]+)\s*تومان/);
  const buyMatch = afterItem.match(/خرید[:\s]*([\d,]+)\s*تومان/);

  return {
    sell: sellMatch ? parsePersianNumber(sellMatch[1]) : null,
    buy: buyMatch ? parsePersianNumber(buyMatch[1]) : null,
  };
}

// Scrape @tala_hajiabdollahi for gold and coin prices
export async function scrapeGoldChannel(): Promise<ChannelPrice[]> {
  const results: ChannelPrice[] = [];

  try {
    const response = await fetch('https://t.me/s/tala_hajiabdollahi', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fa,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[ChannelScraper] Gold channel returned ${response.status}`);
      return results;
    }

    const html = await response.text();
    const now = new Date();

    // Extract all message text blocks using regex
    const messageRegex = /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    const messages: string[] = [];
    let match;

    while ((match = messageRegex.exec(html)) !== null) {
      // Strip HTML tags to get plain text
      const text = match[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#\d+;/g, '');
      messages.push(text);
    }

    // Use the most recent message (last in array)
    const latestMessage = messages[messages.length - 1] || '';

    if (!latestMessage) {
      console.warn('[ChannelScraper] No messages found in gold channel');
      return results;
    }

    console.log('[ChannelScraper] Latest gold message:', latestMessage.substring(0, 200));

    // Extract gold 18k
    const gold18 = extractItemPrice(latestMessage, /طلای\s*18\s*عیار/);
    if (gold18.sell || gold18.buy) {
      results.push({ item: 'gold18', sell: gold18.sell, buy: gold18.buy, source: '@tala_hajiabdollahi', fetchedAt: now });
    }

    // Extract آبشده (melted gold)
    const abshode = extractItemPrice(latestMessage, /آبشده/);
    if (abshode.sell || abshode.buy) {
      results.push({ item: 'abshode', sell: abshode.sell, buy: abshode.buy, source: '@tala_hajiabdollahi', fetchedAt: now });
    }

    // Extract نیم سکه (half coin)
    const halfCoin = extractItemPrice(latestMessage, /نیم\s*سکه/);
    if (halfCoin.sell || halfCoin.buy) {
      results.push({ item: 'halfCoin', sell: halfCoin.sell, buy: halfCoin.buy, source: '@tala_hajiabdollahi', fetchedAt: now });
    }

    // Extract ربع سکه (quarter coin)
    const quarterCoin = extractItemPrice(latestMessage, /ربع\s*سکه/);
    if (quarterCoin.sell || quarterCoin.buy) {
      results.push({ item: 'quarterCoin', sell: quarterCoin.sell, buy: quarterCoin.buy, source: '@tala_hajiabdollahi', fetchedAt: now });
    }

    // Extract تمام پهلوی (full Pahlavi coin)
    const pahlaviCoin = extractItemPrice(latestMessage, /تمام\s*پهلوی/);
    if (pahlaviCoin.sell || pahlaviCoin.buy) {
      results.push({ item: 'pahlaviCoin', sell: pahlaviCoin.sell, buy: pahlaviCoin.buy, source: '@tala_hajiabdollahi', fetchedAt: now });
    }

    console.log(`[ChannelScraper] Extracted ${results.length} prices from gold channel`);
  } catch (error) {
    console.error('[ChannelScraper] Failed to scrape gold channel:', error);
  }

  return results;
}

// Cache for channel prices (5 minute TTL)
let channelPriceCache: { data: ChannelPrice[]; timestamp: number } | null = null;
const CHANNEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedChannelPrices(): Promise<ChannelPrice[]> {
  const now = Date.now();

  if (channelPriceCache && now - channelPriceCache.timestamp < CHANNEL_CACHE_TTL) {
    return channelPriceCache.data;
  }

  const prices = await scrapeGoldChannel();
  channelPriceCache = { data: prices, timestamp: now };
  return prices;
}
