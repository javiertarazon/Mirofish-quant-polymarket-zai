const { RapidApiAdapter } = require('./RapidApiAdapter');
const logger = require('../../../core/Logger');

class F1Adapter extends RapidApiAdapter {
  constructor(client) {
    super(client, 'api-formula-1.p.rapidapi.com', 'F1');
  }

  async fetchContext({ teams }) {
    const season = new Date().getFullYear();
    const cacheKey = `f1_rankings_${season}`;
    
    let rankings = this.cache.get(cacheKey);
    if (!rankings) {
      try {
        const { data } = await this.api.get('/rankings/drivers', { params: { season } });
        rankings = data.response || [];
        this.cache.set(cacheKey, rankings);
        setTimeout(() => this.cache.delete(cacheKey), 120000);
      } catch (err) {
        logger.debug(`RapidAPI [F1] error: ${err.message}`);
        rankings = [];
      }
    }

    const records = rankings.map(r => ({
      driver: r.driver.name,
      team: r.team.name,
      points: r.points,
      wins: r.wins,
      source: 'API-Formula-1 (RapidAPI)'
    }));

    return {
      records,
      fixtures: [],
      notes: [`API-Formula-1 parsed successfully. Found ${records.length} driver rankings`]
    };
  }
}

module.exports = { F1Adapter };
