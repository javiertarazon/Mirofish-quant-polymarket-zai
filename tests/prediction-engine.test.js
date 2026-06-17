const test = require('node:test');
const assert = require('node:assert/strict');
const { PredictionEngine } = require('../src/engine/PredictionEngine');

test('PredictionEngine analyzes orderbook and derives entry price from best ask', () => {
  const db = {
    getOpenTradeCount: async () => 0,
    getTodayProfitLoss: async () => 0,
  };
  const engine = new PredictionEngine(db);
  const micro = engine.analyzeOrderBook({
    bids: [{ price: '0.48', size: '100' }],
    asks: [{ price: '0.52', size: '100' }],
  }, 0.5);

  assert.equal(micro.entryPrice, 0.52);
  assert.equal(Math.round(micro.spread * 100), 4);
  assert.equal(micro.marketProbability, 0.5);
});

test('PredictionEngine records rejection reason when orderbook is unavailable', async () => {
  const db = {
    getOpenTradeCount: async () => 0,
    getTodayProfitLoss: async () => 0,
  };
  const engine = new PredictionEngine(db);
  engine.client = {
    fetchOrderBook: async () => null,
  };

  const prediction = await engine.generatePrediction({
    id: 'market-1',
    title: 'Example market',
    yesTokenId: 'token-1',
  });

  assert.equal(prediction, null);
  assert.deepEqual(engine.lastRejection, {
    marketId: 'market-1',
    title: 'Example market',
    reason: 'orderbook unavailable',
  });
});

test('PredictionEngine calculates undervaluation gap from model and implied probabilities', () => {
  const db = {
    getOpenTradeCount: async () => 0,
    getTodayProfitLoss: async () => 0,
  };
  const engine = new PredictionEngine(db);

  assert.equal(engine.undervaluationGap(0.62, 0.5), 0.12);
});

test('PredictionEngine balances scanned sports markets instead of filling cycle with one sport', () => {
  const db = {
    getOpenTradeCount: async () => 0,
    getTodayProfitLoss: async () => 0,
  };
  const engine = new PredictionEngine(db);
  const markets = [
    ...makeMarkets('Soccer', 30),
    ...makeMarkets('NBA', 4),
    ...makeMarkets('UFC', 4),
    ...makeMarkets('F1', 4),
    ...makeMarkets('NFL', 2),
  ];

  const selected = engine.selectMarketsForCycle(markets);
  const sports = new Set(selected.map((market) => market.sport));

  assert.equal(selected.length, 20);
  assert.ok(sports.has('Soccer'));
  assert.ok(sports.has('NBA'));
  assert.ok(sports.has('UFC'));
  assert.ok(sports.has('F1'));
  assert.ok(sports.has('NFL'));
  assert.ok(selected.filter((market) => market.sport === 'Soccer').length < 20);
});

test('PredictionEngine keeps valid signals when execution is blocked by risk limits', async () => {
  const db = {
    getOpenTradeCount: async () => 99,
    getTodayProfitLoss: async () => 0,
  };
  const engine = new PredictionEngine(db);
  engine.client = {
    fetchOrderBook: async () => ({
      bids: [{ price: '0.39', size: '1000' }],
      asks: [{ price: '0.40', size: '100' }],
    }),
  };
  engine.swarm = {
    analyze: async () => ({
      score: 0.5,
      probabilityShift: 0.02,
      confidenceBoost: 5,
      agreement: 0.8,
      results: [],
    }),
  };

  const prediction = await engine.generatePrediction({
    id: 'nba-risk-blocked',
    title: 'Will the Lakers win?',
    yesTokenId: 'yes-token',
    yesOutcome: 'Yes',
    yesPrice: 0.4,
    liquidity: 1_000_000,
    volume: 1_000_000,
  });

  assert.ok(prediction);
  assert.equal(prediction.reasoning.quality.automaticExecutionAllowed, false);
  assert.match(prediction.reasoning.quality.executionBlockedReason, /max open trades reached/);
});

function makeMarkets(sport, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${sport}-${index}`,
    title: `${sport} market ${index}`,
    sport,
    volume: 100_000 - index,
    volume24h: 50_000 - index,
    liquidity: 10_000 - index,
  }));
}
