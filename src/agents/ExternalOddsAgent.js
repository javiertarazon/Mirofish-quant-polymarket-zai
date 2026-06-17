const { OddsApiClient, impliedProbabilityFromDecimal } = require('../services/odds/OddsApiClient');
const { normalizeSport } = require('../services/sports/SportsSourceRegistry');
const { extractTeams, inferSportFromTitle } = require('../utils/teams');
const { agentResult, disabledAgent } = require('./AgentResult');

class ExternalOddsAgent {
  constructor() {
    this.name = 'external_odds';
    this.odds = new OddsApiClient();
  }

  async analyze({ market, micro }) {
    if (!this.odds.enabled) return disabledAgent(this.name, 'ODDS_API_KEY missing');

    const sport = normalizeSport(market.sport && market.sport !== 'general' ? market.sport : inferSportFromTitle(market.title));
    const teams = extractTeams(market.title);
    const events = await this.odds.fetchEventOdds({ sport, teams });
    const prices = collectOutcomePrices(events, market.yesOutcome);
    const consensus = consensusProbability(prices);
    const score = consensus === null ? 0 : clamp((consensus - micro.entryPrice) / 0.15, -1, 1);
    const confidence = Math.min(1, prices.length / 8);

    return agentResult({
      name: this.name,
      score,
      confidence,
      probabilityShift: score * confidence * 0.025,
      notes: [
        `${events.length} external odds event(s)`,
        `${prices.length} bookmaker price(s)`,
        consensus === null ? 'no matching outcome consensus' : `external implied ${consensus.toFixed(4)}`,
      ],
      data: {
        sport,
        teams,
        consensusProbability: consensus,
        polymarketEntryPrice: micro.entryPrice,
        prices: prices.slice(0, 12),
      },
    });
  }
}

function collectOutcomePrices(events, outcome) {
  const expected = String(outcome || '').toLowerCase();
  const prices = [];

  for (const event of events) {
    for (const bookmaker of event.bookmakers || []) {
      for (const market of bookmaker.markets || []) {
        if (market.key !== 'h2h') continue;
        for (const item of market.outcomes || []) {
          const name = String(item.name || '').toLowerCase();
          if (!expected || (!name.includes(expected) && !expected.includes(name))) continue;
          const implied = impliedProbabilityFromDecimal(item.price);
          if (implied === null) continue;
          prices.push({
            bookmaker: bookmaker.title,
            outcome: item.name,
            decimalOdds: Number(item.price),
            impliedProbability: implied,
          });
        }
      }
    }
  }

  return prices;
}

function consensusProbability(prices) {
  if (!prices.length) return null;
  return prices.reduce((sum, price) => sum + price.impliedProbability, 0) / prices.length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

module.exports = { ExternalOddsAgent };
