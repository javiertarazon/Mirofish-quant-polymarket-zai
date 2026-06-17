const test = require('node:test');
const assert = require('node:assert/strict');
const { TopTraderAgent } = require('../src/agents/TopTraderAgent');

test('TopTraderAgent scores relevant recent flow for matching market outcomes', async () => {
  const agent = new TopTraderAgent({
    fetchTopTraderFlow: async () => [
      {
        rank: 1,
        userName: 'sharp',
        wallet: '0x1',
        pnl: 1000,
        volume: 10000,
        trades: [
          {
            title: 'Pittsburgh Pirates vs. Athletics',
            slug: 'mlb-pit-oak-2026-06-15',
            side: 'BUY',
            outcome: 'Athletics',
            size: 2000,
            price: 0.55,
            timestamp: 1781560000,
          },
        ],
      },
    ],
  });

  const result = await agent.analyze({
    market: {
      id: '0xabc',
      title: 'Pittsburgh Pirates vs. Athletics',
      slug: 'mlb-pit-oak-2026-06-15',
      sport: 'MLB',
      yesOutcome: 'Athletics',
      noOutcome: 'Pittsburgh Pirates',
    },
  });

  assert.ok(result.enabled);
  assert.ok(result.score > 0);
  assert.equal(result.data.relevantTrades.length, 1);
  assert.ok(Math.abs(result.data.yesFlow - 1100) < 0.0001);
});
