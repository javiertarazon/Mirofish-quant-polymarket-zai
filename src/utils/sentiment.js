const POSITIVE = new Set([
  'win', 'wins', 'winning', 'healthy', 'available', 'returns', 'returning', 'strong', 'upgrade',
  'favored', 'favourite', 'favorite', 'dominant', 'rested', 'hot', 'streak', 'boost', 'cleared',
  'victory', 'beat', 'beats', 'upset', 'advantage',
]);

const NEGATIVE = new Set([
  'injury', 'injured', 'questionable', 'doubtful', 'out', 'suspended', 'illness', 'fatigue',
  'back-to-back', 'travel', 'downgrade', 'weak', 'cold', 'slump', 'loss', 'losses', 'probe',
  'arrest', 'trade request', 'controversy', 'miss', 'missing',
]);

function scoreText(text) {
  if (!text) return 0;
  const normalized = text.toLowerCase();
  let score = 0;

  for (const phrase of POSITIVE) {
    if (normalized.includes(phrase)) score += 1;
  }

  for (const phrase of NEGATIVE) {
    if (normalized.includes(phrase)) score -= 1;
  }

  const tokens = normalized.split(/[^a-z]+/).filter(Boolean);
  const scale = Math.max(3, Math.sqrt(tokens.length));
  return Math.max(-1, Math.min(1, score / scale));
}

function averageSentiment(items, selector = (item) => item) {
  const scores = items.map((item) => scoreText(selector(item))).filter(Number.isFinite);
  if (!scores.length) return 0;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

module.exports = { averageSentiment, scoreText };
