const { NewsApiClient } = require('../services/news/NewsApiClient');
const { extractTeams, inferSportFromTitle } = require('../utils/teams');
const { agentResult } = require('./AgentResult');

class TeamRosterAgent {
  constructor() {
    this.name = 'team_roster';
    this.news = new NewsApiClient();
    this.injuryKeywords = ['injury', 'injured', 'suspension', 'suspended', 'out', 'inactive', 'banned', 'misses', 'lesión', 'lesionado', 'suspendido', 'baja'];
  }

  async analyze({ market }) {
    const teams = extractTeams(market.title);
    if (!teams.home && !teams.away) {
      return agentResult({ name: this.name, enabled: false, notes: ['no specific teams detected'] });
    }

    const sport = market.sport && market.sport !== 'general' ? market.sport : inferSportFromTitle(market.title);
    const nonRosterSports = ['F1', 'MotoGP', 'IndyCar', 'FormulaE'];
    if (nonRosterSports.includes(sport)) {
      return agentResult({ name: this.name, enabled: false, notes: ['not applicable for motorsports'] });
    }

    const queryTerms = [];
    if (teams.home) queryTerms.push(`"${teams.home}"`);
    if (teams.away) queryTerms.push(`"${teams.away}"`);
    const teamQuery = queryTerms.length > 1 ? `(${queryTerms.join(' OR ')})` : queryTerms[0];
    const keywordQuery = `(${this.injuryKeywords.join(' OR ')})`;
    const query = `${teamQuery} AND ${keywordQuery}`;

    try {
      const articles = await this.news.search(query, { disableDomainFallback: false });
      
      let severeHits = 0;
      let targetTeam = null;

      articles.forEach(article => {
        const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
        if (this.injuryKeywords.some(k => text.includes(k))) {
          severeHits++;
          if (teams.home && text.includes(teams.home.toLowerCase())) targetTeam = teams.home;
          if (teams.away && text.includes(teams.away.toLowerCase())) targetTeam = teams.away;
        }
      });

      if (severeHits === 0) {
        return agentResult({
          name: this.name,
          score: 0,
          confidence: 0.1,
          probabilityShift: 0,
          notes: ['no severe roster issues found'],
        });
      }

      // If we found injuries, it's a negative shift. We penalize the probability.
      // A negative score pushes the probability down.
      const score = -0.5; 
      const confidence = Math.min(1, 0.2 + (severeHits * 0.15));
      
      return agentResult({
        name: this.name,
        score,
        confidence,
        probabilityShift: score * confidence * 0.04, // max 2% negative shift per agent weight
        notes: [
          `found ${severeHits} reports mentioning injuries/suspensions`,
          targetTeam ? `affects ${targetTeam}` : 'affected team ambiguous',
        ],
        data: { severeHits, targetTeam },
      });
    } catch (err) {
      return agentResult({ name: this.name, enabled: false, notes: [`error: ${err.message}`] });
    }
  }
}

module.exports = { TeamRosterAgent };
