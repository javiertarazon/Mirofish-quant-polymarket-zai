const http = require('http');
const path = require('path');
const fs = require('fs/promises');
const { PrismaClient } = require('../generated/prisma');
const config = require('../core/Config');
const { MiroFishQuant } = require('../index');
const { RiskManager } = require('../engine/RiskManager');
const { getSourceProfile, SOURCE_REGISTRY, BETTING_SOURCES } = require('../services/sports/SportsSourceRegistry');
const { inferSportFromText } = require('../utils/teams');

const prisma = new PrismaClient();
const publicDir = path.resolve(__dirname, '../../public');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function createDashboardServer(options = {}) {
  const cycleController = options.cycleController || createCycleController();

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname.startsWith('/api/')) {
        await routeApi(req, url, res, cycleController);
        return;
      }

      await serveStatic(url.pathname, res);
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  });
}

async function routeApi(req, url, res, cycleController) {
  if (url.pathname === '/api/summary') return sendJson(res, 200, await getSummary());
  if (url.pathname === '/api/trades') return sendJson(res, 200, await getTrades(Number(url.searchParams.get('limit') || 100)));
  if (url.pathname === '/api/predictions') return sendJson(res, 200, await getPredictions(Number(url.searchParams.get('limit') || 100)));
  if (url.pathname === '/api/markets') return sendJson(res, 200, await getMarkets(Number(url.searchParams.get('limit') || 100)));
  if (url.pathname === '/api/sources') return sendJson(res, 200, getSources());
  if (url.pathname === '/api/config') return sendJson(res, 200, getPublicConfig());
  if (url.pathname === '/api/cycle/status') return sendJson(res, 200, cycleController.getState());
  if (url.pathname === '/api/cycle') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    const result = cycleController.start();
    return sendJson(res, result.status, result.body);
  }
  const executeMatch = url.pathname.match(/^\/api\/predictions\/(\d+)\/execute$/);
  if (executeMatch) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });
    const result = await executePrediction(Number(executeMatch[1]));
    return sendJson(res, result.status, result.body);
  }
  sendJson(res, 404, { error: 'Not found' });
}

function createCycleController(appFactory = () => new MiroFishQuant()) {
  let app = null;
  let initialized = false;
  const state = {
    running: false,
    initialized: false,
    lastStartedAt: null,
    lastCompletedAt: null,
    lastResult: null,
    lastError: null,
  };

  const run = async () => {
    state.running = true;
    state.lastStartedAt = new Date().toISOString();
    state.lastError = null;

    try {
      if (!app) app = appFactory();
      if (!initialized) {
        initialized = await app.initialize();
        state.initialized = initialized;
        if (!initialized) throw new Error('Dashboard cycle runner initialization failed');
      }

      const result = await app.startTradingCycle();
      state.lastResult = result;
      if (result?.ok === false) state.lastError = result.error || { message: 'Trading cycle failed' };
    } catch (error) {
      state.lastError = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      };
      state.lastResult = { ok: false, error: state.lastError };
    } finally {
      state.running = false;
      state.lastCompletedAt = new Date().toISOString();
    }
  };

  return {
    getState() {
      return { ...state };
    },
    start() {
      if (config.execution.mode !== 'shadow') {
        return {
          status: 403,
          body: { error: 'Manual dashboard cycles are only allowed when TRADING_MODE=shadow' },
        };
      }
      if (state.running) {
        return {
          status: 409,
          body: { error: 'Trading cycle already running', state: this.getState() },
        };
      }

      run();
      return {
        status: 202,
        body: { accepted: true, state: this.getState() },
      };
    },
    async shutdown() {
      if (app) await app.shutdown();
    },
  };
}

async function getSummary() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const [
    trades,
    openTrades,
    shadowTrades,
    cancelledTrades,
    predictions,
    activePredictions,
    markets,
    todaySignals,
    avgPrediction,
    avgTradeStake,
  ] = await Promise.all([
    prisma.trade.count(),
    prisma.trade.count({ where: { status: 'OPEN' } }),
    prisma.trade.count({ where: { isShadowTrade: true } }),
    prisma.trade.count({ where: { status: 'CANCELLED' } }),
    prisma.prediction.count(),
    prisma.prediction.count({ where: { status: 'ACTIVE' } }),
    prisma.market.count(),
    prisma.prediction.count({ where: { createdAt: { gte: today } } }),
    prisma.prediction.aggregate({
      _avg: {
        confidence: true,
        probability: true,
        expectedValue: true,
        kellySize: true,
      },
    }),
    prisma.trade.aggregate({ _avg: { stake: true, odds: true } }),
  ]);

  const recentPredictions = await prisma.prediction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      confidence: true,
      probability: true,
      expectedValue: true,
      kellySize: true,
      createdAt: true,
      market: { select: { sport: true, category: true } },
    },
  });

  const sportBreakdown = groupBySport(recentPredictions);
  const evBuckets = bucketExpectedValue(recentPredictions);
  const marketSportCounts = await getMarketSportCounts();
  const signalQualityCounts = await countSportsSignalQuality();

  return {
    generatedAt: now.toISOString(),
    config: getPublicConfig(),
    counts: {
      trades,
      openTrades,
      shadowTrades,
      cancelledTrades,
      predictions,
      activePredictions,
      markets,
      sportsMarkets: marketSportCounts.sportsMarkets,
      generalMarkets: marketSportCounts.generalMarkets,
      highProbabilitySignals: signalQualityCounts.swarmConfirmed,
      highValueSignals: signalQualityCounts.valueOnly,
      todaySignals,
    },
    averages: {
      confidence: round(avgPrediction._avg.confidence),
      probability: round(avgPrediction._avg.probability),
      expectedValue: round(avgPrediction._avg.expectedValue),
      kellySize: round(avgPrediction._avg.kellySize),
      tradeStake: round(avgTradeStake._avg.stake),
      tradeOdds: round(avgTradeStake._avg.odds),
    },
    sportBreakdown,
    evBuckets,
  };
}

async function getTrades(limit) {
  const trades = await prisma.trade.findMany({
    orderBy: { executedAt: 'desc' },
    take: clampLimit(limit),
    include: {
      market: true,
      prediction: true,
    },
  });

  return trades.map((trade) => ({
    id: trade.id,
    marketId: trade.marketId,
    title: trade.market?.title || trade.marketId,
    sport: resolveMarketSport(trade.market),
    side: trade.side,
    stake: trade.stake,
    odds: trade.odds,
    potentialProfit: trade.potentialProfit,
    status: trade.status,
    shadow: trade.isShadowTrade,
    executedAt: trade.executedAt,
    resolvedAt: trade.resolvedAt,
    confidence: trade.prediction?.confidence || null,
    probability: trade.prediction?.probability || null,
    expectedValue: trade.prediction?.expectedValue || null,
    kellySize: trade.prediction?.kellySize || null,
    notes: trade.notes,
  }));
}

async function getPredictions(limit) {
  const predictions = await prisma.prediction.findMany({
    orderBy: { createdAt: 'desc' },
    take: clampLimit(limit),
    include: {
      market: true,
      trades: true,
    },
  });

  return predictions.map((prediction) => {
    const reasoning = parseJson(prediction.reasoning);
    const sources = parseJson(prediction.sources);
    return {
      id: prediction.id,
      marketId: prediction.marketId,
      title: prediction.market?.title || prediction.marketId,
      sport: resolveMarketSport(prediction.market),
      predictedOutcome: prediction.predictedOutcome,
      confidence: prediction.confidence,
      probability: prediction.probability,
      impliedProbability: reasoning.impliedProbability ?? prediction.market?.odds ?? null,
      modelProbability: reasoning.modelProbability ?? prediction.probability,
      undervaluationGap: reasoning.undervaluationGap ?? null,
      expectedValue: prediction.expectedValue,
      kellySize: prediction.kellySize,
      status: prediction.status,
      createdAt: prediction.createdAt,
      thesis: reasoning.thesis || null,
      summary: reasoning.summary || '',
      agents: reasoning.agents || [],
      kelly: reasoning.kelly || null,
      quality: reasoning.quality || signalQualityFromPrediction(prediction, reasoning),
      swarmScore: reasoning.swarmScore ?? null,
      swarmAgreement: reasoning.swarmAgreement ?? null,
      sources,
      trades: prediction.trades.length,
      executionStatus: prediction.trades.length ? 'EXECUTED' : 'PENDING',
    };
  });
}

async function executePrediction(predictionId) {
  if (config.execution.mode !== 'shadow') {
    return { status: 403, body: { error: 'Manual execution is only enabled in shadow mode' } };
  }

  const prediction = await prisma.prediction.findUnique({
    where: { id: predictionId },
    include: { market: true, trades: true },
  });
  if (!prediction) return { status: 404, body: { error: 'Prediction not found' } };
  if (prediction.trades.length) return { status: 409, body: { error: 'Prediction already has an execution' } };

  const risk = new RiskManager({
    getOpenTradeCount: () => prisma.trade.count({ where: { status: 'OPEN' } }),
    getTodayProfitLoss: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const aggregate = await prisma.trade.aggregate({
        where: {
          executedAt: { gte: start },
          profitLoss: { not: null },
        },
        _sum: { profitLoss: true },
      });
      return aggregate._sum.profitLoss || 0;
    },
  });
  const gate = await risk.canOpenTrade();
  if (!gate.allowed) return { status: 409, body: { error: gate.reason } };

  const reasoning = parseJson(prediction.reasoning);
  const entryPrice = Number(reasoning.impliedProbability ?? prediction.market?.odds ?? 0);
  if (!entryPrice || entryPrice <= 0 || entryPrice >= 1) {
    return { status: 422, body: { error: 'Prediction has no executable entry price' } };
  }

  const user = await prisma.user.upsert({
    where: { email: 'system@mirofish.local' },
    update: {},
    create: { email: 'system@mirofish.local', name: 'MiroFish Bot' },
  });
  const trade = await prisma.trade.create({
    data: {
      userId: user.id,
      marketId: prediction.marketId,
      predictionId: prediction.id,
      side: 'BUY',
      stake: prediction.kellySize,
      odds: entryPrice,
      potentialProfit: prediction.kellySize * ((1 / entryPrice) - 1),
      status: 'OPEN',
      isShadowTrade: true,
      notes: `Manual dashboard shadow execution for ${prediction.predictedOutcome}.`,
    },
  });

  return { status: 201, body: { executed: true, trade } };
}

async function getMarkets(limit) {
  const markets = await prisma.market.findMany({
    orderBy: [{ isActive: 'desc' }, { expiresAt: 'asc' }],
    take: clampLimit(limit),
    include: {
      _count: {
        select: {
          predictions: true,
          trades: true,
        },
      },
    },
  });

  return markets.map((market) => ({
    id: market.id,
    title: market.title,
    sport: resolveMarketSport(market),
    category: market.category,
    outcome: market.outcome,
    odds: market.odds,
    volume: market.volume,
    liquidity: market.liquidity,
    expiresAt: market.expiresAt,
    isActive: market.isActive,
    predictionCount: market._count.predictions,
    tradeCount: market._count.trades,
    sources: getSourceProfile(resolveMarketSport(market)),
  }));
}

function getSources() {
  return {
    sports: SOURCE_REGISTRY,
    betting: BETTING_SOURCES,
  };
}

function getPublicConfig() {
  return {
    tradingMode: config.execution.mode,
    liveEnabled: config.execution.liveEnabled,
    telegramEnabled: config.telegram.enabled,
    newsApiConfigured: Boolean(config.news.apiKey),
    apiSportsConfigured: Boolean(config.sportsApi.apiKey),
    oddsApiConfigured: Boolean(config.odds.apiKey),
    risk: {
      bankroll: config.risk.bankroll,
      maxStake: config.risk.maxStake,
      maxStakePct: config.risk.maxStakePct,
      kellyFraction: config.risk.kellyFraction,
      maxOpenTrades: config.risk.maxOpenTrades,
      dailyLossLimitPct: config.risk.dailyLossLimitPct,
    },
    strategy: {
      minLiquidity: config.strategy.minLiquidity,
      minVolume: config.strategy.minVolume,
      maxSpread: config.strategy.maxSpread,
      minExpectedValue: config.strategy.minExpectedValue,
      minConfidence: config.strategy.minConfidence,
      minProbabilityEdge: config.strategy.minProbabilityEdge,
      minUndervaluationGap: config.strategy.minUndervaluationGap,
      highProbabilityThreshold: config.strategy.highProbabilityThreshold,
      highConfidenceThreshold: config.strategy.highConfidenceThreshold,
      highSwarmAgreementThreshold: config.strategy.highSwarmAgreementThreshold,
    },
    swarm: {
      enabled: config.swarm.enabled,
      newsWeight: config.swarm.newsWeight,
      sportsWeight: config.swarm.sportsWeight,
      topTraderWeight: config.swarm.topTraderWeight,
      holderWeight: config.swarm.holderWeight,
      marketMoodWeight: config.swarm.marketMoodWeight,
      externalOddsWeight: config.swarm.externalOddsWeight,
    },
    execution: {
      autoExecuteSignals: config.execution.autoExecuteSignals,
      manualShadowExecution: config.execution.mode === 'shadow',
    },
  };
}

async function serveStatic(requestPath, res) {
  const normalizedPath = requestPath === '/' ? '/index.html' : requestPath;
  const targetPath = path.normalize(path.join(publicDir, normalizedPath));

  if (!targetPath.startsWith(publicDir)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  try {
    const body = await fs.readFile(targetPath);
    const type = contentTypes[path.extname(targetPath)] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const body = await fs.readFile(path.join(publicDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': contentTypes['.html'] });
      res.end(body);
      return;
    }
    throw error;
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

function parseJson(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch (_) {
    return {};
  }
}

function clampLimit(value) {
  return Math.max(1, Math.min(Number.isFinite(value) ? value : 100, 500));
}

function round(value, digits = 4) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function groupBySport(predictions) {
  const map = new Map();
  for (const prediction of predictions) {
    const sport = resolveMarketSport(prediction.market);
    const item = map.get(sport) || {
      sport,
      count: 0,
      avgConfidence: 0,
      avgProbability: 0,
      avgExpectedValue: 0,
    };
    item.count += 1;
    item.avgConfidence += prediction.confidence || 0;
    item.avgProbability += prediction.probability || 0;
    item.avgExpectedValue += prediction.expectedValue || 0;
    map.set(sport, item);
  }

  return [...map.values()].map((item) => ({
    ...item,
    avgConfidence: round(item.avgConfidence / item.count, 2),
    avgProbability: round(item.avgProbability / item.count, 4),
    avgExpectedValue: round(item.avgExpectedValue / item.count, 4),
  }));
}

async function getMarketSportCounts() {
  const markets = await prisma.market.findMany({
    select: {
      title: true,
      description: true,
      sport: true,
      category: true,
    },
  });
  const sportsMarkets = markets.filter(market => resolveMarketSport(market) !== 'general').length;
  return {
    sportsMarkets,
    generalMarkets: markets.length - sportsMarkets,
  };
}

async function countSportsSignalQuality() {
  const predictions = await prisma.prediction.findMany({
    select: {
      confidence: true,
      probability: true,
      expectedValue: true,
      reasoning: true,
      market: {
        select: {
          title: true,
          description: true,
          sport: true,
          category: true,
        },
      },
    },
  });
  const counts = { swarmConfirmed: 0, valueOnly: 0 };
  for (const prediction of predictions) {
    if (resolveMarketSport(prediction.market) === 'general') continue;
    const reasoning = parseJson(prediction.reasoning);
    const quality = signalQualityFromPrediction(prediction, reasoning);
    if (quality.classification === 'SWARM_CONFIRMED') counts.swarmConfirmed += 1;
    if (quality.classification === 'VALUE_ONLY') counts.valueOnly += 1;
  }
  return counts;
}

function resolveMarketSport(market) {
  if (!market) return 'general';
  if (market.sport && market.sport !== 'general') return market.sport;
  return inferSportFromText(market.title, market.description, market.category);
}

function bucketExpectedValue(predictions) {
  const buckets = [
    { label: '< 0.10', min: -Infinity, max: 0.1, count: 0 },
    { label: '0.10-0.25', min: 0.1, max: 0.25, count: 0 },
    { label: '0.25-0.50', min: 0.25, max: 0.5, count: 0 },
    { label: '0.50-1.00', min: 0.5, max: 1, count: 0 },
    { label: '> 1.00', min: 1, max: Infinity, count: 0 },
  ];

  for (const prediction of predictions) {
    const bucket = buckets.find((item) => prediction.expectedValue >= item.min && prediction.expectedValue < item.max);
    if (bucket) bucket.count += 1;
  }

  return buckets;
}

function signalQualityFromPrediction(prediction, reasoning = {}) {
  const swarmAgreement = Number(reasoning.swarmAgreement || 0);
  const swarmScore = Number(reasoning.swarmScore || 0);
  const expectedValue = Number(prediction.expectedValue || 0);
  const probability = Number(prediction.probability || 0);
  const confidence = Number(prediction.confidence || 0);
  const undervaluationGap = Number(reasoning.undervaluationGap || 0);
  const highProbability = probability >= config.strategy.highProbabilityThreshold;
  const highConfidence = confidence >= config.strategy.highConfidenceThreshold;
  const positiveSwarm = swarmScore > 0 && swarmAgreement >= config.strategy.highSwarmAgreementThreshold;
  const strongValue = expectedValue >= Math.max(config.strategy.minExpectedValue * 2, 0.08)
    && undervaluationGap >= config.strategy.minUndervaluationGap;
  const score = [highProbability, highConfidence, positiveSwarm, strongValue].filter(Boolean).length;
  const classification = positiveSwarm && highConfidence && strongValue
    ? 'SWARM_CONFIRMED'
    : highConfidence && strongValue
      ? 'VALUE_ONLY'
      : 'WATCHLIST';
  return {
    grade: score >= 4 ? 'A+' : score === 3 ? 'A' : score === 2 ? 'B' : 'C',
    classification,
    highProbability,
    highConfidence,
    positiveSwarm,
    strongValue,
    automaticExecutionAllowed: config.execution.autoExecuteSignals,
  };
}

if (require.main === module) {
  const port = Number(process.env.DASHBOARD_PORT || process.env.PORT || 3000);
  const host = process.env.DASHBOARD_HOST || process.env.HOST || '127.0.0.1';
  const cycleController = createCycleController();
  const server = createDashboardServer({ cycleController });

  server.listen(port, host, () => {
    console.log(`MiroFish dashboard running at http://${host}:${port}`);
  });

  server.on('error', (error) => {
    console.error(`Dashboard server failed: ${error.message}`);
    process.exit(1);
  });

  const shutdown = async () => {
    server.close(async () => {
      await cycleController.shutdown();
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { createDashboardServer, createCycleController, getPublicConfig };
