const { agentResult } = require('./AgentResult');

class MarketMoodAgent {
  constructor() {
    this.name = 'market_mood';
  }

  async analyze({ market, micro }) {
    const depthTotal = micro.bidDepth + micro.askDepth;
    const depthSkew = depthTotal > 0 ? (micro.bidDepth - micro.askDepth) / depthTotal : 0;
    const liquidityScore = Math.min(1, Math.log10(Math.max(market.liquidity, 1)) / 6);
    const spreadScore = Math.max(0, 1 - micro.spread / 0.1);
    const skewScore = depthSkew < 0 ? depthSkew * 0.3 : depthSkew * 0.55;
    const score = Math.max(-1, Math.min(1, skewScore + liquidityScore * 0.25 + spreadScore * 0.2));
    const confidence = Math.max(0.1, Math.min(1, (liquidityScore + spreadScore) / 2));

    return agentResult({
      name: this.name,
      score,
      confidence,
      probabilityShift: score * confidence * 0.025,
      notes: [`depth skew ${depthSkew.toFixed(3)}`, `spread ${micro.spread.toFixed(4)}`],
      data: {
        bidDepth: micro.bidDepth,
        askDepth: micro.askDepth,
        liquidityScore,
        spreadScore,
      },
    });
  }
}

module.exports = { MarketMoodAgent };
