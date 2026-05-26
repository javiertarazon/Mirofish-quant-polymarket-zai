const { PredictionEngine } = require('../src/engine/PredictionEngine');
const { TelegramService } = require('../src/services/TelegramService');
const { DatabaseManager } = require('../src/core/DatabaseManager');

test('Servicios base se instancian', () => {
  expect(new PredictionEngine()).toBeInstanceOf(PredictionEngine);
  expect(new TelegramService()).toBeInstanceOf(TelegramService);
  expect(new DatabaseManager()).toBeInstanceOf(DatabaseManager);
});

