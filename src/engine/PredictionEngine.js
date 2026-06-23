const config = require('../core/Config');
const logger = require('../core/Logger');
const { PolymarketClient } = require('../services/PolymarketClient');
const { SwarmOrchestrator } = require('../agents/SwarmOrchestrator');
const { RiskManager } = require('./RiskManager');
const { TradeExecutor } = require('./TradeExecutor');
const { clamp, round, toNumber } = require('../utils/number');
const { selectByCategory, classifyMarket, MARKET_TYPES } = require('./MarketClassifier');

class PredictionEngine {
  constructor(db) {
    this.db = db;
    this.client = new PolymarketClient();
    this.swarm = new SwarmOrchestrator(this.client);
    this.risk = new RiskManager(db);
    this.executor = new TradeExecutor(db);
    this.lastRejection = null;
  }

  async initialize() {
    await this.executor.initialize();
  }

  async scanActiveMarkets() {
    const candidates = await this.scanMarketUniverse();
    return this.selectMarketsForCycle(candidates);
  }

  async scanMarketUniverse() {
    const events = await this.client.fetchActiveEvents();
    const markets = this.client.parseMarketsFromEvents(events);

    return markets
      .filter((market) => this.passesStaticFilters(market))
      .sort(compareMarketPriority);
  }

  selectMarketsForCycle(markets) {
    const slotConfig = {
      dailyMatch: config.strategy.maxDailyMatchSlots,
      knockout: config.strategy.maxKnockoutSlots,
      specialEvent: config.strategy.maxSpecialEventSlots,
      total: config.strategy.maxMarketsPerCycle,
    };

    const selected = selectByCategory(markets, slotConfig);

    // Log de distribución por categoría
    const summary = {};
    for (const market of selected) {
      const label = market.marketType?.code || 'FUTURES';
      summary[label] = (summary[label] || 0) + 1;
    }
    logger.info('Market selection by category', summary);

    return selected;
  }

  async generatePrediction(market) {
    this.lastRejection = null;
    const marketType = market.marketType?.label || classifyMarket(market).label;
    logger.debug(`Analyzing [${marketType}] ${market.title}`);

    const yesBook = await this.client.fetchOrderBook(market.yesTokenId);
    if (!yesBook) return this.reject(market, 'orderbook unavailable');

    const micro = this.analyzeOrderBook(yesBook, market.yesPrice);
    if (!micro) return this.reject(market, 'orderbook not actionable');

    if (micro.spread > config.strategy.maxSpread) {
      return this.reject(market, `spread too wide (${round(micro.spread, 4)})`);
    }

    const baseSignal = this.estimateProbability(market, micro);
    const swarm = await this.swarm.analyze({ market, micro, baseSignal });
    const signal = this.applySwarm(baseSignal, swarm);
    const side = signal.probability >= micro.marketProbability ? 'BUY' : 'SKIP';
    const edge = signal.probability - micro.entryPrice;
    const undervaluationGap = this.undervaluationGap(signal.probability, micro.entryPrice);
    const expectedValue = this.expectedValue(signal.probability, micro.entryPrice);
    const confidence = clamp(
      this.confidenceScore({ edge, expectedValue, spread: micro.spread, liquidity: market.liquidity, volume: market.volume }) + swarm.confidenceBoost,
      0,
      100,
    );

    if (side === 'SKIP') return this.reject(market, 'model probability below entry price');
    if (edge < config.strategy.minProbabilityEdge) return this.reject(market, `edge below threshold (${round(edge, 4)})`);
    if (undervaluationGap < config.strategy.minUndervaluationGap) {
      return this.reject(market, `undervaluation gap below threshold (${round(undervaluationGap, 4)})`);
    }
    if (expectedValue < config.strategy.minExpectedValue) return this.reject(market, `EV below threshold (${round(expectedValue, 4)})`);
    if (confidence < config.strategy.minConfidence) return this.reject(market, `confidence below threshold (${round(confidence, 2)}%)`);

    const sizing = this.risk.calculateStakeDetails(signal.probability, micro.entryPrice);
    if (sizing.stake <= 0) return this.reject(market, 'risk model returned zero stake');
    const riskGate = await this.risk.canOpenTrade();
    const quality = this.signalQuality({
      confidence,
      probability: signal.probability,
      expectedValue,
      undervaluationGap,
      swarm,
      riskGate,
    });

    return {
      marketId: market.id,
      title: market.title,
      tokenId: market.yesTokenId,
      side,
      outcome: market.yesOutcome,
      confidence: round(confidence, 2),
      probability: round(signal.probability, 4),
      modelProbability: round(signal.probability, 4),
      impliedProbability: round(micro.entryPrice, 4),
      marketProbability: round(micro.marketProbability, 4),
      entryPrice: round(micro.entryPrice, 4),
      undervaluationGap: round(undervaluationGap, 4),
      expectedValue: round(expectedValue, 4),
      kellySize: sizing.stake,
      sizing,
      mode: config.execution.mode,
      reasoning: {
        thesis: 'UNDERVALUED_YES',
        summary: signal.summary,
        quality,
        publicDataOnly: true,
        impliedProbability: round(micro.entryPrice, 4),
        modelProbability: round(signal.probability, 4),
        undervaluationGap: round(undervaluationGap, 4),
        edge: round(edge, 4),
        spread: round(micro.spread, 4),
        liquidity: market.liquidity,
        volume: market.volume,
        momentum: round(signal.momentum, 4),
        liquiditySkew: round(signal.liquiditySkew, 4),
        swarmScore: swarm.score,
        swarmShift: swarm.probabilityShift,
        swarmAgreement: swarm.agreement,
        kelly: sizing,
        riskGate,
        agents: swarm.results.map(result => ({
          name: result.name,
          enabled: result.enabled,
          score: round(result.score, 4),
          confidence: round(result.confidence, 4),
          shift: round(result.probabilityShift, 4),
          notes: result.notes,
        })),
      },
      sources: {
        market: 'Polymarket Gamma API',
        orderbook: 'Polymarket CLOB public orderbook',
        compliance: 'public data and mathematical models only',
        swarm: swarm.results.filter(result => result.enabled).map(result => result.name),
      },
      marketRecord: {
        id: market.id,
        title: market.title,
        description: market.description,
        sport: market.sport,
        category: market.category,
        outcome: market.yesOutcome,
        odds: round(micro.entryPrice, 4),
        volume: market.volume,
        liquidity: market.liquidity,
        expiresAt: market.endDate,
        isActive: true,
      },
    };
  }

  async executeTrade(prediction, predictionDbId) {
    return this.executor.execute(prediction, predictionDbId);
  }

  passesStaticFilters(market) {
    if (!market.yesTokenId) return false;
    if (market.endDate <= new Date()) return false;

    // Para partidos del día usamos umbrales relajados
    const classification = classifyMarket(market);
    const isDailyMatch = classification.code === MARKET_TYPES.DAILY_MATCH.code;
    const minLiquidity = isDailyMatch
      ? config.strategy.dailyMatchMinLiquidity
      : config.strategy.minLiquidity;
    const minVolume = isDailyMatch
      ? config.strategy.dailyMatchMinVolume
      : config.strategy.minVolume;

    if (market.liquidity < minLiquidity) return false;
    if (Math.max(market.volume, market.volume24h) < minVolume) return false;
    return true;
  }

  analyzeOrderBook(book, fallbackPrice) {
    const bids = normalizeLevels(book.bids).sort((a, b) => b.price - a.price);
    const asks = normalizeLevels(book.asks).sort((a, b) => a.price - b.price);
    const bestBid = bids[0]?.price ?? null;
    const bestAsk = asks[0]?.price ?? null;

    if (bestBid === null && bestAsk === null && fallbackPrice === null) return null;

    const mid = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : fallbackPrice;
    const entryPrice = bestAsk !== null ? bestAsk : mid;
    const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : config.strategy.maxSpread;
    const bidDepth = bids.slice(0, 5).reduce((sum, level) => sum + level.size, 0);
    const askDepth = asks.slice(0, 5).reduce((sum, level) => sum + level.size, 0);

    if (!entryPrice || entryPrice <= 0.02 || entryPrice >= 0.98) return null;

    return {
      bestBid,
      bestAsk,
      entryPrice,
      spread,
      marketProbability: clamp(mid, 0.01, 0.99),
      bidDepth,
      askDepth,
    };
  }

  estimateProbability(market, micro) {
    const liquiditySkew = (micro.bidDepth - micro.askDepth) / Math.max(micro.bidDepth + micro.askDepth, 1);
    const momentum = clamp((market.yesPrice || micro.marketProbability) - micro.marketProbability, -0.05, 0.05);
    const liquidityQuality = clamp(Math.log10(Math.max(market.liquidity, 1)) / 8, 0, 0.08);
    const volumeQuality = clamp(Math.log10(Math.max(market.volume, 1)) / 10, 0, 0.06);
    const spreadPenalty = clamp(micro.spread * 0.45, 0, 0.05);

    const probability = clamp(
      micro.marketProbability + (liquiditySkew * 0.06) + momentum + liquidityQuality + volumeQuality - spreadPenalty,
      0.01,
      0.99,
    );

    const summary = [
      `market mid ${round(micro.marketProbability * 100, 2)}%`,
      `book skew ${round(liquiditySkew, 3)}`,
      `spread ${round(micro.spread, 4)}`,
      `liquidity ${round(market.liquidity, 0)}`,
    ].join(', ');

    return { probability, liquiditySkew, momentum, summary };
  }

  applySwarm(baseSignal, swarm) {
    const probability = clamp(baseSignal.probability + swarm.probabilityShift, 0.01, 0.99);
    const summary = [
      baseSignal.summary,
      `swarm score ${swarm.score}`,
      `swarm shift ${swarm.probabilityShift}`,
      `agreement ${swarm.agreement}`,
    ].join(', ');

    return {
      ...baseSignal,
      probability,
      summary,
    };
  }

  expectedValue(probability, entryPrice) {
    return ((probability * (1 - entryPrice)) - ((1 - probability) * entryPrice)) / entryPrice;
  }

  undervaluationGap(modelProbability, impliedProbability) {
    return modelProbability - impliedProbability;
  }

  confidenceScore({ edge, expectedValue, spread, liquidity, volume }) {
    const edgeScore = clamp(edge / 0.15, 0, 1) * 35;
    const evScore = clamp(expectedValue / 0.35, 0, 1) * 25;
    const spreadScore = clamp(1 - (spread / config.strategy.maxSpread), 0, 1) * 20;
    const liquidityScore = clamp(Math.log10(Math.max(liquidity, 1)) / 6, 0, 1) * 10;
    const volumeScore = clamp(Math.log10(Math.max(volume, 1)) / 6, 0, 1) * 10;
    return clamp(edgeScore + evScore + spreadScore + liquidityScore + volumeScore, 0, 100);
  }

  signalQuality({ confidence, probability, expectedValue, undervaluationGap, swarm, riskGate = { allowed: true } }) {
    const highProbability = probability >= config.strategy.highProbabilityThreshold;
    const highConfidence = confidence >= config.strategy.highConfidenceThreshold;
    const positiveSwarm = swarm.score > 0 && swarm.agreement >= config.strategy.highSwarmAgreementThreshold;
    const strongValue = expectedValue >= Math.max(config.strategy.minExpectedValue * 2, 0.08)
      && undervaluationGap >= config.strategy.minUndervaluationGap;
    const gradeScore = [
      highProbability,
      highConfidence,
      positiveSwarm,
      strongValue,
    ].filter(Boolean).length;

    const classification = positiveSwarm && highConfidence && strongValue
      ? 'SWARM_CONFIRMED'
      : highConfidence && strongValue
        ? 'VALUE_ONLY'
        : 'WATCHLIST';

    return {
      grade: gradeScore >= 4 ? 'A+' : gradeScore === 3 ? 'A' : gradeScore === 2 ? 'B' : 'C',
      classification,
      highProbability,
      highConfidence,
      positiveSwarm,
      strongValue,
      automaticExecutionAllowed: config.execution.autoExecuteSignals && riskGate.allowed,
      executionBlockedReason: riskGate.allowed ? null : riskGate.reason,
      thresholds: {
        probability: config.strategy.highProbabilityThreshold,
        confidence: config.strategy.highConfidenceThreshold,
        swarmAgreement: config.strategy.highSwarmAgreementThreshold,
      },
    };
  }

  reject(market, reason) {
    this.lastRejection = {
      marketId: market?.id || null,
      title: market?.title || '',
      reason,
    };
    logger.debug(`Rejected market ${market.id}: ${reason}`);
    return null;
  }
}

function normalizeLevels(levels) {
  if (!Array.isArray(levels)) return [];
  return levels
    .map((level) => ({
      price: toNumber(level.price, null),
      size: toNumber(level.size, 0),
    }))
    .filter((level) => level.price !== null && level.price > 0 && level.size > 0);
}

module.exports = { PredictionEngine };

function compareMarketPriority(a, b) {
  const sportDiff = sportPriority(b) - sportPriority(a);
  if (sportDiff !== 0) return sportDiff;
  const volumeDiff = marketActivityScore(b) - marketActivityScore(a);
  if (volumeDiff !== 0) return volumeDiff;
  return String(a.title || '').localeCompare(String(b.title || ''));
}

function marketActivityScore(market) {
  return Math.max(Number(market.volume24h || 0), Number(market.volume || 0)) + Number(market.liquidity || 0);
}

function sportPriority(market) {
  return market.sport && market.sport !== 'general' ? 1 : 0;
}
