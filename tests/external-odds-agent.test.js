const test = require('node:test');
const assert = require('node:assert/strict');
const { ExternalOddsAgent } = require('../src/agents/ExternalOddsAgent');

test('ExternalOddsAgent scores positive when external consensus exceeds Polymarket entry', async () => {
  const agent = new ExternalOddsAgent();
  agent.odds = {
    enabled: true,
    fetchEventOdds: async () => [
      {
        bookmakers: [
          {
            title: 'Book A',
            markets: [
              {
                key: 'h2h',
                outcomes: [
                  { name: 'Athletics', price: 1.7 },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const result = await agent.analyze({
    market: {
      title: 'Pittsburgh Pirates vs. Athletics',
      sport: 'MLB',
      yesOutcome: 'Athletics',
    },
    micro: {
      entryPrice: 0.5,
    },
  });

  assert.ok(result.enabled);
  assert.ok(result.score > 0);
  assert.equal(result.data.prices.length, 1);
});
