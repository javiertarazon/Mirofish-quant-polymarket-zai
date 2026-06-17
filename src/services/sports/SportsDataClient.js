const axios = require('axios');
const config = require('../../core/Config');
const { OfficialStatsClient } = require('./OfficialStatsClient');

class SportsDataClient {
  constructor() {
    this.enabled = Boolean(config.sportsApi.apiKey);
    const headers = {};
    if (config.sportsApi.apiKey) headers['x-apisports-key'] = config.sportsApi.apiKey;
    if (config.sportsApi.host) headers['x-rapidapi-host'] = config.sportsApi.host;

    this.client = axios.create({
      baseURL: config.sportsApi.baseUrl,
      timeout: config.polymarket.requestTimeoutMs,
      headers,
    });
    this.officialStats = new OfficialStatsClient();
  }

  async fetchOfficialContext({ sport, teams, date }) {
    return this.officialStats.fetchContext({ sport, teams, date });
  }

  async searchFixtures({ home, away, date }) {
    if (!this.enabled || (!home && !away)) return [];

    const params = {
      timezone: config.sportsApi.timezone,
    };
    if (date) params.date = date.toISOString().slice(0, 10);

    try {
      const { data } = await this.client.get('/fixtures', { params });
      const fixtures = data.response || [];
      return fixtures.filter((fixture) => fixtureMatches(fixture, home, away));
    } catch (_) {
      return [];
    }
  }
}

function fixtureMatches(fixture, home, away) {
  const fixtureHome = fixture?.teams?.home?.name?.toLowerCase() || '';
  const fixtureAway = fixture?.teams?.away?.name?.toLowerCase() || '';
  const expectedHome = String(home || '').toLowerCase();
  const expectedAway = String(away || '').toLowerCase();

  return (!expectedHome || fixtureHome.includes(expectedHome) || expectedHome.includes(fixtureHome))
    && (!expectedAway || fixtureAway.includes(expectedAway) || expectedAway.includes(fixtureAway));
}

module.exports = { SportsDataClient };
