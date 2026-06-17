const config = require('../core/Config');
const { agentResult } = require('./AgentResult');

class TopTraderAgent {
  constructor(polymarketClient) {
    this.name = 'top_traders';
    this.client = polymarketClient;
  }

  async analyze({ market }) {
    const category = market.sport === 'general' ? 'OVERALL' : 'SPORTS';
    const flows = await this.client.fetchTopTraderFlow({
      category,
      timePeriod: 'MONTH',
      topLimit: 10,
      tradesPerTrader: 25,
    });
    const qualifiedFlows = flows.filter(isQualifiedTopTrader);
    const profitable = qualifiedFlows.filter(trader => Number(trader.pnl) > 0);
    const pnl = qualifiedFlows.reduce((sum, trader) => sum + (Number(trader.pnl) || 0), 0);
    const vol = qualifiedFlows.reduce((sum, trader) => sum + (Number(trader.volume) || 0), 0);
    const relevantTrades = findRelevantTrades(qualifiedFlows, market)
      .filter(item => tradeNotional(item.trade) >= config.topTraders.minRelevantNotional);
    const yesFlow = relevantTrades
      .filter(item => isOutcomeAligned(item.trade, market.yesOutcome))
      .reduce((sum, item) => sum + tradeNotional(item.trade), 0);
    const noFlow = relevantTrades
      .filter(item => isOutcomeAligned(item.trade, market.noOutcome))
      .reduce((sum, item) => sum + tradeNotional(item.trade), 0);
    const directionalFlow = yesFlow + noFlow > 0 ? (yesFlow - noFlow) / (yesFlow + noFlow) : 0;
    const pnlQuality = qualifiedFlows.length ? Math.max(-1, Math.min(1, pnl / Math.max(vol, 1))) : 0;
    const score = Math.max(-1, Math.min(1, (directionalFlow * 0.75) + (pnlQuality * 0.25)));
    const confidence = Math.min(
      1,
      (qualifiedFlows.length / 10) * 0.35
        + Math.min(0.45, relevantTrades.length * 0.08)
        + Math.min(0.20, (yesFlow + noFlow) / 500000),
    );

    return agentResult({
      name: this.name,
      score,
      confidence,
      probabilityShift: score * confidence * 0.025,
      notes: [
        `${profitable.length}/${qualifiedFlows.length} qualified top traders positive PnL`,
        `${flows.length - qualifiedFlows.length} top traders filtered by effectiveness/volume`,
        `${relevantTrades.length} relevant recent top-trader trades`,
        `category ${category}`,
      ],
      data: {
        category,
        yesFlow,
        noFlow,
        directionalFlow,
        relevantTrades: relevantTrades.slice(0, 8).map(({ trader, trade }) => ({
          trader: trader.userName,
          rank: trader.rank,
          title: trade.title,
          side: trade.side,
          outcome: trade.outcome,
          price: Number(trade.price) || 0,
          size: Number(trade.size) || 0,
          notional: tradeNotional(trade),
          timestamp: trade.timestamp,
        })),
        thresholds: {
          minEffectiveness: config.topTraders.minEffectiveness,
          minMonthlyVolume: config.topTraders.minMonthlyVolume,
          minRelevantNotional: config.topTraders.minRelevantNotional,
        },
        top: qualifiedFlows.slice(0, 5).map(trader => ({
          rank: trader.rank,
          userName: trader.userName,
          pnl: trader.pnl,
          vol: trader.volume,
          effectiveness: traderEffectiveness(trader),
          wallet: trader.wallet,
        })),
      },
    });
  }
}

function isQualifiedTopTrader(trader) {
  return traderEffectiveness(trader) >= config.topTraders.minEffectiveness
    && (Number(trader.volume) || 0) >= config.topTraders.minMonthlyVolume;
}

function traderEffectiveness(trader) {
  return (Number(trader.pnl) || 0) / Math.max(Number(trader.volume) || 0, 1);
}

function findRelevantTrades(flows, market) {
  const titleTokens = tokenize(`${market.title || ''} ${market.slug || ''}`);
  const eventId = String(market.id || '').toLowerCase();
  const eventSlug = String(market.slug || '').toLowerCase();
  const matches = [];

  for (const trader of flows) {
    for (const trade of trader.trades || []) {
      const tradeTokens = tokenize(`${trade.title || ''} ${trade.slug || ''} ${trade.eventSlug || ''}`);
      const tokenOverlap = [...titleTokens].filter(token => tradeTokens.has(token)).length;
      const slugMatch = eventSlug && String(trade.slug || trade.eventSlug || '').toLowerCase().includes(eventSlug);
      const conditionMatch = eventId && eventId === String(trade.conditionId || '').toLowerCase();

      if (conditionMatch || slugMatch || tokenOverlap >= 2) {
        matches.push({ trader, trade });
      }
    }
  }

  return matches.sort((a, b) => tradeNotional(b.trade) - tradeNotional(a.trade));
}

function tokenize(value) {
  const ignored = new Set(['will', 'the', 'and', 'end', 'win', 'on', 'vs', 'at', 'spread', 'moneyline', 'yes', 'no']);
  return new Set(String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !ignored.has(token)));
}

function isOutcomeAligned(trade, outcome) {
  const tradeOutcome = String(trade.outcome || '').toLowerCase();
  const expected = String(outcome || '').toLowerCase();
  if (!tradeOutcome || !expected) return false;
  return tradeOutcome === expected || tradeOutcome.includes(expected) || expected.includes(tradeOutcome);
}

function tradeNotional(trade) {
  return (Number(trade.size) || 0) * (Number(trade.price) || 0);
}

module.exports = { TopTraderAgent };
