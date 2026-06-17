const { SportsDataClient } = require('../services/sports/SportsDataClient');
const { getSourceProfile, normalizeSport } = require('../services/sports/SportsSourceRegistry');
const { extractTeams, inferSportFromTitle } = require('../utils/teams');
const { agentResult } = require('./AgentResult');

class OfficialSourcesAgent {
  constructor() {
    this.name = 'official_sources';
    this.sports = new SportsDataClient();
  }

  async analyze({ market }) {
    const sport = normalizeSport(market.sport && market.sport !== 'general' ? market.sport : inferSportFromTitle(market.title));
    const teams = extractTeams(market.title);
    const profile = getSourceProfile(sport);
    const officialContext = await this.sports.fetchOfficialContext({ sport, teams, date: market.endDate });
    const scrapeableSources = [
      ...profile.officialStats,
      ...profile.officialNews,
    ].filter(source => source.scrapeable);
    const relevantFixtures = officialContext.fixtures || [];
    const fetchedPages = noteNumber(officialContext.notes, 'official pages fetched');
    const relevantPages = noteNumber(officialContext.notes, 'official relevant pages');
    const coverage = scrapeableSources.length ? Math.min(1, fetchedPages / Math.min(scrapeableSources.length, 4)) : 0;
    const relevance = relevantPages > 0 || relevantFixtures.length > 0 ? 1 : 0;
    const score = relevance ? 0.35 : 0;
    const confidence = Math.min(1, 0.25 + coverage * 0.45 + Math.min(0.3, relevantFixtures.length * 0.08));

    return agentResult({
      name: this.name,
      score,
      confidence,
      probabilityShift: score * confidence * 0.02,
      notes: [
        `sport ${sport}`,
        `${scrapeableSources.length} scrapeable official source(s)`,
        `${relevantFixtures.length} relevant official item(s)`,
        `coverage ${coverage.toFixed(2)}`,
      ],
      data: {
        sport,
        teams,
        scrapeableSources,
        officialItems: relevantFixtures.slice(0, 6),
        officialNotes: officialContext.notes,
      },
    });
  }
}

function noteNumber(notes, prefix) {
  const note = (notes || []).find(item => String(item).startsWith(prefix));
  const match = String(note || '').match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

module.exports = { OfficialSourcesAgent };
