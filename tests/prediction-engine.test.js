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
