const test = require('node:test');
const assert = require('node:assert/strict');
const { OfficialSourcesAgent } = require('../src/agents/OfficialSourcesAgent');

test('official sources agent rewards relevant scrapeable official coverage', async () => {
  const agent = new OfficialSourcesAgent();
  agent.sports = {
    fetchOfficialContext: async () => ({
      records: [],
      fixtures: [
        { source: 'FIFA News', title: 'FIFA World Cup draw update', url: 'https://www.fifa.com/news/example' },
      ],
      notes: [
        'scrapeable official Soccer sources 7',
        'official pages fetched 4',
        'official relevant pages 1',
      ],
    }),
  };

  const result = await agent.analyze({
    market: {
      sport: 'Soccer',
      title: 'Will Brazil win the 2026 FIFA World Cup?',
      endDate: new Date('2026-07-19T00:00:00Z'),
    },
  });

  assert.equal(result.enabled, true);
  assert.ok(result.score > 0);
  assert.ok(result.confidence > 0.5);
  assert.ok(result.notes.some(note => note.includes('scrapeable official source')));
});
