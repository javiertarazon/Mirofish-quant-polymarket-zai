const test = require('node:test');
const assert = require('node:assert/strict');
const { getNewsDomainsForSport, getSourceProfile, normalizeSport } = require('../src/services/sports/SportsSourceRegistry');
const { inferSportFromTitle } = require('../src/utils/teams');

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

test('sport inference detects UFC and boxing markets', () => {
  assert.equal(inferSportFromTitle('UFC 320: Jones vs Aspinall'), 'UFC');
  assert.equal(inferSportFromTitle('WBC heavyweight title: Fury vs Usyk'), 'Boxing');
  assert.equal(normalizeSport('boxeo'), 'Boxing');
});
