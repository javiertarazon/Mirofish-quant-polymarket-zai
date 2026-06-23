const { NewsApiClient } = require('../services/news/NewsApiClient');
const { extractTeams, inferSportFromTitle } = require('../utils/teams');
const { agentResult } = require('./AgentResult');

class MotorsportTechAgent {
  constructor() {
    this.name = 'motorsport_tech';
    this.news = new NewsApiClient();
    this.techKeywords = ['engine penalty', 'grid penalty', 'technical failure', 'hydraulics', 'aerodynamics', 'dnf', 'crash', 'motor', 'penalización', 'aerodinámica', 'falla técnica'];
  }

  async analyze({ market }) {
    const sport = market.sport && market.sport !== 'general' ? market.sport : inferSportFromTitle(market.title);
    const validSports = ['F1', 'MotoGP', 'IndyCar', 'FormulaE'];
    
    if (!validSports.includes(sport)) {
      return agentResult({ name: this.name, enabled: false, notes: ['applicable only to motorsports'] });
    }

    const teams = extractTeams(market.title);
    if (!teams.home && !teams.away) {
      return agentResult({ name: this.name, enabled: false, notes: ['no specific drivers detected'] });
    }

    const queryTerms = [];
    if (teams.home) queryTerms.push(`"${teams.home}"`);
    if (teams.away) queryTerms.push(`"${teams.away}"`);
    const teamQuery = queryTerms.length > 1 ? `(${queryTerms.join(' OR ')})` : queryTerms[0];
    const keywordQuery = `(${this.techKeywords.join(' OR ')})`;
    const query = `${teamQuery} AND ${keywordQuery}`;

    try {
      const articles = await this.news.search(query, { disableDomainFallback: false });
      
      let issueHits = 0;
      let targetDriver = null;

      articles.forEach(article => {
        const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
        if (this.techKeywords.some(k => text.includes(k))) {
          issueHits++;
          if (teams.home && text.includes(teams.home.toLowerCase())) targetDriver = teams.home;
          if (teams.away && text.includes(teams.away.toLowerCase())) targetDriver = teams.away;
        }
      });

      if (issueHits === 0) {
        return agentResult({
          name: this.name,
          score: 0,
          confidence: 0.1,
          probabilityShift: 0,
          notes: ['no technical issues or penalties found'],
        });
      }

      // Penalize probability due to technical faults or grid penalties
      const score = -0.6; 
      const confidence = Math.min(1, 0.3 + (issueHits * 0.2));
      
      return agentResult({
        name: this.name,
        score,
        confidence,
        probabilityShift: score * confidence * 0.05,
        notes: [
          `found ${issueHits} reports mentioning tech failures or grid penalties`,
          targetDriver ? `affects ${targetDriver}` : 'affected driver ambiguous',
        ],
        data: { issueHits, targetDriver },
      });
    } catch (err) {
      return agentResult({ name: this.name, enabled: false, notes: [`error: ${err.message}`] });
    }
  }
}

module.exports = { MotorsportTechAgent };
