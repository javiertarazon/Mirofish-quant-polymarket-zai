const test = require('node:test');
const assert = require('node:assert/strict');
const { RiskManager } = require('../src/engine/RiskManager');

test('RiskManager returns zero stake when there is no edge', () => {
  const db = {
    getOpenTradeCount: async () => 0,
    getTodayProfitLoss: async () => 0,
  };
  const manager = new RiskManager(db);

  assert.equal(manager.calculateStake(0.5, 0.55), 0);
});

test('RiskManager caps stake by configured max stake', () => {
  const db = {
    getOpenTradeCount: async () => 0,
    getTodayProfitLoss: async () => 0,
  };
  const manager = new RiskManager(db);

  assert.ok(manager.calculateStake(0.7, 0.45) <= 5);
});

test('RiskManager exposes Kelly sizing diagnostics', () => {
  const db = {
    getOpenTradeCount: async () => 0,
    getTodayProfitLoss: async () => 0,
  };
  const manager = new RiskManager(db);
  const sizing = manager.calculateStakeDetails(0.7, 0.45);

  assert.ok(sizing.decimalOdds > 2);
  assert.ok(sizing.fullKelly > 0);
  assert.ok(sizing.stake > 0);
});
