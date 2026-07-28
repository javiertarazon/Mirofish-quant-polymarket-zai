require('./Config');
const { PrismaClient } = require('../generated/prisma');
const logger = require('./Logger');

class DatabaseManager {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async connect() {
    await this.prisma.$connect();
    await this.ensureSchema();
  }

  async ensureSchema() {
    const statements = [
      `CREATE TABLE IF NOT EXISTS "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL, "name" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "Market" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "description" TEXT, "sport" TEXT NOT NULL, "category" TEXT NOT NULL, "outcome" TEXT NOT NULL, "odds" REAL NOT NULL, "volume" REAL NOT NULL, "liquidity" REAL NOT NULL, "expiresAt" DATETIME NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "Prediction" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "marketId" TEXT NOT NULL, "predictedOutcome" TEXT NOT NULL, "confidence" REAL NOT NULL, "probability" REAL NOT NULL, "expectedValue" REAL NOT NULL, "kellySize" REAL NOT NULL, "reasoning" TEXT NOT NULL, "sources" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "result" REAL, "profitLoss" REAL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" DATETIME, CONSTRAINT "Prediction_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS "Trade" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "userId" INTEGER NOT NULL, "marketId" TEXT NOT NULL, "predictionId" INTEGER, "side" TEXT NOT NULL, "stake" REAL NOT NULL, "odds" REAL NOT NULL, "potentialProfit" REAL NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "result" REAL, "profitLoss" REAL, "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "resolvedAt" DATETIME, "isShadowTrade" BOOLEAN NOT NULL DEFAULT true, "notes" TEXT, CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Trade_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Trade_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction" ("id") ON DELETE SET NULL ON UPDATE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS "TopTrader" ("id" TEXT NOT NULL PRIMARY KEY, "walletAddress" TEXT NOT NULL, "displayName" TEXT, "winRate" REAL NOT NULL, "totalTrades" INTEGER NOT NULL, "profitFactor" REAL NOT NULL, "totalProfit" REAL NOT NULL, "reliability" TEXT NOT NULL, "lastActive" DATETIME NOT NULL, "trackedSince" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "copiedTrades" INTEGER NOT NULL DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS "NewsArticle" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "title" TEXT NOT NULL, "source" TEXT NOT NULL, "url" TEXT NOT NULL, "content" TEXT, "sentiment" REAL NOT NULL, "relevance" REAL NOT NULL, "sport" TEXT, "teams" TEXT, "players" TEXT, "publishedAt" DATETIME NOT NULL, "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS "Alert" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "userId" INTEGER NOT NULL, "predictionId" INTEGER NOT NULL, "message" TEXT NOT NULL, "channel" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'SENT', "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
      `CREATE TABLE IF NOT EXISTS "CopyTradeLog" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "topTraderId" TEXT NOT NULL, "originalTradeId" TEXT NOT NULL, "market" TEXT NOT NULL, "side" TEXT NOT NULL, "stake" REAL NOT NULL, "copied" BOOLEAN NOT NULL DEFAULT false, "ourStake" REAL, "result" REAL, "profitLoss" REAL, "loggedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "CopyTradeLog_topTraderId_fkey" FOREIGN KEY ("topTraderId") REFERENCES "TopTrader" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
      `CREATE INDEX IF NOT EXISTS "Prediction_marketId_idx" ON "Prediction"("marketId")`,
      `CREATE INDEX IF NOT EXISTS "Prediction_status_idx" ON "Prediction"("status")`,
      `CREATE INDEX IF NOT EXISTS "Prediction_createdAt_idx" ON "Prediction"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "Trade_userId_idx" ON "Trade"("userId")`,
      `CREATE INDEX IF NOT EXISTS "Trade_marketId_idx" ON "Trade"("marketId")`,
      `CREATE INDEX IF NOT EXISTS "Trade_predictionId_idx" ON "Trade"("predictionId")`,
      `CREATE INDEX IF NOT EXISTS "Trade_status_idx" ON "Trade"("status")`,
      `CREATE INDEX IF NOT EXISTS "Trade_executedAt_idx" ON "Trade"("executedAt")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "TopTrader_walletAddress_key" ON "TopTrader"("walletAddress")`,
      `CREATE INDEX IF NOT EXISTS "Alert_userId_idx" ON "Alert"("userId")`,
      `CREATE INDEX IF NOT EXISTS "Alert_predictionId_idx" ON "Alert"("predictionId")`,
    ];

    for (const statement of statements) {
      await this.prisma.$executeRawUnsafe(statement);
    }
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

  async saveScannedMarkets(markets) {
    const records = markets.map(marketRecordFromScan).filter(Boolean);
    for (const record of records) {
      await this.upsertMarket(record);
    }
    return records.length;
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

function marketRecordFromScan(market) {
  if (!market?.id) return null;
  return {
    id: market.id,
    title: market.title,
    description: market.description || '',
    sport: market.sport || 'general',
    category: market.category || 'general',
    outcome: market.yesOutcome || market.outcomes?.[0] || 'Yes',
    odds: Number(market.yesPrice || 0),
    volume: Number(market.volume || 0),
    liquidity: Number(market.liquidity || 0),
    expiresAt: market.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
  };
}

module.exports = { DatabaseManager };
