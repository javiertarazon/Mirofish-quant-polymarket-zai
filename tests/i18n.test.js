const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classificationLabel,
  sportLabel,
  statusLabel,
  translateAgent,
  translateReason,
  translateSummary,
  translateTitle,
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

test('market titles are translated for dashboard presentation', () => {
  assert.equal(translateTitle('Will USA win the 2026 FIFA World Cup?'), '¿Ganará USA la Copa Mundial FIFA 2026?');
  assert.equal(translateTitle('Will LeBron James retire before next NBA season?'), '¿Se retirará LeBron James antes de la próxima temporada de la NBA?');
  assert.equal(translateTitle('Pittsburgh Pirates vs. Athletics'), 'Pittsburgh Pirates contra Athletics');
  assert.equal(translateTitle('Will Gustavo Bolívar win the 2026 Colombian presidential election?'), '¿Ganará Gustavo Bolívar las elecciones presidenciales de Colombia de 2026?');
});
