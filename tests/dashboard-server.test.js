const test = require('node:test');
const assert = require('node:assert/strict');
const { createCycleController, getPublicConfig } = require('../src/ui/dashboardServer');

test('dashboard exposes public config without secrets', () => {
  const body = getPublicConfig();

  assert.equal(body.tradingMode, 'shadow');
  assert.equal(typeof body.newsApiConfigured, 'boolean');
  assert.equal(body.newsApiKey, undefined);
  assert.equal(body.apiSportsKey, undefined);
});

test('dashboard cycle controller starts one shadow cycle and records result', async () => {
  const controller = createCycleController(() => ({
    async initialize() {
      return true;
    },
    async startTradingCycle() {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return {
        ok: true,
        stats: {
          candidates: 2,
          analyzed: 2,
          rejected: 1,
          signals: 1,
          executed: 1,
        },
        rejectionSummary: { 'EV below threshold': 1 },
      };
    },
    async shutdown() {},
  }));

  const accepted = controller.start();
  assert.equal(accepted.status, 202);
  assert.equal(accepted.body.accepted, true);

  const duplicate = controller.start();
  assert.equal(duplicate.status, 409);

  await waitFor(() => controller.getState().running === false);
  const state = controller.getState();
  assert.equal(state.lastError, null);
  assert.equal(state.lastResult.stats.executed, 1);
});

function waitFor(predicate) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - started > 500) {
        clearInterval(timer);
        reject(new Error('Timed out waiting for condition'));
      }
    }, 5);
  });
}
