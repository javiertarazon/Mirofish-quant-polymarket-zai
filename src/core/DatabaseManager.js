const { PrismaClient } = require('../generated/prisma');
const logger = require('./Logger');

class DatabaseManager {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async connect() {
    await this.prisma.$connect();
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  async upsertMarket(market) {
    return this.prisma.market.upsert({
      where: { id: market.id },
      update: {
        title: market.title,
        description: market.description,
        sport: market.sport,
        category: market.category,
        outcome: market.outcome,
        odds: market.odds,
        volume: market.volume,
        liquidity: market.liquidity,
        expiresAt: market.expiresAt,
        isActive: market.isActive,
      },
      create: market,
    });
  }

  async savePrediction(prediction) {
    await this.upsertMarket(prediction.marketRecord);

    return this.prisma.$transaction(async (tx) => {
      await tx.prediction.updateMany({
        where: {
          marketId: prediction.marketId,
          status: 'ACTIVE',
        },
        data: { status: 'SUPERSEDED' },
      });

      return tx.prediction.create({
        data: {
          marketId: prediction.marketId,
          predictedOutcome: prediction.outcome,
          confidence: prediction.confidence,
          probability: prediction.probability,
          expectedValue: prediction.expectedValue,
          kellySize: prediction.kellySize,
          reasoning: JSON.stringify(prediction.reasoning),
          sources: JSON.stringify(prediction.sources),
          status: 'ACTIVE',
        },
      });
    });
  }

  async recordTrade(prediction, execution) {
    const user = await this.ensureSystemUser();

    return this.prisma.trade.create({
      data: {
        userId: user.id,
        marketId: prediction.marketId,
        predictionId: execution.predictionDbId || null,
        side: prediction.side,
        stake: prediction.kellySize,
        odds: prediction.entryPrice,
        potentialProfit: prediction.kellySize * ((1 / prediction.entryPrice) - 1),
        status: execution.status || 'OPEN',
        isShadowTrade: execution.mode !== 'live',
        notes: execution.notes || null,
      },
    });
  }

  async ensureSystemUser() {
    return this.prisma.user.upsert({
      where: { email: 'system@mirofish.local' },
      update: {},
      create: { email: 'system@mirofish.local', name: 'MiroFish Bot' },
    });
  }

  async getOpenTradeCount() {
    return this.prisma.trade.count({ where: { status: 'OPEN' } });
  }

  async getTodayProfitLoss() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const aggregate = await this.prisma.trade.aggregate({
      where: {
        executedAt: { gte: start },
        profitLoss: { not: null },
      },
      _sum: { profitLoss: true },
    });

    return aggregate._sum.profitLoss || 0;
  }

  async saveAlert(predictionId, message, status = 'SENT') {
    const user = await this.ensureSystemUser();
    return this.prisma.alert.create({
      data: {
        userId: user.id,
        predictionId,
        message,
        channel: 'TELEGRAM',
        status,
      },
    });
  }

  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }
}

module.exports = { DatabaseManager };
