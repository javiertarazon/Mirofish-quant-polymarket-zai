const test = require('node:test');
const assert = require('node:assert/strict');
const { SwarmOrchestrator } = require('../src/agents/SwarmOrchestrator');
const { scoreText } = require('../src/utils/sentiment');

test('sentiment utility scores positive and negative sports text', () => {
  assert.ok(scoreText('star player healthy and cleared to return') > 0);
  assert.ok(scoreText('star player injured and doubtful after travel fatigue') < 0);
});

test('swarm combines agent votes without exceeding configured bounds', async () => {
  const client = {
    fetchLeaderboard: async () => [{ pnl: 100, vol: 1000 }],
    fetchTopTraderFlow: async () => [{ pnl: 100, volume: 1000, trades: [] }],
    fetchHolders: async () => [{ token: 'x', holders: [{ amount: 10 }, { amount: 5 }] }],
  };
  const swarm = new SwarmOrchestrator(client);
  const result = await swarm.analyze({
    market: {
      id: '0xabc',
      title: 'Boston Celtics vs New York Knicks',
      sport: 'NBA',
      liquidity: 10000,
      endDate: new Date(),
    },
    micro: {
      bidDepth: 1500,
      askDepth: 1000,
      spread: 0.03,
    },
    baseSignal: { probability: 0.55 },
  });

  assert.ok(result.results.length >= 5);
  assert.ok(Math.abs(result.probabilityShift) <= 0.08);
});
