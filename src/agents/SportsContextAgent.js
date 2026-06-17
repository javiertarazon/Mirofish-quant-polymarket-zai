const { getSourceProfile, normalizeSport } = require('../services/sports/SportsSourceRegistry');
const { SportsDataClient } = require('../services/sports/SportsDataClient');
const { distanceMiles, extractTeams, findLocation, inferSportFromTitle } = require('../utils/teams');
const { agentResult } = require('./AgentResult');

class SportsContextAgent {
  constructor() {
    this.name = 'sports_context';
    this.sports = new SportsDataClient();
  }

  async analyze({ market }) {
    const teams = extractTeams(market.title);
    const sport = normalizeSport(market.sport && market.sport !== 'general' ? market.sport : inferSportFromTitle(market.title));
    const sourceProfile = getSourceProfile(sport);
    const homeLocation = findLocation(teams.home);
    const awayLocation = findLocation(teams.away);
    const travelMiles = distanceMiles(awayLocation, homeLocation);
    const [fixtures, officialContext] = await Promise.all([
      this.sports.searchFixtures({ home: teams.home, away: teams.away, date: market.endDate }),
      this.sports.fetchOfficialContext({ sport, teams, date: market.endDate }),
    ]);

    let score = 0;
    const notes = [];

    if (travelMiles !== null) {
      const travelPenalty = Math.min(0.04, travelMiles / 60000);
      score -= travelPenalty / 0.04;
      notes.push(`away travel ${Math.round(travelMiles)} miles`);
    } else {
      notes.push('team travel unknown');
    }

    if (fixtures.length) notes.push(`${fixtures.length} fixture match(es) from sports API`);
    if (officialContext.fixtures.length) notes.push(`${officialContext.fixtures.length} official fixture match(es)`);
    if (!teams.home && !teams.away && officialContext.fixtures.length) {
      const futureScore = Math.min(0.35, officialContext.fixtures.length * 0.04);
      score += futureScore;
      notes.push(`official futures context ${futureScore.toFixed(3)}`);
    }
    if (officialContext.records.length >= 2) {
      const recordScore = recordDifferential(officialContext.records, teams);
      score += recordScore * 0.25;
      notes.push(`official record differential ${recordScore.toFixed(3)}`);
    }
    if (sport !== 'general') notes.push(`sport ${sport}`);
    const sportConfidence = sport !== 'general' ? 0.2 : 0;
    const confidence = travelMiles !== null
      ? 0.45 + sportConfidence + Math.min(0.25, (fixtures.length + officialContext.fixtures.length) * 0.1)
      : 0.15 + sportConfidence + Math.min(0.2, officialContext.records.length * 0.05);

    return agentResult({
      name: this.name,
      score,
      confidence,
      probabilityShift: score * confidence * 0.025,
      notes,
      data: {
        teams,
        sport,
        officialStatsSources: sourceProfile.officialStats,
        officialNewsSources: sourceProfile.officialNews,
        externalNewsDomains: sourceProfile.externalNewsDomains,
        homeLocation,
        awayLocation,
        travelMiles: travelMiles === null ? null : Math.round(travelMiles),
        fixtures: fixtures.slice(0, 3),
        officialContext: {
          sources: officialContext.sources,
          records: officialContext.records.slice(0, 4),
          fixtures: officialContext.fixtures.slice(0, 3),
          notes: officialContext.notes,
        },
      },
    });
  }
}

function recordDifferential(records, teams) {
  const home = findRecord(records, teams.home);
  const away = findRecord(records, teams.away);
  if (!home || !away) return 0;
  return Math.max(-1, Math.min(1, (home.pct || 0) - (away.pct || 0)));
}

function findRecord(records, team) {
  const expected = String(team || '').toLowerCase();
  if (!expected) return null;
  return records.find(record => {
    const name = String(record.team || '').toLowerCase();
    return name.includes(expected) || expected.includes(name);
  }) || null;
}

module.exports = { SportsContextAgent };
