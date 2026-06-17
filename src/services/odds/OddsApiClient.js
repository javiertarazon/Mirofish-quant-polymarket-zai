const axios = require('axios');
const config = require('../../core/Config');

const SPORT_KEYS = {
  MLB: 'baseball_mlb',
  NBA: 'basketball_nba',
  NFL: 'americanfootball_nfl',
  Soccer: 'soccer',
  UFC: 'mma_mixed_martial_arts',
  Boxing: 'boxing_boxing',
};

class OddsApiClient {
  constructor() {
    this.enabled = Boolean(config.odds.apiKey);
    this.client = axios.create({
      baseURL: config.odds.baseUrl,
      timeout: config.polymarket.requestTimeoutMs,
    });
  }

  async fetchEventOdds({ sport, teams }) {
    if (!this.enabled) return [];
    const sportKey = SPORT_KEYS[sport];
    if (!sportKey) return [];

    try {
      const { data } = await this.client.get(`/v4/sports/${sportKey}/odds`, {
        params: {
          apiKey: config.odds.apiKey,
          regions: config.odds.regions,
          markets: 'h2h',
          oddsFormat: 'decimal',
          dateFormat: 'iso',
        },
      });
      const events = Array.isArray(data) ? data : [];
      return events.filter(event => eventMatchesTeams(event, teams));
    } catch (_) {
      return [];
    }
  }
}

function eventMatchesTeams(event, teams) {
  const expected = [teams?.home, teams?.away].map(value => String(value || '').toLowerCase()).filter(Boolean);
  if (!expected.length) return false;
  const names = [event.home_team, event.away_team].map(value => String(value || '').toLowerCase());
  return expected.every(team => names.some(name => name.includes(team) || team.includes(name)));
}

function impliedProbabilityFromDecimal(decimalOdds) {
  const odds = Number(decimalOdds);
  return odds > 1 ? 1 / odds : null;
}

module.exports = { OddsApiClient, impliedProbabilityFromDecimal };
