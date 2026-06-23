/**
 * MarketClassifier — Clasificador multinivel de mercados de Polymarket
 *
 * Asigna a cada mercado una categoría y prioridad numérica:
 *   4 — DAILY_MATCH   : Partido del día (X vs. Y, expira hoy/mañana)
 *   3 — KNOCKOUT      : Final, semifinal, eliminatoria, cuartos, octavos
 *   2 — SPECIAL_EVENT : Fase de grupos, clasificatorias, quién avanza
 *   1 — FUTURES       : Mercados a largo plazo (ganador del torneo, etc.)
 */

const MARKET_TYPES = {
  DAILY_MATCH: { code: 'DAILY_MATCH', priority: 4, label: 'Partido del día' },
  KNOCKOUT: { code: 'KNOCKOUT', priority: 3, label: 'Eliminatoria / Final' },
  SPECIAL_EVENT: { code: 'SPECIAL_EVENT', priority: 2, label: 'Evento especial' },
  FUTURES: { code: 'FUTURES', priority: 1, label: 'Mercado futuro' },
};

// ─────────────────────────────────────────────────────────
// Patrones de detección
// ─────────────────────────────────────────────────────────

/** Partidos directos: "Team A vs. Team B" o "Team A vs Team B" */
const MATCH_PATTERN = /\bvs\.?\s/i;

/** Etapas eliminatorias de alto interés */
const KNOCKOUT_KEYWORDS = [
  'final',
  'semi-final',
  'semifinal',
  'quarter-final',
  'quarterfinal',
  'round of 16',
  'round of 32',
  'round of 8',
  'knockout',
  'elimination',
  'eliminatoria',
  'playoff',
  'play-off',
  'championship',
  'campeonato',
  'title match',
  'title fight',
  'world championship',
  'gold medal',
  'bronze medal',
];

/** Eventos de fase de grupos / clasificación */
const SPECIAL_EVENT_KEYWORDS = [
  'group winner',
  'group stage',
  'group a',
  'group b',
  'group c',
  'group d',
  'group e',
  'group f',
  'group g',
  'group h',
  'group i',
  'group j',
  'group k',
  'group l',
  'win group',
  'advance',
  'qualify',
  'qualified',
  'top scorer',
  'golden boot',
  'most goals',
];

// ─────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────

/**
 * Determina si el mercado expira "pronto" (hoy o mañana),
 * lo que es señal de un partido en curso o a punto de jugarse.
 */
function expiresWithinHours(market, hours = 48) {
  if (!market.endDate) return false;
  const expiry = market.endDate instanceof Date ? market.endDate : new Date(market.endDate);
  const now = Date.now();
  const diff = expiry.getTime() - now;
  return diff > 0 && diff <= hours * 60 * 60 * 1000;
}

function containsAny(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

// ─────────────────────────────────────────────────────────
// Clasificador principal
// ─────────────────────────────────────────────────────────

/**
 * Clasifica un mercado normalizado y retorna un objeto con:
 *   { type, priority, label }
 */
function classifyMarket(market) {
  const title = String(market.title || '');

  // DAILY_MATCH: tiene patrón "vs." Y expira en las próximas 48 h
  if (MATCH_PATTERN.test(title) && expiresWithinHours(market, 48)) {
    return MARKET_TYPES.DAILY_MATCH;
  }

  // KNOCKOUT: contiene keyword de fase eliminatoria
  if (containsAny(title, KNOCKOUT_KEYWORDS)) {
    return MARKET_TYPES.KNOCKOUT;
  }

  // SPECIAL_EVENT: contiene keyword de fase de grupos / clasificación
  if (containsAny(title, SPECIAL_EVENT_KEYWORDS)) {
    return MARKET_TYPES.SPECIAL_EVENT;
  }

  // Fallback: mercado futuro genérico
  return MARKET_TYPES.FUTURES;
}

/**
 * Agrupa una lista de mercados por tipo de mercado.
 * Retorna un Map<type_code, market[]>
 */
function groupByType(markets) {
  const groups = new Map(Object.keys(MARKET_TYPES).map((key) => [key, []]));
  for (const market of markets) {
    const type = classifyMarket(market);          // retorna el objeto de tipo directamente
    const bucket = groups.get(type.code) ?? groups.get('FUTURES');
    bucket.push(market);
  }
  return groups;
}

/**
 * Dentro de cada grupo, ordena por actividad reciente (volume24h DESC).
 */
function sortByActivity(markets) {
  return [...markets].sort((a, b) => {
    const actA = Math.max(Number(a.volume24h || 0), Number(a.volume || 0));
    const actB = Math.max(Number(b.volume24h || 0), Number(b.volume || 0));
    return actB - actA;
  });
}

/**
 * Selecciona mercados respetando cuotas por categoría.
 *
 * @param {object[]} markets     - lista de mercados ya filtrados por estáticos
 * @param {object}   slotConfig  - { dailyMatch, knockout, specialEvent, futures, total }
 * @returns {object[]}           - mercados seleccionados con .marketType enriquecido
 */
function selectByCategory(markets, slotConfig) {
  const {
    dailyMatch = 10,
    knockout = 5,
    specialEvent = 3,
    total = 20,
  } = slotConfig;

  const groups = groupByType(markets);
  const selected = [];
  const seen = new Set();

  const addFromGroup = (typeCode, maxSlots) => {
    const bucket = sortByActivity(groups.get(typeCode) || []);
    const classification = MARKET_TYPES[typeCode];
    for (const market of bucket) {
      if (selected.length >= total) break;
      if (maxSlots <= 0) break;
      if (seen.has(market.id)) continue;
      selected.push({ ...market, marketType: classification });
      seen.add(market.id);
      maxSlots -= 1;
    }
  };

  // Ronda 1 — Partidos del día (máxima prioridad)
  addFromGroup('DAILY_MATCH', dailyMatch);
  // Ronda 2 — Eliminatorias / Finales
  addFromGroup('KNOCKOUT', knockout);
  // Ronda 3 — Fase de grupos / especiales
  addFromGroup('SPECIAL_EVENT', specialEvent);
  // Ronda 4 — Futuros (rellena el resto)
  addFromGroup('FUTURES', total - selected.length);

  return selected;
}

module.exports = {
  MARKET_TYPES,
  classifyMarket,
  groupByType,
  selectByCategory,
  expiresWithinHours,
};
