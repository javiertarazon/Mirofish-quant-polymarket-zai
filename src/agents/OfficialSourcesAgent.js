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
    const records = officialContext.records || [];
    const fetchedPages = noteNumber(officialContext.notes, 'official pages fetched');
    const relevantPages = noteNumber(officialContext.notes, 'official relevant pages');
    const coverage = scrapeableSources.length ? Math.min(1, fetchedPages / Math.min(scrapeableSources.length, 4)) : 0;
    
    // Deeper Statistical Analysis: Evaluate Standings/Records
    let statsScore = 0;
    if (records.length >= 2 && teams.home && teams.away) {
      const homeRec = records.find(r => r.team?.toLowerCase().includes(teams.home.toLowerCase()));
      const awayRec = records.find(r => r.team?.toLowerCase().includes(teams.away.toLowerCase()));
      
      if (homeRec && awayRec) {
        if (homeRec.pct !== undefined && awayRec.pct !== undefined) {
          statsScore = homeRec.pct - awayRec.pct; // Win rate differential
        } else if (homeRec.points !== undefined && awayRec.points !== undefined) {
          const totalPoints = Math.max(homeRec.points + awayRec.points, 1);
          statsScore = (homeRec.points - awayRec.points) / totalPoints;
        } else if (homeRec.rank !== undefined && awayRec.rank !== undefined) {
          statsScore = (awayRec.rank - homeRec.rank) * 0.05; // Lower rank is better
        }
      }
    } else if (records.length >= 1 && teams.home) {
      // Just check how good the home team is relative to the field
      const homeRec = records.find(r => r.team?.toLowerCase().includes(teams.home.toLowerCase()));
      if (homeRec) {
        if (homeRec.pct !== undefined) statsScore = (homeRec.pct - 0.5) * 2;
        if (homeRec.rank !== undefined) statsScore = homeRec.rank <= 5 ? 0.3 : (homeRec.rank >= 15 ? -0.3 : 0);
      }
    }

    // Clamp statsScore between -1 and 1
    statsScore = Math.max(-1, Math.min(1, statsScore));

    const relevance = relevantPages > 0 || relevantFixtures.length > 0 || records.length > 0 ? 1 : 0;
    const baseScore = relevance ? 0.1 : 0; 
    const score = baseScore + (statsScore * 0.4); 
    
    const confidence = Math.min(1, 0.25 + coverage * 0.3 + (records.length > 0 ? 0.2 : 0) + Math.min(0.2, relevantFixtures.length * 0.05));

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
