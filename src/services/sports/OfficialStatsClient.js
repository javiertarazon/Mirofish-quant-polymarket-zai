const axios = require('axios');
const config = require('../../core/Config');
const { getSourceProfile, normalizeSport } = require('./SportsSourceRegistry');

class OfficialStatsClient {
  constructor() {
    this.mlb = axios.create({
      baseURL: 'https://statsapi.mlb.com/api/v1',
      timeout: config.polymarket.requestTimeoutMs,
      headers: { 'User-Agent': 'MiroFishQuant/5.0' },
    });
    this.cache = new Map();
  }

  async fetchContext({ sport, teams, date }) {
    const normalizedSport = normalizeSport(sport);
    const profile = getSourceProfile(normalizedSport);
    const context = {
      sport: normalizedSport,
      sources: profile.officialStats,
      records: [],
      fixtures: [],
      notes: [],
    };

    if (normalizedSport === 'MLB') {
      const mlbContext = await this.fetchMlbScheduleContext({ teams, date });
      context.records.push(...mlbContext.records);
      context.fixtures.push(...mlbContext.fixtures);
      context.notes.push(...mlbContext.notes);
    } else if (profile.officialStats.length) {
      context.notes.push(`official ${normalizedSport} sources registered`);
    }

    return context;
  }

  async fetchMlbScheduleContext({ teams, date }) {
    const day = date instanceof Date && !Number.isNaN(date.valueOf())
      ? date.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const cacheKey = `mlb:${day}`;
    let schedule = this.cache.get(cacheKey);

    if (!schedule || schedule.expiresAt < Date.now()) {
      try {
        const { data } = await this.mlb.get('/schedule', {
          params: {
            sportId: 1,
            date: day,
            hydrate: 'probablePitcher,team',
          },
        });
        schedule = {
          expiresAt: Date.now() + 10 * 60 * 1000,
          data,
        };
        this.cache.set(cacheKey, schedule);
      } catch (_) {
        return { records: [], fixtures: [], notes: ['MLB Stats API unavailable'] };
      }
    }

    const games = (schedule.data.dates || []).flatMap(entry => entry.games || []);
    const matchingGames = games.filter(game => gameMatchesTeams(game, teams));
    const selected = matchingGames.length ? matchingGames : games.slice(0, 5);

    return {
      records: selected.flatMap(game => [
        teamRecordFromMlbGame(game, 'away'),
        teamRecordFromMlbGame(game, 'home'),
      ].filter(Boolean)),
      fixtures: selected.map(game => ({
        id: game.gamePk,
        status: game.status?.detailedState,
        date: game.gameDate,
        venue: game.venue?.name,
        away: game.teams?.away?.team?.name,
        home: game.teams?.home?.team?.name,
        awayProbablePitcher: game.teams?.away?.probablePitcher?.fullName || null,
        homeProbablePitcher: game.teams?.home?.probablePitcher?.fullName || null,
      })),
      notes: [`MLB schedule games ${games.length}`, `MLB matched games ${matchingGames.length}`],
    };
  }
}

function teamRecordFromMlbGame(game, side) {
  const team = game.teams?.[side];
  if (!team?.team?.name || !team.leagueRecord) return null;
  return {
    team: team.team.name,
    wins: Number(team.leagueRecord.wins) || 0,
    losses: Number(team.leagueRecord.losses) || 0,
    pct: Number(team.leagueRecord.pct) || 0,
    probablePitcher: team.probablePitcher?.fullName || null,
  };
}

function gameMatchesTeams(game, teams) {
  const names = [
    game.teams?.away?.team?.name,
    game.teams?.home?.team?.name,
  ].map(name => String(name || '').toLowerCase());
  const expected = [teams?.away, teams?.home].map(name => String(name || '').toLowerCase()).filter(Boolean);
  if (!expected.length) return false;
  return expected.every(team => names.some(name => name.includes(team) || team.includes(name)));
}

module.exports = { OfficialStatsClient };
