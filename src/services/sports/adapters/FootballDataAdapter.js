const axios = require('axios');
const config = require('../../../core/Config');
const logger = require('../../../core/Logger');

class FootballDataAdapter {
  constructor() {
    this.name = 'FootballDataOrg';
    this.enabled = Boolean(config.sportsApi.footballDataApiKey);
    this.cache = new Map();
    this.client = axios.create({
      baseURL: 'https://api.football-data.org/v4',
      timeout: config.polymarket.requestTimeoutMs,
      headers: { 'X-Auth-Token': config.sportsApi.footballDataApiKey },
    });
  }

  canHandle(sport) {
    return this.enabled && ['soccer', 'football'].includes(sport.toLowerCase());
  }

  async fetchFixtures({ home, away, date }) {
    if (!home && !away) return [];
    
    // WC = World Cup, CLI = Copa Libertadores, CL = Champions League
    const competitions = 'WC,CL,CLI,PL,PD,SA'; 
    const cacheKey = `fixtures_${competitions}`;
    let matches = this.cache.get(cacheKey);

    if (!matches) {
      try {
        const { data } = await this.client.get('/matches', {
          params: { competitions, status: 'SCHEDULED' }
        });
        matches = data.matches || [];
        // Cache for 60 seconds to respect rate limits (10 calls/min)
        this.cache.set(cacheKey, matches);
        setTimeout(() => this.cache.delete(cacheKey), 60000);
      } catch (err) {
        logger.debug(`FootballData fixtures error: ${err.message}`);
        return [];
      }
    }

    const hLower = home ? home.toLowerCase() : '';
    const aLower = away ? away.toLowerCase() : '';

    return matches.filter(m => {
      const homeName = m.homeTeam?.name?.toLowerCase() || '';
      const awayName = m.awayTeam?.name?.toLowerCase() || '';
      return (hLower && homeName.includes(hLower)) || (aLower && awayName.includes(aLower));
    }).map(m => ({
      date: m.utcDate,
      home: m.homeTeam.name,
      away: m.awayTeam.name,
      competition: m.competition.name,
      status: m.status
    }));
  }

  async fetchContext({ teams }) {
    if (!teams.home && !teams.away) {
      return { records: [], fixtures: [], notes: ['No teams specified'] };
    }

    // World Cup standigns: /v4/competitions/WC/standings
    const cacheKey = `standings_WC`;
    let standings = this.cache.get(cacheKey);

    if (!standings) {
      try {
        const { data } = await this.client.get('/competitions/WC/standings');
        standings = data.standings || [];
        this.cache.set(cacheKey, standings);
        setTimeout(() => this.cache.delete(cacheKey), 60000);
      } catch (err) {
        logger.debug(`FootballData standings error: ${err.message}`);
        standings = [];
      }
    }

    const records = [];
    standings.forEach(group => {
      (group.table || []).forEach(teamData => {
        records.push({
          team: teamData.team.name,
          rank: teamData.position,
          points: teamData.points,
          wins: teamData.won,
          losses: teamData.lost,
          pct: teamData.playedGames > 0 ? teamData.won / teamData.playedGames : 0,
        });
      });
    });

    const relevantRecords = records.filter(r => {
      const t = r.team.toLowerCase();
      return (teams.home && t.includes(teams.home.toLowerCase())) || 
             (teams.away && t.includes(teams.away.toLowerCase()));
    });

    return {
      records: relevantRecords,
      fixtures: await this.fetchFixtures({ home: teams.home, away: teams.away }),
      sources: [{ name: 'Football-Data.org API', url: 'https://football-data.org', type: 'api', scrapeable: false }],
      notes: [`Found ${relevantRecords.length} records in World Cup standings`],
    };
  }
}

module.exports = { FootballDataAdapter };
