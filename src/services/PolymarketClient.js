const axios = require('axios');
const config = require('../core/Config');
const logger = require('../core/Logger');
const { toNumber } = require('../utils/number');
const { inferSportFromText } = require('../utils/teams');

class PolymarketClient {
  constructor() {
    this.topTraderFlowCache = new Map();
    this.gamma = axios.create({
      baseURL: config.polymarket.gammaBaseUrl,
      timeout: config.polymarket.requestTimeoutMs,
      headers: { 'User-Agent': 'MiroFishQuant/5.0' },
    });
    this.clob = axios.create({
      baseURL: config.polymarket.clobBaseUrl,
      timeout: config.polymarket.requestTimeoutMs,
      headers: { 'User-Agent': 'MiroFishQuant/5.0' },
    });
    this.data = axios.create({
      baseURL: config.polymarket.dataBaseUrl,
      timeout: config.polymarket.requestTimeoutMs,
      headers: { 'User-Agent': 'MiroFishQuant/5.0' },
    });
  }

  async fetchActiveEvents() {
    const baseParams = {
      active: true,
      closed: false,
      limit: config.polymarket.marketLimit,
      order: 'volume_24hr',
      ascending: false,
    };

    if (config.polymarket.tagIds.length === 1) {
      return this.fetchEvents({
        ...baseParams,
        tag_id: config.polymarket.tagIds[0],
        related_tags: true,
      });
    }

    if (config.polymarket.sportsFocus) {
      const [sportsEvents, generalEvents] = await Promise.all([
        this.fetchEvents({ ...baseParams, tag_slug: config.polymarket.sportsTagSlug }),
        this.fetchEvents(baseParams),
      ]);
      return uniqueEvents([...sportsEvents, ...generalEvents]);
    }

    return this.fetchEvents(baseParams);
  }

  async fetchEvents(params) {
    const { data } = await this.gamma.get('/events', { params });
    return Array.isArray(data) ? data : data.events || [];
  }

  async fetchOrderBook(tokenId) {
    if (!tokenId) return null;

    try {
      const { data } = await this.clob.get('/book', { params: { token_id: tokenId } });
      return data;
    } catch (error) {
      logger.warn(`Orderbook unavailable for token ${tokenId}: ${error.message}`);
      return null;
    }
  }

  async fetchMidpoint(tokenId) {
    if (!tokenId) return null;

    try {
      const { data } = await this.clob.get('/midpoint', { params: { token_id: tokenId } });
      return toNumber(data.mid || data.midpoint, null);
    } catch (error) {
      logger.debug(`Midpoint unavailable for token ${tokenId}: ${error.message}`);
      return null;
    }
  }

  async fetchLeaderboard({ category = 'SPORTS', timePeriod = 'MONTH', orderBy = 'PNL', limit = 25 } = {}) {
    try {
      const { data } = await this.data.get('/v1/leaderboard', {
        params: { category, timePeriod, orderBy, limit },
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.debug(`Leaderboard unavailable: ${error.message}`);
      return [];
    }
  }

  async fetchUserTrades(wallet, limit = 50) {
    if (!wallet) return [];

    try {
      const { data } = await this.data.get('/trades', {
        params: { user: wallet, limit },
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.debug(`Trades unavailable for ${wallet}: ${error.message}`);
      return [];
    }
  }

  async fetchTopTraderFlow({ category = 'SPORTS', timePeriod = 'MONTH', topLimit = 10, tradesPerTrader = 25 } = {}) {
    const cacheKey = JSON.stringify({ category, timePeriod, topLimit, tradesPerTrader });
    const cached = this.topTraderFlowCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    let leaderboard = await this.fetchLeaderboard({
      category,
      timePeriod,
      orderBy: 'PNL',
      limit: topLimit,
    });

    if (!leaderboard.length && category !== 'OVERALL') {
      leaderboard = await this.fetchLeaderboard({
        category: 'OVERALL',
        timePeriod,
        orderBy: 'PNL',
        limit: topLimit,
      });
    }

    const traderFlows = await Promise.all(leaderboard.map(async (trader) => {
      const trades = await this.fetchUserTrades(trader.proxyWallet, tradesPerTrader);
      return {
        rank: Number(trader.rank) || null,
        userName: trader.userName || trader.proxyWallet,
        wallet: trader.proxyWallet,
        pnl: toNumber(trader.pnl, 0),
        volume: toNumber(trader.vol, 0),
        trades,
      };
    }));

    this.topTraderFlowCache.set(cacheKey, {
      expiresAt: Date.now() + 2 * 60 * 1000,
      data: traderFlows,
    });

    return traderFlows;
  }

  async fetchHolders(marketId, limit = 20) {
    try {
      const { data } = await this.data.get('/holders', {
        params: { market: marketId, limit, minBalance: 1 },
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.debug(`Holders unavailable for ${marketId}: ${error.message}`);
      return [];
    }
  }

  parseMarketsFromEvents(events) {
    const markets = [];

    for (const event of events) {
      const eventMarkets = Array.isArray(event.markets) ? event.markets : [];
      for (const market of eventMarkets) {
        const normalized = this.normalizeMarket(event, market);
        if (normalized) markets.push(normalized);
      }
    }

    return markets;
  }

  normalizeMarket(event, market) {
    const title = market.question || market.title || event.title || event.question || '';
    const lowerTitle = title.toLowerCase();

    if (!market.active || market.closed) return null;
    if (config.polymarket.excludedTerms.some((term) => lowerTitle.includes(term.toLowerCase()))) return null;

    const outcomes = parseJsonArray(market.outcomes);
    const tokenIds = parseJsonArray(market.clobTokenIds);
    const outcomePrices = parseJsonArray(market.outcomePrices).map((price) => toNumber(price, null));

    if (outcomes.length < 2 || tokenIds.length < 2) return null;

    const yesIndex = findOutcomeIndex(outcomes, ['yes', 'y']);
    const noIndex = findOutcomeIndex(outcomes, ['no', 'n']);
    const selectedYesIndex = yesIndex >= 0 ? yesIndex : 0;
    const selectedNoIndex = noIndex >= 0 ? noIndex : 1;
    const volume = toNumber(market.volumeNum ?? market.volume ?? event.volume, 0);
    const volume24h = toNumber(market.volume24hr ?? market.volume24hrClob ?? event.volume24hr, 0);
    const liquidity = toNumber(market.liquidityNum ?? market.liquidity ?? event.liquidity, 0);
    const endDate = market.endDateIso || market.endDate || event.endDate || event.end_date;

    return {
      id: String(market.conditionId || market.id),
      slug: market.slug || event.slug,
      eventId: String(event.id || event.slug || market.id),
      title,
      description: market.description || event.description || '',
      category: event.category || market.category || inferCategory(event, market),
      sport: inferSport(event, market),
      outcomes,
      tokenIds,
      yesTokenId: tokenIds[selectedYesIndex],
      noTokenId: tokenIds[selectedNoIndex],
      yesOutcome: outcomes[selectedYesIndex],
      noOutcome: outcomes[selectedNoIndex],
      yesPrice: outcomePrices[selectedYesIndex],
      noPrice: outcomePrices[selectedNoIndex],
      volume,
      volume24h,
      liquidity,
      endDate: endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      raw: market,
    };
  }
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function findOutcomeIndex(outcomes, names) {
  return outcomes.findIndex((outcome) => names.includes(String(outcome).toLowerCase()));
}

function inferCategory(event, market) {
  const tags = [...(event.tags || []), ...(market.tags || [])].map((tag) => tag.label || tag.slug || tag.name || '');
  return tags.find(Boolean) || 'general';
}

function inferSport(event, market) {
  return inferSportFromText(
    event.title,
    event.slug,
    event.category,
    event.description,
    market.question,
    market.title,
    market.slug,
    market.category,
    market.description,
    JSON.stringify(event.tags || []),
    JSON.stringify(market.tags || []),
  );
}

function uniqueEvents(events) {
  const seen = new Set();
  const result = [];
  for (const event of events) {
    const key = String(event.id || event.slug || event.title);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}

module.exports = { PolymarketClient };
