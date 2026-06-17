/**
 * MiroFish Quant - Main Entry Point
 */

const config = require('./core/Config');
const { PredictionEngine } = require('./engine/PredictionEngine');
const { TelegramService } = require('./services/TelegramService');
const { DatabaseManager } = require('./core/DatabaseManager');
const logger = require('./core/Logger');

class MiroFishQuant {
  constructor() {
    this.db = new DatabaseManager();
    this.telegram = new TelegramService();
    this.engine = new PredictionEngine(this.db);
    this.isRunning = false;
    this.timer = null;
  }

  async initialize() {
    logger.info(`Starting ${config.app.name} ${config.app.version}`);

    try {
      await this.db.connect();
      await this.db.ensureSystemUser();
      logger.info('Database connected');

      await this.telegram.initialize();
      logger.info('Telegram initialized');

      await this.engine.initialize();
      logger.info('Prediction engine ready');

      return true;
    } catch (error) {
      logger.error('Initialization failed', error);
      return false;
    }
  }

  async startTradingCycle() {
    if (this.isRunning) {
      logger.warn('Previous cycle still running; skipping overlap');
      return { skipped: true, reason: 'Previous cycle still running' };
    }

    this.isRunning = true;
    logger.info('Starting trading cycle');
    const startedAt = new Date();

    try {
      const marketUniverse = await this.engine.scanMarketUniverse();
      const marketsStored = await this.db.saveScannedMarkets(marketUniverse);
      const markets = this.engine.selectMarketsForCycle(marketUniverse);
      logger.info(`Candidate markets: ${markets.length}`);
      const stats = {
        marketsDiscovered: marketUniverse.length,
        marketsStored,
        candidates: markets.length,
        analyzed: 0,
        rejected: 0,
        signals: 0,
        executed: 0,
        queued: 0,
      };
      const rejectionReasons = new Map();

      for (const market of markets) {
        stats.analyzed += 1;
        const prediction = await this.engine.generatePrediction(market);
        if (!prediction) {
          stats.rejected += 1;
          const reason = this.engine.lastRejection?.reason || 'no signal';
          rejectionReasons.set(reason, (rejectionReasons.get(reason) || 0) + 1);
          continue;
        }
        stats.signals += 1;

        logger.info(`Signal ${prediction.marketId}: confidence ${prediction.confidence}% EV ${prediction.expectedValue}`);

        const savedPrediction = await this.db.savePrediction(prediction);
        await this.telegram.sendSignal(prediction);
        if (prediction.reasoning.quality?.automaticExecutionAllowed) {
          await this.engine.executeTrade(prediction, savedPrediction.id);
          stats.executed += 1;
        } else {
          stats.queued += 1;
          const reason = prediction.reasoning.quality?.executionBlockedReason || 'manual execution required';
          logger.info(`Signal queued for manual execution ${prediction.marketId}: ${reason}`);
        }
      }

      const rejectionSummary = Object.fromEntries(
        [...rejectionReasons.entries()].sort((a, b) => b[1] - a[1]),
      );
      logger.info('Trading cycle completed', { ...stats, rejectionSummary });
      await this.telegram.sendCycleSummary({ stats, rejectionSummary });
      return {
        ok: true,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        stats,
        rejectionSummary,
      };
    } catch (error) {
      const errorInfo = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      };
      logger.error('Trading cycle failed', errorInfo);
      return {
        ok: false,
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        error: errorInfo,
      };
    } finally {
      this.isRunning = false;
    }
  }

  async run() {
    const initialized = await this.initialize();

    if (!initialized) {
      logger.error('No se pudo iniciar el sistema. Saliendo...');
      process.exit(1);
    }

    await this.startTradingCycle();

    if (config.app.runOnce) {
      await this.shutdown();
      return;
    }

    this.timer = setInterval(() => {
      this.startTradingCycle();
    }, config.app.cycleMs);

    logger.info(`Scheduler enabled every ${Math.round(config.app.cycleMs / 1000)} seconds`);
  }

  async shutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.db.disconnect();
    logger.info('Shutdown complete');
  }
}

const app = new MiroFishQuant();

process.on('SIGINT', () => app.shutdown().then(() => process.exit(0)));
process.on('SIGTERM', () => app.shutdown().then(() => process.exit(0)));

if (require.main === module) {
  app.run().catch((error) => {
    logger.error('Fatal error', error);
    process.exit(1);
  });
}

module.exports = { MiroFishQuant };
