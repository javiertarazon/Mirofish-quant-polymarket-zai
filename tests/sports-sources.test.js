const test = require('node:test');
const assert = require('node:assert/strict');
const { getNewsDomainsForSport, getSourceProfile, normalizeSport } = require('../src/services/sports/SportsSourceRegistry');
const { inferSportFromTitle } = require('../src/utils/teams');
const { PolymarketClient } = require('../src/services/PolymarketClient');

test('sports source registry exposes official and external sources for combat sports', () => {
  const ufc = getSourceProfile('UFC');
  const boxing = getSourceProfile('Boxing');

  assert.ok(ufc.officialStats.some(source => source.name === 'UFC Stats'));
  assert.ok(ufc.officialNews.some(source => source.domain === 'ufc.com'));
  assert.ok(boxing.officialStats.some(source => source.name === 'BoxRec'));
  assert.ok(boxing.officialNews.some(source => source.domain === 'wbcboxing.com'));
});

test('news domain selection includes official and external domains', () => {
  const domains = getNewsDomainsForSport('MLB');

  assert.ok(domains.includes('mlb.com'));
  assert.ok(domains.includes('espn.com'));
});

test('official sports sources mark web pages as scrapeable', () => {
  const nba = getSourceProfile('NBA');
  const nfl = getSourceProfile('NFL');

  assert.ok(nba.officialStats.some(source => source.scrapeable));
  assert.ok(nba.officialNews.some(source => source.scrapeable));
  assert.ok(nfl.officialStats.some(source => source.scrapeable));
  assert.ok(nfl.officialNews.some(source => source.scrapeable));
});

test('sport inference detects UFC and boxing markets', () => {
  assert.equal(inferSportFromTitle('UFC 320: Jones vs Aspinall'), 'UFC');
  assert.equal(inferSportFromTitle('WBC heavyweight title: Fury vs Usyk'), 'Boxing');
  assert.equal(normalizeSport('boxeo'), 'Boxing');
  assert.equal(inferSportFromTitle('UK election called by June 30, England'), 'general');
});

test('Polymarket client infers sports from slug category and tags', () => {
  const client = new PolymarketClient();
  const [market] = client.parseMarketsFromEvents([{
    id: 'event-1',
    title: 'Championship market',
    slug: 'nba-finals-game-7',
    category: 'Sports',
    tags: [{ label: 'NBA' }],
    markets: [{
      id: 'market-1',
      conditionId: 'condition-1',
      active: true,
      closed: false,
      question: 'Will the Lakers win?',
      outcomes: JSON.stringify(['Yes', 'No']),
      clobTokenIds: JSON.stringify(['yes-token', 'no-token']),
      outcomePrices: JSON.stringify(['0.45', '0.55']),
      volumeNum: 10000,
      liquidityNum: 5000,
      endDate: new Date(Date.now() + 86400000).toISOString(),
    }],
  }]);

  assert.equal(market.sport, 'NBA');
});
