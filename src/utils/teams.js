const TEAM_LOCATIONS = {
  'atlanta hawks': { city: 'Atlanta', lat: 33.749, lon: -84.388 },
  'boston celtics': { city: 'Boston', lat: 42.3601, lon: -71.0589 },
  'brooklyn nets': { city: 'Brooklyn', lat: 40.6782, lon: -73.9442 },
  'charlotte hornets': { city: 'Charlotte', lat: 35.2271, lon: -80.8431 },
  'chicago bulls': { city: 'Chicago', lat: 41.8781, lon: -87.6298 },
  'cleveland cavaliers': { city: 'Cleveland', lat: 41.4993, lon: -81.6944 },
  'dallas mavericks': { city: 'Dallas', lat: 32.7767, lon: -96.797 },
  'denver nuggets': { city: 'Denver', lat: 39.7392, lon: -104.9903 },
  'detroit pistons': { city: 'Detroit', lat: 42.3314, lon: -83.0458 },
  'golden state warriors': { city: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  'houston rockets': { city: 'Houston', lat: 29.7604, lon: -95.3698 },
  'indiana pacers': { city: 'Indianapolis', lat: 39.7684, lon: -86.1581 },
  'la clippers': { city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  'los angeles clippers': { city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  'los angeles lakers': { city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  'memphis grizzlies': { city: 'Memphis', lat: 35.1495, lon: -90.049 },
  'miami heat': { city: 'Miami', lat: 25.7617, lon: -80.1918 },
  'milwaukee bucks': { city: 'Milwaukee', lat: 43.0389, lon: -87.9065 },
  'minnesota timberwolves': { city: 'Minneapolis', lat: 44.9778, lon: -93.265 },
  'new orleans pelicans': { city: 'New Orleans', lat: 29.9511, lon: -90.0715 },
  'new york knicks': { city: 'New York', lat: 40.7128, lon: -74.006 },
  'oklahoma city thunder': { city: 'Oklahoma City', lat: 35.4676, lon: -97.5164 },
  'orlando magic': { city: 'Orlando', lat: 28.5383, lon: -81.3792 },
  'philadelphia 76ers': { city: 'Philadelphia', lat: 39.9526, lon: -75.1652 },
  'phoenix suns': { city: 'Phoenix', lat: 33.4484, lon: -112.074 },
  'portland trail blazers': { city: 'Portland', lat: 45.5152, lon: -122.6784 },
  'sacramento kings': { city: 'Sacramento', lat: 38.5816, lon: -121.4944 },
  'san antonio spurs': { city: 'San Antonio', lat: 29.4241, lon: -98.4936 },
  'toronto raptors': { city: 'Toronto', lat: 43.6532, lon: -79.3832 },
  'utah jazz': { city: 'Salt Lake City', lat: 40.7608, lon: -111.891 },
  'washington wizards': { city: 'Washington', lat: 38.9072, lon: -77.0369 },
  'arizona diamondbacks': { city: 'Phoenix', lat: 33.4484, lon: -112.074 },
  'athletics': { city: 'Sacramento', lat: 38.5816, lon: -121.4944 },
  'atlanta braves': { city: 'Atlanta', lat: 33.749, lon: -84.388 },
  'baltimore orioles': { city: 'Baltimore', lat: 39.2904, lon: -76.6122 },
  'boston red sox': { city: 'Boston', lat: 42.3601, lon: -71.0589 },
  'chicago cubs': { city: 'Chicago', lat: 41.8781, lon: -87.6298 },
  'chicago white sox': { city: 'Chicago', lat: 41.8781, lon: -87.6298 },
  'cincinnati reds': { city: 'Cincinnati', lat: 39.1031, lon: -84.512 },
  'cleveland guardians': { city: 'Cleveland', lat: 41.4993, lon: -81.6944 },
  'colorado rockies': { city: 'Denver', lat: 39.7392, lon: -104.9903 },
  'detroit tigers': { city: 'Detroit', lat: 42.3314, lon: -83.0458 },
  'houston astros': { city: 'Houston', lat: 29.7604, lon: -95.3698 },
  'kansas city royals': { city: 'Kansas City', lat: 39.0997, lon: -94.5786 },
  'los angeles angels': { city: 'Anaheim', lat: 33.8366, lon: -117.9143 },
  'los angeles dodgers': { city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  'miami marlins': { city: 'Miami', lat: 25.7617, lon: -80.1918 },
  'milwaukee brewers': { city: 'Milwaukee', lat: 43.0389, lon: -87.9065 },
  'minnesota twins': { city: 'Minneapolis', lat: 44.9778, lon: -93.265 },
  'new york mets': { city: 'New York', lat: 40.7128, lon: -74.006 },
  'new york yankees': { city: 'New York', lat: 40.7128, lon: -74.006 },
  'philadelphia phillies': { city: 'Philadelphia', lat: 39.9526, lon: -75.1652 },
  'pittsburgh pirates': { city: 'Pittsburgh', lat: 40.4406, lon: -79.9959 },
  'san diego padres': { city: 'San Diego', lat: 32.7157, lon: -117.1611 },
  'san francisco giants': { city: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  'seattle mariners': { city: 'Seattle', lat: 47.6062, lon: -122.3321 },
  'st. louis cardinals': { city: 'St. Louis', lat: 38.627, lon: -90.1994 },
  'tampa bay rays': { city: 'St. Petersburg', lat: 27.7676, lon: -82.6403 },
  'texas rangers': { city: 'Arlington', lat: 32.7357, lon: -97.1081 },
  'toronto blue jays': { city: 'Toronto', lat: 43.6532, lon: -79.3832 },
  'washington nationals': { city: 'Washington', lat: 38.9072, lon: -77.0369 },
  'arizona cardinals': { city: 'Phoenix', lat: 33.4484, lon: -112.074 },
  'atlanta falcons': { city: 'Atlanta', lat: 33.749, lon: -84.388 },
  'baltimore ravens': { city: 'Baltimore', lat: 39.2904, lon: -76.6122 },
  'buffalo bills': { city: 'Buffalo', lat: 42.8864, lon: -78.8784 },
  'carolina panthers': { city: 'Charlotte', lat: 35.2271, lon: -80.8431 },
  'chicago bears': { city: 'Chicago', lat: 41.8781, lon: -87.6298 },
  'cincinnati bengals': { city: 'Cincinnati', lat: 39.1031, lon: -84.512 },
  'cleveland browns': { city: 'Cleveland', lat: 41.4993, lon: -81.6944 },
  'dallas cowboys': { city: 'Dallas', lat: 32.7767, lon: -96.797 },
  'denver broncos': { city: 'Denver', lat: 39.7392, lon: -104.9903 },
  'detroit lions': { city: 'Detroit', lat: 42.3314, lon: -83.0458 },
  'green bay packers': { city: 'Green Bay', lat: 44.5133, lon: -88.0133 },
  'houston texans': { city: 'Houston', lat: 29.7604, lon: -95.3698 },
  'indianapolis colts': { city: 'Indianapolis', lat: 39.7684, lon: -86.1581 },
  'jacksonville jaguars': { city: 'Jacksonville', lat: 30.3322, lon: -81.6557 },
  'kansas city chiefs': { city: 'Kansas City', lat: 39.0997, lon: -94.5786 },
  'las vegas raiders': { city: 'Las Vegas', lat: 36.1716, lon: -115.1391 },
  'los angeles chargers': { city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  'los angeles rams': { city: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  'miami dolphins': { city: 'Miami', lat: 25.7617, lon: -80.1918 },
  'minnesota vikings': { city: 'Minneapolis', lat: 44.9778, lon: -93.265 },
  'new england patriots': { city: 'Foxborough', lat: 42.0654, lon: -71.2478 },
  'new orleans saints': { city: 'New Orleans', lat: 29.9511, lon: -90.0715 },
  'new york giants': { city: 'New York', lat: 40.7128, lon: -74.006 },
  'new york jets': { city: 'New York', lat: 40.7128, lon: -74.006 },
  'philadelphia eagles': { city: 'Philadelphia', lat: 39.9526, lon: -75.1652 },
  'pittsburgh steelers': { city: 'Pittsburgh', lat: 40.4406, lon: -79.9959 },
  'san francisco 49ers': { city: 'San Francisco', lat: 37.7749, lon: -122.4194 },
  'seattle seahawks': { city: 'Seattle', lat: 47.6062, lon: -122.3321 },
  'tampa bay buccaneers': { city: 'Tampa', lat: 27.9506, lon: -82.4572 },
  'tennessee titans': { city: 'Nashville', lat: 36.1627, lon: -86.7816 },
  'washington commanders': { city: 'Washington', lat: 38.9072, lon: -77.0369 },
};

function extractTeams(title) {
  const clean = String(title || '').replace(/\s+/g, ' ').trim();
  const patterns = [
    /(.+?)\s+vs\.?\s+(.+?)(?:\?|$)/i,
    /(.+?)\s+at\s+(.+?)(?:\?|$)/i,
    /(.+?)\s+@\s+(.+?)(?:\?|$)/i,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (!match) continue;
    const away = normalizeTeamName(match[1]);
    const home = normalizeTeamName(match[2]);
    if (away && home) return { away, home };
  }

  return { away: null, home: null };
}

function normalizeTeamName(value) {
  return String(value || '')
    .replace(/^will\s+/i, '')
    .replace(/\s+win.*$/i, '')
    .replace(/\s+moneyline.*$/i, '')
    .replace(/\s+spread.*$/i, '')
    .replace(/[^\w\s.-]/g, '')
    .trim();
}

function findLocation(team) {
  if (!team) return null;
  const key = team.toLowerCase();
  if (TEAM_LOCATIONS[key]) return TEAM_LOCATIONS[key];
  return Object.entries(TEAM_LOCATIONS).find(([name]) => name.includes(key) || key.includes(name))?.[1] || null;
}

function inferSportFromTitle(title) {
  return inferSportFromText(title);
}

function inferSportFromText(...parts) {
  const text = parts.map(part => String(part || '')).join(' ').toLowerCase();
  const candidates = [
    [/ufc|\bmma\b|mixed martial arts|fight night|ultimate fighting/, 'UFC'],
    [/boxing|boxeo|wba|wbc|ibf|wbo|heavyweight|welterweight|middleweight|lightweight|featherweight/, 'Boxing'],
    [/formula\s*1|formula one|\bf1\b|grand prix/, 'F1'],
    [/motogp|moto gp/, 'MotoGP'],
    [/\bnba\b|basketball|celtics|lakers|knicks|warriors|thunder|pacers|mavericks|nuggets|timberwolves|cavaliers|bucks|suns|heat|magic|raptors|bulls|nets|spurs|rockets|grizzlies|pelicans|jazz|trail blazers|clippers/, 'NBA'],
    [/\bnfl\b|american football|super bowl|chiefs|eagles|cowboys|ravens|bills|packers|steelers|49ers|bengals|lions|broncos|vikings|patriots|jets|giants|commanders|seahawks|raiders|chargers|rams|buccaneers|titans|colts|jaguars|texans|saints|panthers|falcons|cardinals/, 'NFL'],
    [/\bmlb\b|baseball|world series|yankees|dodgers|mets|red sox|pirates|athletics|phillies|padres|giants|mariners|astros|rangers|blue jays|orioles|braves|cubs|white sox|guardians|royals|tigers|twins|brewers|cardinals|reds|marlins|nationals|rays|rockies|diamondbacks|angels/, 'MLB'],
    [/soccer|fútbol|futbol|fifa|premier league|la liga|champions league|europa league|world cup|copa america|libertadores|mls|uefa|real madrid|barcelona|manchester|liverpool|arsenal|chelsea|inter milan|juventus|psg/, 'Soccer'],
  ];
  const match = candidates.find(([pattern]) => pattern.test(text));
  return match ? match[1] : 'general';
}

function distanceMiles(a, b) {
  if (!a || !b) return null;
  const radius = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function toRad(value) {
  return value * (Math.PI / 180);
}

module.exports = { distanceMiles, extractTeams, findLocation, inferSportFromText, inferSportFromTitle };
