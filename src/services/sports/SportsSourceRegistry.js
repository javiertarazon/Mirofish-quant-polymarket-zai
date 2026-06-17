const SOURCE_REGISTRY = {
  MLB: {
    officialStats: [
      { name: 'MLB Stats API', url: 'https://statsapi.mlb.com/api/v1', type: 'json-api', integration: 'mlb-statsapi' },
      { name: 'MLB Stats', url: 'https://www.mlb.com/stats/', type: 'web', scrapeable: true },
      { name: 'Baseball Savant / Statcast', url: 'https://baseballsavant.mlb.com/', type: 'web', scrapeable: true },
    ],
    officialNews: [
      { name: 'MLB News', url: 'https://www.mlb.com/news', domain: 'mlb.com', scrapeable: true },
      { name: 'MLB Injury Report', url: 'https://www.mlb.com/injury-report', domain: 'mlb.com', scrapeable: true },
      { name: 'MLB Probable Pitchers', url: 'https://www.mlb.com/probable-pitchers', domain: 'mlb.com', scrapeable: true },
    ],
    externalNewsDomains: ['espn.com', 'cbssports.com', 'rotowire.com', 'theathletic.com'],
  },
  NBA: {
    officialStats: [
      { name: 'NBA Stats', url: 'https://www.nba.com/stats', type: 'web', scrapeable: true },
    ],
    officialNews: [
      { name: 'NBA News', url: 'https://www.nba.com/news', domain: 'nba.com', scrapeable: true },
      { name: 'NBA Injury Report', url: 'https://official.nba.com/nba-injury-report-2025-26-season/', domain: 'nba.com', scrapeable: true },
    ],
    externalNewsDomains: ['espn.com', 'cbssports.com', 'rotowire.com', 'basketball-reference.com', 'theathletic.com'],
  },
  NFL: {
    officialStats: [
      { name: 'NFL Stats', url: 'https://www.nfl.com/stats/', type: 'web', scrapeable: true },
      { name: 'NFL Next Gen Stats', url: 'https://nextgenstats.nfl.com/', type: 'web', scrapeable: true },
    ],
    officialNews: [
      { name: 'NFL News', url: 'https://www.nfl.com/news/', domain: 'nfl.com', scrapeable: true },
      { name: 'NFL Injuries', url: 'https://www.nfl.com/injuries/', domain: 'nfl.com', scrapeable: true },
    ],
    externalNewsDomains: ['espn.com', 'cbssports.com', 'rotowire.com', 'pro-football-reference.com', 'theathletic.com'],
  },
  Soccer: {
    officialStats: [
      { name: 'FIFA Rankings', url: 'https://inside.fifa.com/fifa-world-ranking/men', type: 'web', scrapeable: true },
      { name: 'Premier League Stats', url: 'https://www.premierleague.com/stats', type: 'web', scrapeable: true },
      { name: 'LaLiga Stats', url: 'https://www.laliga.com/en-GB/stats', type: 'web', scrapeable: true },
      { name: 'UEFA Statistics', url: 'https://www.uefa.com/statistics/', type: 'web', scrapeable: true },
    ],
    officialNews: [
      { name: 'FIFA News', url: 'https://www.fifa.com/news', domain: 'fifa.com', scrapeable: true },
      { name: 'Premier League News', url: 'https://www.premierleague.com/news', domain: 'premierleague.com', scrapeable: true },
      { name: 'UEFA News', url: 'https://www.uefa.com/news/', domain: 'uefa.com', scrapeable: true },
    ],
    externalNewsDomains: ['espn.com', 'bbc.com', 'skysports.com', 'fbref.com', 'transfermarkt.com'],
  },
  F1: {
    officialStats: [
      { name: 'FIA F1 Documents', url: 'https://www.fia.com/documents', type: 'web', scrapeable: true },
      { name: 'Formula 1 Results', url: 'https://www.formula1.com/en/results.html', type: 'web', scrapeable: true },
    ],
    officialNews: [
      { name: 'Formula 1 Latest', url: 'https://www.formula1.com/en/latest', domain: 'formula1.com', scrapeable: true },
      { name: 'FIA News', url: 'https://www.fia.com/news', domain: 'fia.com', scrapeable: true },
    ],
    externalNewsDomains: ['motorsport.com', 'autosport.com', 'racingnews365.com', 'the-race.com'],
  },
  MotoGP: {
    officialStats: [
      { name: 'MotoGP Results', url: 'https://www.motogp.com/en/gp-results', type: 'web', scrapeable: true },
      { name: 'MotoGP Stats', url: 'https://www.motogp.com/en/stats', type: 'web', scrapeable: true },
    ],
    officialNews: [
      { name: 'MotoGP News', url: 'https://www.motogp.com/en/news', domain: 'motogp.com', scrapeable: true },
    ],
    externalNewsDomains: ['motorsport.com', 'crash.net', 'the-race.com'],
  },
  UFC: {
    officialStats: [
      { name: 'UFC Stats', url: 'http://ufcstats.com/statistics/events/completed', type: 'web', scrapeable: true },
      { name: 'UFC Athletes', url: 'https://www.ufc.com/athletes', type: 'web', scrapeable: true },
      { name: 'UFC Rankings', url: 'https://www.ufc.com/rankings', type: 'web', scrapeable: true },
    ],
    officialNews: [
      { name: 'UFC News', url: 'https://www.ufc.com/news', domain: 'ufc.com', scrapeable: true },
    ],
    externalNewsDomains: ['espn.com', 'mmafighting.com', 'mmajunkie.usatoday.com', 'sherdog.com', 'tapology.com'],
  },
  Boxing: {
    officialStats: [
      { name: 'BoxRec', url: 'https://boxrec.com/', type: 'web', scrapeable: true },
      { name: 'WBA Rankings', url: 'https://www.wbaboxing.com/wba-ranking', type: 'web', scrapeable: true },
      { name: 'WBC Rankings', url: 'https://wbcboxing.com/en/championsratings/', type: 'web', scrapeable: true },
      { name: 'IBF Ratings', url: 'https://www.ibf-usba-boxing.com/ratings/', type: 'web', scrapeable: true },
      { name: 'WBO Rankings', url: 'https://www.wboboxing.com/rankings', type: 'web', scrapeable: true },
    ],
    officialNews: [
      { name: 'WBA News', url: 'https://www.wbaboxing.com/category/boxing-news', domain: 'wbaboxing.com', scrapeable: true },
      { name: 'WBC News', url: 'https://wbcboxing.com/en/news/', domain: 'wbcboxing.com', scrapeable: true },
      { name: 'IBF News', url: 'https://www.ibf-usba-boxing.com/news/', domain: 'ibf-usba-boxing.com', scrapeable: true },
      { name: 'WBO News', url: 'https://www.wboboxing.com/news/', domain: 'wboboxing.com', scrapeable: true },
    ],
    externalNewsDomains: ['espn.com', 'boxingnews24.com', 'boxingscene.com', 'ringmagazine.com', 'badlefthook.com'],
  },
};

const BETTING_SOURCES = [
  { name: 'Polymarket CLOB', url: 'https://clob.polymarket.com', type: 'prediction-market' },
  { name: 'The Odds API', url: 'https://the-odds-api.com/', type: 'odds-api', envKey: 'ODDS_API_KEY' },
  { name: 'OddsJam', url: 'https://oddsjam.com/', type: 'odds-provider' },
  { name: 'Pinnacle', url: 'https://www.pinnacle.com/', type: 'sportsbook-reference' },
];

function getSourceProfile(sport) {
  return SOURCE_REGISTRY[normalizeSport(sport)] || {
    officialStats: [],
    officialNews: [],
    externalNewsDomains: [],
  };
}

function getNewsDomainsForSport(sport, { includeOfficial = true, includeExternal = true } = {}) {
  const profile = getSourceProfile(sport);
  const domains = [];
  if (includeOfficial) domains.push(...profile.officialNews.map(source => source.domain).filter(Boolean));
  if (includeExternal) domains.push(...profile.externalNewsDomains);
  return [...new Set(domains)];
}

function normalizeSport(sport) {
  const value = String(sport || '').toLowerCase();
  if (['mlb', 'baseball'].includes(value)) return 'MLB';
  if (value === 'nba') return 'NBA';
  if (value === 'nfl') return 'NFL';
  if (['soccer', 'football', 'fútbol', 'futbol'].includes(value)) return 'Soccer';
  if (['f1', 'formula 1', 'formula one'].includes(value)) return 'F1';
  if (['motogp', 'moto gp'].includes(value)) return 'MotoGP';
  if (value === 'ufc' || value === 'mma') return 'UFC';
  if (value === 'boxing' || value === 'boxeo') return 'Boxing';
  return sport || 'general';
}

module.exports = {
  BETTING_SOURCES,
  SOURCE_REGISTRY,
  getNewsDomainsForSport,
  getSourceProfile,
  normalizeSport,
};
