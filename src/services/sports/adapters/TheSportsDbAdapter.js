const axios = require('axios');
const config = require('../../../core/Config');
const logger = require('../../../core/Logger');

class TheSportsDbAdapter {
  constructor() {
    this.name = 'TheSportsDB';
    this.apiKey = config.sportsApi.theSportsDbApiKey || '123';
    this.client = axios.create({
      baseURL: `https://www.thesportsdb.com/api/v1/json/${this.apiKey}`,
      timeout: config.polymarket.requestTimeoutMs,
    });
  }

  canHandle(sport) {
    // TheSportsDB has data for almost everything, but let's default to yes
    return true; 
  }

  async fetchFixtures({ home, away, date }) {
    if (!home && !away) return [];
    
    // We'll search for the event directly
    const query = `${home || ''} vs ${away || ''}`.trim().replace(/\s+vs\s+$/, '').replace(/^\s+vs\s+/, '').replace(/\s+/g, '_');
    
    try {
      const { data } = await this.client.get('/searchevents.php', {
        params: { e: query }
      });
      
      const events = data.event || [];
      return events.map(e => ({
        date: e.dateEvent,
        home: e.strHomeTeam,
        away: e.strAwayTeam,
        competition: e.strLeague,
        status: e.strStatus || 'Unknown',
        venue: e.strVenue,
      }));
    } catch (err) {
      logger.debug(`TheSportsDB fixtures error: ${err.message}`);
      return [];
    }
  }

  async fetchContext({ sport, teams }) {
    if (!teams || (!teams.home && !teams.away)) {
      return { records: [], fixtures: [], notes: ['No teams specified'] };
    }

    const records = [];
    const notes = [];

    // Try fetching team info
    const queryTeam = teams.home || teams.away;
    if (queryTeam) {
      try {
        const { data } = await this.client.get('/searchteams.php', {
          params: { t: queryTeam }
        });
        
        const foundTeam = (data.teams || [])[0];
        if (foundTeam) {
          records.push({
            team: foundTeam.strTeam,
            stadium: foundTeam.strStadium,
            formedYear: foundTeam.intFormedYear,
            league: foundTeam.strLeague,
            description: (foundTeam.strDescriptionEN || '').substring(0, 150) + '...',
          });
          notes.push(`Found history for team: ${foundTeam.strTeam}`);
        }
      } catch (err) {
        logger.debug(`TheSportsDB team search error: ${err.message}`);
      }
    }

    const fixtures = await this.fetchFixtures({ home: teams.home, away: teams.away });
    
    return {
      records,
      fixtures,
      sources: [{ name: 'TheSportsDB API', url: 'https://thesportsdb.com', type: 'api', scrapeable: false }],
      notes,
    };
  }
}

module.exports = { TheSportsDbAdapter };
