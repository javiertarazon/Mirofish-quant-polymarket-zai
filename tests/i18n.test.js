const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classificationLabel,
  sportLabel,
  statusLabel,
  translateAgent,
  translateReason,
  translateSummary,
} = require('../src/utils/i18n');

test('dashboard labels expose Spanish presentation values', () => {
  assert.equal(sportLabel('Soccer'), 'Fútbol');
  assert.equal(statusLabel('PENDING'), 'Pendiente');
  assert.equal(classificationLabel('SWARM_CONFIRMED'), 'Confirmada por enjambre');
});

test('agent notes and reasons are translated for dashboard and Telegram', () => {
  const agent = translateAgent({
    name: 'official_sources',
    notes: ['sport Soccer', '4 scrapeable official source(s)', 'coverage 0.75'],
  });

  assert.equal(agent.label, 'Fuentes oficiales');
  assert.deepEqual(agent.notes, [
    'deporte Fútbol',
    '4 fuentes oficiales extraíbles',
    'cobertura 0.75',
  ]);
  assert.equal(translateSummary('market mid 45%, swarm score 0.8, agreement 0.6'), 'media del mercado 45%, puntaje del enjambre 0.8, acuerdo 0.6');
  assert.equal(translateReason('EV below threshold (0.01)'), 'valor esperado por debajo del umbral (0.01)');
});
