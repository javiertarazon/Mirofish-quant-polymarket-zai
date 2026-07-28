const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), 'config/data-apis.env') });
dotenv.config({ override: true });
dotenv.config({ path: path.resolve(process.cwd(), 'config/.env'), override: true });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

function numberFromEnv(name, fallback, { min = -Infinity, max = Infinity } = {}) {
  const raw = process.env[name];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);

  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a number between ${min} and ${max}`);
  }

  return value;
}

function boolFromEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

function listFromEnv(name, fallback = []) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}

const mode = (process.env.TRADING_MODE || 'shadow').toLowerCase();
if (!['shadow', 'live'].includes(mode)) {
  throw new Error('TRADING_MODE must be "shadow" or "live"');
}

const config = {
  app: {
    name: 'MiroFish Quant',
    version: '5.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    cycleMs: numberFromEnv('TRADING_CYCLE_MS', 30 * 60 * 1000, { min: 60_000 }),
    runOnce: boolFromEnv('RUN_ONCE', false),
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  polymarket: {
    gammaBaseUrl: process.env.POLYMARKET_GAMMA_URL || 'https://gamma-api.polymarket.com',
    clobBaseUrl: process.env.POLYMARKET_CLOB_URL || 'https://clob.polymarket.com',
    dataBaseUrl: process.env.POLYMARKET_DATA_URL || 'https://data-api.polymarket.com',
    requestTimeoutMs: numberFromEnv('HTTP_TIMEOUT_MS', 15_000, { min: 1000 }),
    marketLimit: numberFromEnv('MARKET_SCAN_LIMIT', 50, { min: 1, max: 500 }),
    tagIds: listFromEnv('POLYMARKET_TAG_IDS'),
    sportsFocus: boolFromEnv('SPORTS_MARKETS_FOCUS', true),
    sportsTagSlug: process.env.POLYMARKET_SPORTS_TAG_SLUG || 'sports',
    targetSports: listFromEnv('SPORTS_TARGETS', ['MLB', 'NBA', 'NFL', 'Soccer', 'UFC', 'Boxing', 'F1', 'MotoGP']),
    excludedTerms: listFromEnv('EXCLUDED_MARKET_TERMS', ['crypto price', 'bitcoin', 'ethereum']),
  },
  strategy: {
    minLiquidity: numberFromEnv('MIN_LIQUIDITY', 1000, { min: 0 }),
    minVolume: numberFromEnv('MIN_VOLUME', 1000, { min: 0 }),
    maxSpread: numberFromEnv('MAX_SPREAD', 0.08, { min: 0, max: 1 }),
    minExpectedValue: numberFromEnv('MIN_EXPECTED_VALUE', 0.03, { min: -1, max: 1 }),
    minConfidence: numberFromEnv('MIN_CONFIDENCE', 70, { min: 0, max: 100 }),
    minProbabilityEdge: numberFromEnv('MIN_PROBABILITY_EDGE', 0.04, { min: 0, max: 1 }),
    minUndervaluationGap: numberFromEnv('MIN_UNDERVALUATION_GAP', 0.04, { min: 0, max: 1 }),
    maxMarketsPerCycle: numberFromEnv('MAX_MARKETS_PER_CYCLE', 20, { min: 1, max: 200 }),
    // Slots por categoría de mercado
    maxDailyMatchSlots: numberFromEnv('MAX_DAILY_MATCH_SLOTS', 10, { min: 0, max: 200 }),
    maxKnockoutSlots: numberFromEnv('MAX_KNOCKOUT_SLOTS', 5, { min: 0, max: 200 }),
    maxSpecialEventSlots: numberFromEnv('MAX_SPECIAL_EVENT_SLOTS', 3, { min: 0, max: 200 }),
    // Umbrales relajados para partidos del día
    dailyMatchMinLiquidity: numberFromEnv('DAILY_MATCH_MIN_LIQUIDITY', 50, { min: 0 }),
    dailyMatchMinVolume: numberFromEnv('DAILY_MATCH_MIN_VOLUME', 50, { min: 0 }),
    highProbabilityThreshold: numberFromEnv('HIGH_PROBABILITY_THRESHOLD', 0.62, { min: 0.01, max: 0.99 }),
    highConfidenceThreshold: numberFromEnv('HIGH_CONFIDENCE_THRESHOLD', 85, { min: 0, max: 100 }),
    highSwarmAgreementThreshold: numberFromEnv('HIGH_SWARM_AGREEMENT_THRESHOLD', 0.6, { min: 0, max: 1 }),
  },
  topTraders: {
    minEffectiveness: numberFromEnv('TOP_TRADER_MIN_EFFECTIVENESS', 0.08, { min: -1, max: 1 }),
    minMonthlyVolume: numberFromEnv('TOP_TRADER_MIN_MONTHLY_VOLUME', 10000, { min: 0 }),
    minRelevantNotional: numberFromEnv('TOP_TRADER_MIN_RELEVANT_NOTIONAL', 1000, { min: 0 }),
  },
  swarm: {
    enabled: boolFromEnv('SWARM_ENABLED', true),
    maxProbabilityShift: numberFromEnv('MAX_SWARM_PROBABILITY_SHIFT', 0.08, { min: 0, max: 0.25 }),
    maxConfidenceBoost: numberFromEnv('MAX_SWARM_CONFIDENCE_BOOST', 12, { min: 0, max: 30 }),
    newsWeight: numberFromEnv('NEWS_AGENT_WEIGHT', 0.22, { min: 0, max: 1 }),
    sportsWeight: numberFromEnv('SPORTS_AGENT_WEIGHT', 0.24, { min: 0, max: 1 }),
    officialSourcesWeight: numberFromEnv('OFFICIAL_SOURCES_AGENT_WEIGHT', 0.18, { min: 0, max: 1 }),
    topTraderWeight: numberFromEnv('TOP_TRADER_AGENT_WEIGHT', 0.16, { min: 0, max: 1 }),
    holderWeight: numberFromEnv('HOLDER_AGENT_WEIGHT', 0.10, { min: 0, max: 1 }),
    marketMoodWeight: numberFromEnv('MARKET_MOOD_AGENT_WEIGHT', 0.12, { min: 0, max: 1 }),
    externalOddsWeight: numberFromEnv('EXTERNAL_ODDS_AGENT_WEIGHT', 0.08, { min: 0, max: 1 }),
    rosterWeight: numberFromEnv('ROSTER_AGENT_WEIGHT', 0.15, { min: 0, max: 1 }),
    motorsportTechWeight: numberFromEnv('MOTORSPORT_TECH_AGENT_WEIGHT', 0.15, { min: 0, max: 1 }),
  },
  news: {
    apiKey: process.env.NEWS_API_KEY || '',
    gnewsApiKey: process.env.GNEWS_API_KEY || '',
    currentsApiKey: process.env.CURRENTS_API_KEY || '',
    baseUrl: process.env.NEWS_API_URL || 'https://newsapi.org/v2',
    language: process.env.NEWS_LANGUAGE || 'en',
    lookbackHours: numberFromEnv('NEWS_LOOKBACK_HOURS', 48, { min: 1, max: 168 }),
    pageSize: numberFromEnv('NEWS_PAGE_SIZE', 20, { min: 1, max: 100 }),
    domains: listFromEnv('NEWS_DOMAINS'),
  },
  sportsApi: {
    apiKey: process.env.API_SPORTS_KEY || '',
    footballDataApiKey: process.env.FOOTBALL_DATA_API_KEY || '',
    theSportsDbApiKey: process.env.THESPORTSDB_API_KEY || '123',
    rapidApiKey: process.env.RAPIDAPI_KEY || '',
    baseUrl: process.env.API_SPORTS_BASE_URL || 'https://v3.football.api-sports.io',
    host: process.env.API_SPORTS_HOST || '',
    timezone: process.env.SPORTS_TIMEZONE || 'America/New_York',
  },
  odds: {
    apiKey: process.env.ODDS_API_KEY || '',
    baseUrl: process.env.ODDS_API_URL || 'https://api.the-odds-api.com',
    regions: process.env.ODDS_API_REGIONS || 'us,eu,uk',
  },
  risk: {
    bankroll: numberFromEnv('BANKROLL_USDC', 100, { min: 1 }),
    maxStake: numberFromEnv('MAX_STAKE_USDC', 5, { min: 0 }),
    maxStakePct: numberFromEnv('MAX_STAKE_PCT', 0.02, { min: 0, max: 1 }),
    kellyFraction: numberFromEnv('KELLY_FRACTION', 0.25, { min: 0, max: 1 }),
    dailyLossLimitPct: numberFromEnv('DAILY_LOSS_LIMIT_PCT', 0.05, { min: 0, max: 1 }),
    maxOpenTrades: numberFromEnv('MAX_OPEN_TRADES', 5, { min: 1, max: 100 }),
  },
  execution: {
    mode,
    liveEnabled: boolFromEnv('ENABLE_LIVE_TRADING', false),
    autoExecuteSignals: boolFromEnv('AUTO_EXECUTE_SIGNALS', true),
    privateKey: process.env.POLYMARKET_PRIVATE_KEY || '',
    funderAddress: process.env.POLYMARKET_FUNDER_ADDRESS || '',
    chainId: numberFromEnv('POLYMARKET_CHAIN_ID', 137, { min: 1 }),
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    enabled: boolFromEnv('TELEGRAM_ENABLED', Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)),
  },
};

module.exports = config;
