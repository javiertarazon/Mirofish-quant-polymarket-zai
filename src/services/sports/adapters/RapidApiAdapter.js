const axios = require('axios');
const config = require('../../../core/Config');
const logger = require('../../../core/Logger');
const { BaseAdapter } = require('./BaseAdapter');

class RapidApiAdapter extends BaseAdapter {
  constructor(client, apiHost, sportName) {
    super(client);
    this.name = `RapidAPI_${sportName}`;
    this.enabled = Boolean(config.sportsApi.rapidApiKey);
    this.sportName = sportName;
    
    this.api = axios.create({
      baseURL: `https://${apiHost}`,
      timeout: config.polymarket?.requestTimeoutMs || 10000,
      headers: {
        'x-rapidapi-key': config.sportsApi.rapidApiKey,
        'x-rapidapi-host': apiHost
      }
    });
    this.cache = new Map();
  }

  canHandle(sport) {
    return this.enabled && sport.toLowerCase() === this.sportName.toLowerCase();
  }

  async fetchGames({ date, league, season }) {
    const cacheKey = `games_${date}_${league}_${season}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    try {
      const params = {};
      if (date) params.date = date;
      if (league) params.league = league;
      if (season) params.season = season;

      const { data } = await this.api.get('/games', { params });
      const results = data.response || [];
      
      this.cache.set(cacheKey, results);
      setTimeout(() => this.cache.delete(cacheKey), 60000); // 1m cache
      return results;
    } catch (err) {
      logger.debug(`RapidAPI [${this.sportName}] games error: ${err.message}`);
      return [];
    }
  }

  async fetchStandings({ league, season }) {
    const cacheKey = `standings_${league}_${season}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    try {
      const { data } = await this.api.get('/standings', { 
        params: { league, season } 
      });
      const results = data.response || [];
      
      this.cache.set(cacheKey, results);
      setTimeout(() => this.cache.delete(cacheKey), 120000); // 2m cache
      return results;
    } catch (err) {
      logger.debug(`RapidAPI [${this.sportName}] standings error: ${err.message}`);
      return [];
    }
  }

  async fetchContext({ teams }) {
    // This is a generic implementation. Specific sports should override this
    // if they have different endpoints (like F1 which uses /races instead of /games)
    return { records: [], fixtures: [], notes: [`Generic RapidAPI fetchContext for ${this.sportName}`] };
  }
}

module.exports = { RapidApiAdapter };
