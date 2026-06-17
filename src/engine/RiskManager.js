const config = require('../core/Config');
const { clamp, round } = require('../utils/number');

class RiskManager {
  constructor(db) {
    this.db = db;
  }

  async canOpenTrade() {
    const openTrades = await this.db.getOpenTradeCount();
    if (openTrades >= config.risk.maxOpenTrades) {
      return { allowed: false, reason: `max open trades reached (${openTrades})` };
    }

    const todayPnl = await this.db.getTodayProfitLoss();
    const lossLimit = -config.risk.bankroll * config.risk.dailyLossLimitPct;
    if (todayPnl <= lossLimit) {
      return { allowed: false, reason: `daily loss limit reached (${round(todayPnl, 2)} USDC)` };
    }

    return { allowed: true };
  }

  calculateStake(probability, entryPrice) {
    return this.calculateStakeDetails(probability, entryPrice).stake;
  }

  calculateStakeDetails(probability, entryPrice) {
    if (entryPrice <= 0 || entryPrice >= 1 || probability <= entryPrice) {
      return {
        decimalOdds: entryPrice > 0 ? round(1 / entryPrice, 4) : 0,
        fullKelly: 0,
        fractionalKelly: 0,
        cappedByMaxStake: false,
        cappedByMaxPct: false,
        stake: 0,
      };
    }

    const decimalOdds = 1 / entryPrice;
    const b = decimalOdds - 1;
    const q = 1 - probability;
    const fullKelly = (b * probability - q) / b;
    const fractionalKelly = clamp(fullKelly * config.risk.kellyFraction, 0, config.risk.maxStakePct);
    const stake = config.risk.bankroll * fractionalKelly;

    return {
      decimalOdds: round(decimalOdds, 4),
      fullKelly: round(fullKelly, 4),
      fractionalKelly: round(fractionalKelly, 4),
      cappedByMaxStake: stake > config.risk.maxStake,
      cappedByMaxPct: fullKelly * config.risk.kellyFraction > config.risk.maxStakePct,
      stake: round(Math.min(stake, config.risk.maxStake), 2),
    };
  }
}

module.exports = { RiskManager };
