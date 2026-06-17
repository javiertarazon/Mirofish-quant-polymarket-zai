function agentResult({ name, enabled = true, score = 0, confidence = 0, probabilityShift = 0, notes = [], data = {} }) {
  return {
    name,
    enabled,
    score: clamp(score, -1, 1),
    confidence: clamp(confidence, 0, 1),
    probabilityShift: clamp(probabilityShift, -0.25, 0.25),
    notes,
    data,
  };
}

function disabledAgent(name, reason) {
  return agentResult({ name, enabled: false, notes: [reason] });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

module.exports = { agentResult, disabledAgent };
