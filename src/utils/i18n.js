const SPORT_LABELS = {
  all: 'Todos los deportes',
  general: 'General',
  Soccer: 'Fútbol',
  Football: 'Fútbol americano',
  Basketball: 'Baloncesto',
  Baseball: 'Béisbol',
  Tennis: 'Tenis',
  Golf: 'Golf',
  Hockey: 'Hockey',
  Boxing: 'Boxeo',
  MMA: 'MMA',
  UFC: 'UFC',
  Racing: 'Motor',
  Formula1: 'Formula 1',
  F1: 'Formula 1',
  MotoGP: 'MotoGP',
};

const STATUS_LABELS = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
  PENDING: 'Pendiente',
  EXECUTED: 'Ejecutada',
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada',
  SUPERSEDED: 'Reemplazada',
  WON: 'Ganada',
  LOST: 'Perdida',
  BUY: 'Comprar',
  SELL: 'Vender',
  YES: 'Si',
  NO: 'No',
  SKIP: 'Omitir',
  shadow: 'Simulación',
  live: 'Real',
};

const THESIS_LABELS = {
  UNDERVALUED_YES: 'Si infravalorado',
  SIGNAL: 'Señal',
};

const CLASSIFICATION_LABELS = {
  SWARM_CONFIRMED: 'Confirmada por enjambre',
  VALUE_ONLY: 'Valor alto',
  WATCHLIST: 'Seguimiento',
};

const AGENT_LABELS = {
  news_sentiment: 'Noticias y sentimiento',
  sports_context: 'Contexto deportivo',
  official_sources: 'Fuentes oficiales',
  top_traders: 'Traders destacados',
  holder_concentration: 'Concentración de holders',
  market_mood: 'Pulso del mercado',
  external_odds: 'Cuotas externas',
};

const CONFIG_LABELS = {
  bankroll: 'Bankroll',
  maxStake: 'Stake máximo',
  maxStakePct: 'Stake máximo %',
  kellyFraction: 'Fraccion Kelly',
  maxOpenTrades: 'Apuestas abiertas máximas',
  dailyLossLimitPct: 'Pérdida diaria máxima %',
  minLiquidity: 'Liquidez mínima',
  minVolume: 'Volumen mínimo',
  maxSpread: 'Spread máximo',
  minExpectedValue: 'Valor esperado mínimo',
  minConfidence: 'Confianza mínima',
  minProbabilityEdge: 'Ventaja mínima de probabilidad',
  minUndervaluationGap: 'Brecha mínima de infravaloración',
  highProbabilityThreshold: 'Umbral de alta probabilidad',
  highConfidenceThreshold: 'Umbral de alta confianza',
  highSwarmAgreementThreshold: 'Acuerdo mínimo del enjambre',
  enabled: 'Activo',
  newsWeight: 'Peso noticias',
  sportsWeight: 'Peso contexto deportivo',
  officialSourcesWeight: 'Peso fuentes oficiales',
  topTraderWeight: 'Peso traders destacados',
  holderWeight: 'Peso holders',
  marketMoodWeight: 'Peso pulso del mercado',
  externalOddsWeight: 'Peso cuotas externas',
};

function sportLabel(value) {
  if (!value) return SPORT_LABELS.general;
  return SPORT_LABELS[value] || value;
}

function statusLabel(value) {
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return STATUS_LABELS[value] || value || '';
}

function thesisLabel(value) {
  return THESIS_LABELS[value] || value || '';
}

function classificationLabel(value) {
  return CLASSIFICATION_LABELS[value] || CLASSIFICATION_LABELS.WATCHLIST;
}

function agentLabel(value) {
  return AGENT_LABELS[value] || value || '';
}

function configLabel(value) {
  return CONFIG_LABELS[value] || value || '';
}

function translateSummary(summary = '') {
  return String(summary)
    .replace(/\bmarket mid\b/g, 'media del mercado')
    .replace(/\bbook skew\b/g, 'sesgo del libro')
    .replace(/\bspread\b/g, 'spread')
    .replace(/\bliquidity\b/g, 'liquidez')
    .replace(/\bswarm score\b/g, 'puntaje del enjambre')
    .replace(/\bswarm shift\b/g, 'ajuste del enjambre')
    .replace(/\bagreement\b/g, 'acuerdo');
}

function translateTitle(title = '') {
  const text = String(title || '').trim();
  const replacements = [
    [/^Will (.+?) win the (\d{4}) FIFA World Cup\?$/i, '¿Ganará $1 la Copa Mundial FIFA $2?'],
    [/^Will (.+?) win the FIFA World Cup\?$/i, '¿Ganará $1 la Copa Mundial FIFA?'],
    [/^Will (.+?) win the (\d{4}) World Cup\?$/i, '¿Ganará $1 la Copa Mundial $2?'],
    [/^Will (.+?) win the World Cup\?$/i, '¿Ganará $1 la Copa Mundial?'],
    [/^Will (.+?) win (.+?)\?$/i, '¿Ganará $1 $2?'],
    [/^Will (.+?) be the first pick in the (\d{4}) NBA draft\?$/i, '¿Será $1 la primera selección del draft NBA $2?'],
    [/^Will (.+?) retire before next NBA season\?$/i, '¿Se retirará $1 antes de la próxima temporada de la NBA?'],
    [/^Will (.+?) retire before next season\?$/i, '¿Se retirará $1 antes de la próxima temporada?'],
    [/^(.+?) agree to name stadium after (.+?)\?$/i, '¿$1 aceptará nombrar el estadio en honor a $2?'],
    [/^(.+?) vs\.? (.+)$/i, '$1 contra $2'],
    [/^(.+?) at (.+)$/i, '$1 visita a $2'],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(text)) return text.replace(pattern, replacement);
  }

  return text
    .replace(/\bFIFA World Cup\b/g, 'Copa Mundial FIFA')
    .replace(/\bWorld Cup\b/g, 'Copa Mundial')
    .replace(/\bNBA draft\b/g, 'draft NBA')
    .replace(/\bnext NBA season\b/g, 'próxima temporada de la NBA')
    .replace(/\bnext season\b/g, 'próxima temporada');
}

function translateNote(note = '') {
  const text = String(note);
  const replacements = [
    [/^agent failed$/i, 'agente fallido'],
    [/^ODDS_API_KEY missing$/i, 'falta ODDS_API_KEY'],
    [/^team travel unknown$/i, 'viaje del equipo desconocido'],
    [/^away travel ([\d.]+) miles$/i, 'viaje visitante $1 millas'],
    [/^sport (.+)$/i, (_, sport) => `deporte ${sportLabel(sport)}`],
    [/^(\d+) recent articles$/i, '$1 noticias recientes'],
    [/^sentiment ([\d.-]+)$/i, 'sentimiento $1'],
    [/^(\d+) fixture match\(es\) from sports API$/i, '$1 partidos desde API deportiva'],
    [/^(\d+) official fixture match\(es\)$/i, '$1 elementos oficiales de calendario'],
    [/^official futures context ([\d.-]+)$/i, 'contexto oficial de futuros $1'],
    [/^official record differential ([\d.-]+)$/i, 'diferencial oficial de record $1'],
    [/^(\d+) scrapeable official source\(s\)$/i, '$1 fuentes oficiales extraíbles'],
    [/^(\d+) relevant official item\(s\)$/i, '$1 elementos oficiales relevantes'],
    [/^coverage ([\d.-]+)$/i, 'cobertura $1'],
    [/^(\d+) holders$/i, '$1 holders'],
    [/^top5 concentration ([\d.]+)%$/i, 'concentración top 5 $1%'],
    [/^sparse futures market$/i, 'mercado de futuros con poca dispersión'],
    [/^mature holder set$/i, 'base de holders madura'],
    [/^depth skew ([\d.-]+)$/i, 'sesgo de profundidad $1'],
    [/^(\d+) qualified top traders positive PnL$/i, '$1 traders calificados con PnL positivo'],
    [/^(\d+) top traders filtered by effectiveness\/volume$/i, '$1 traders filtrados por efectividad/volumen'],
    [/^(\d+) relevant recent top-trader trades$/i, '$1 operaciones recientes relevantes de traders destacados'],
    [/^category SPORTS$/i, 'categoría Deportes'],
    [/^category OVERALL$/i, 'categoría General'],
    [/^(\d+) external odds event\(s\)$/i, '$1 eventos con cuotas externas'],
    [/^(\d+) bookmaker price\(s\)$/i, '$1 precios de casas de apuestas'],
    [/^no matching outcome consensus$/i, 'sin consenso para el resultado'],
    [/^external implied ([\d.]+)$/i, 'probabilidad implícita externa $1'],
    [/^official pages fetched (\d+)$/i, '$1 páginas oficiales descargadas'],
    [/^official relevant pages (\d+)$/i, '$1 páginas oficiales relevantes'],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(text)) return text.replace(pattern, replacement);
  }
  return translateSummary(text);
}

function translateReason(reason = '') {
  const text = String(reason);
  const replacements = [
    [/^Previous cycle still running$/i, 'El ciclo anterior sigue ejecutándose'],
    [/^no signal$/i, 'sin señal'],
    [/^orderbook unavailable$/i, 'libro de órdenes no disponible'],
    [/^orderbook not actionable$/i, 'libro de órdenes no ejecutable'],
    [/^spread too wide \((.+)\)$/i, 'spread demasiado amplio ($1)'],
    [/^model probability below entry price$/i, 'probabilidad del modelo por debajo del precio de entrada'],
    [/^edge below threshold \((.+)\)$/i, 'ventaja por debajo del umbral ($1)'],
    [/^undervaluation gap below threshold \((.+)\)$/i, 'brecha de infravaloración por debajo del umbral ($1)'],
    [/^EV below threshold \((.+)\)$/i, 'valor esperado por debajo del umbral ($1)'],
    [/^confidence below threshold \((.+)\)$/i, 'confianza por debajo del umbral ($1)'],
    [/^risk model returned zero stake$/i, 'el modelo de riesgo devolvio stake cero'],
    [/^max open trades reached \((.+)\)$/i, 'máximo de apuestas abiertas alcanzado ($1)'],
    [/^daily loss limit reached \((.+)\)$/i, 'límite de pérdida diaria alcanzado ($1)'],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(text)) return text.replace(pattern, replacement);
  }
  return translateSummary(text);
}

function translateAgent(agent = {}) {
  return {
    ...agent,
    label: agentLabel(agent.name),
    notes: Array.isArray(agent.notes) ? agent.notes.map(translateNote) : [],
  };
}

module.exports = {
  agentLabel,
  classificationLabel,
  configLabel,
  sportLabel,
  statusLabel,
  thesisLabel,
  translateAgent,
  translateNote,
  translateReason,
  translateSummary,
  translateTitle,
};
