const { PrismaClient } = require('@prisma/client');
const logger = require('./Logger');

class DatabaseManager {
  constructor() {
    this.enabled = Boolean(process.env.DATABASE_URL);
    this.prisma = null;
    this.memoryPredictions = [];
  }

  async connect() {
    if (!this.enabled) return false;

    try {
      this.prisma = new PrismaClient();
      await this.prisma.$connect();
      return true;
    } catch (error) {
      logger.warn('No se pudo conectar a la base de datos; se usará modo sin DB', {
        error: error && error.message ? error.message : String(error),
      });
      this.enabled = false;
      this.prisma = null;
      return false;
    }
  }

  async savePrediction(prediction) {
    if (!prediction) return null;

    if (!this.enabled || !this.prisma) {
      this.memoryPredictions.push(prediction);
      return prediction;
    }

    if (!prediction.market || !prediction.market.id) {
      logger.warn('Predicción sin market completo; guardando en memoria', {
        marketId: prediction.marketId,
      });
      this.memoryPredictions.push(prediction);
      return prediction;
    }

    const market = prediction.market;
    await this.prisma.market.upsert({
      where: { id: market.id },
      create: {
        id: market.id,
        title: market.title,
        description: market.description || null,
        sport: market.sport,
        category: market.category,
        outcome: market.outcome,
        odds: market.odds,
        volume: market.volume,
        liquidity: market.liquidity,
        expiresAt: new Date(market.expiresAt),
        isActive: market.isActive !== undefined ? Boolean(market.isActive) : true,
      },
      update: {
        title: market.title,
        description: market.description || null,
        sport: market.sport,
        category: market.category,
        outcome: market.outcome,
        odds: market.odds,
        volume: market.volume,
        liquidity: market.liquidity,
        expiresAt: new Date(market.expiresAt),
        isActive: market.isActive !== undefined ? Boolean(market.isActive) : true,
      },
    });

    return this.prisma.prediction.create({
      data: {
        marketId: market.id,
        predictedOutcome: prediction.predictedOutcome,
        confidence: prediction.confidence,
        probability: prediction.probability,
        expectedValue: prediction.expectedValue,
        kellySize: prediction.kellySize,
        reasoning: prediction.reasoning ? JSON.stringify(prediction.reasoning) : '{}',
        sources: prediction.sources ? JSON.stringify(prediction.sources) : '{}',
        status: prediction.status || 'PENDING',
        result: prediction.result ?? null,
        profitLoss: prediction.profitLoss ?? null,
        resolvedAt: prediction.resolvedAt ? new Date(prediction.resolvedAt) : null,
      },
    });
  }
}

module.exports = { DatabaseManager };

