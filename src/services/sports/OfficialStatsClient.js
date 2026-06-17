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
    }

    const webContext = await this.fetchOfficialWebContext({ sport: normalizedSport, teams, profile });
    context.records.push(...webContext.records);
    context.fixtures.push(...webContext.fixtures);
    context.notes.push(...webContext.notes);

    return context;
  }

  async fetchOfficialWebContext({ sport, teams, profile }) {
    const scrapeableSources = [
      ...profile.officialStats,
      ...profile.officialNews,
    ].filter(source => source.scrapeable && source.url).slice(0, 4);

    if (!scrapeableSources.length) {
      return { records: [], fixtures: [], notes: [`no scrapeable official ${sport} sources`] };
    }

    const pages = await Promise.all(scrapeableSources.map(source => this.fetchOfficialPage(source, teams)));
    const okPages = pages.filter(page => page.ok);
    const relevantPages = okPages.filter(page => page.relevance > 0);

    return {
      records: [],
      fixtures: relevantPages.flatMap(page => page.items.slice(0, 3).map(item => ({
        source: page.source.name,
        title: item.title,
        url: item.url,
        relevance: page.relevance,
      }))),
      notes: [
        `scrapeable official ${sport} sources ${scrapeableSources.length}`,
        `official pages fetched ${okPages.length}`,
        `official relevant pages ${relevantPages.length}`,
      ],
    };
  }

  async fetchOfficialPage(source, teams) {
    const cacheKey = `web:${source.url}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    try {
      const { data } = await axios.get(source.url, {
        timeout: config.polymarket.requestTimeoutMs,
        headers: { 'User-Agent': 'MiroFishQuant/5.0 sports-source-scraper' },
      });
      const page = parseOfficialHtml(source, data, teams);
      this.cache.set(cacheKey, {
        expiresAt: Date.now() + 15 * 60 * 1000,
        data: page,
      });
      return page;
    } catch (error) {
      return {
        ok: false,
        source,
        relevance: 0,
        items: [],
        error: error.message,
      };
    }
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

function parseOfficialHtml(source, html, teams) {
  const text = String(html || '');
  const title = decodeHtml(extractFirst(text, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = decodeHtml(
    extractFirst(text, /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)
    || extractFirst(text, /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i),
  );
  const haystack = `${title} ${description} ${stripTags(text).slice(0, 5000)}`.toLowerCase();
  const keywords = [teams?.away, teams?.home]
    .map(value => String(value || '').toLowerCase())
    .filter(Boolean);
  const relevance = keywords.length
    ? keywords.filter(keyword => haystack.includes(keyword)).length / keywords.length
    : 0.2;

  return {
    ok: true,
    source,
    title,
    description,
    relevance,
    items: extractLinks(text, source.url)
      .filter(item => !keywords.length || keywords.some(keyword => item.title.toLowerCase().includes(keyword)))
      .slice(0, 8),
  };
}

function extractFirst(text, pattern) {
  return text.match(pattern)?.[1] || '';
}

function extractLinks(html, baseUrl) {
  const links = [];
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = pattern.exec(html);
  while (match) {
    const title = decodeHtml(stripTags(match[2])).replace(/\s+/g, ' ').trim();
    if (title.length >= 8) {
      links.push({
        title,
        url: resolveUrl(match[1], baseUrl),
      });
    }
    match = pattern.exec(html);
  }
  return links;
}

function resolveUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).toString();
  } catch (_) {
    return url;
  }
}

function stripTags(value) {
  return String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
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
