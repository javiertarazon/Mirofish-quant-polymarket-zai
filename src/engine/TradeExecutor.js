const config = require('../core/Config');
const logger = require('../core/Logger');

class TradeExecutor {
  constructor(db) {
    this.db = db;
    this.liveClient = null;
  }

  async initialize() {
    if (config.execution.mode !== 'live') {
      logger.info('Execution mode: shadow');
      return;
    }

    if (!config.execution.liveEnabled) {
      throw new Error('TRADING_MODE=live requires ENABLE_LIVE_TRADING=true');
    }

    if (!config.execution.privateKey) {
      throw new Error('Live trading requires POLYMARKET_PRIVATE_KEY');
    }

    logger.warn('Live trading requested. This build requires official SDK wiring before placing real orders.');
  }

  async execute(prediction, predictionDbId) {
    if (config.execution.mode !== 'live') {
      const execution = {
        mode: 'shadow',
        status: 'OPEN',
        predictionDbId,
        notes: `Shadow order only. Would buy ${prediction.side} token ${prediction.tokenId}.`,
      };
      await this.db.recordTrade(prediction, execution);
      return execution;
    }

    throw new Error('Live execution is intentionally disabled until official CLOB signing is configured and audited');
  }
}

module.exports = { TradeExecutor };
