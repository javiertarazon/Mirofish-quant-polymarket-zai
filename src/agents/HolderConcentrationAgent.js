const { agentResult } = require('./AgentResult');

class HolderConcentrationAgent {
  constructor(polymarketClient) {
    this.name = 'holder_concentration';
    this.client = polymarketClient;
  }

  async analyze({ market }) {
    const response = await this.client.fetchHolders(market.id, 20);
    const tokenBuckets = Array.isArray(response) ? response : [];
    const holders = tokenBuckets.flatMap(bucket => bucket.holders || []);
    const total = holders.reduce((sum, holder) => sum + (Number(holder.amount) || 0), 0);
    const topFive = holders
      .map(holder => Number(holder.amount) || 0)
      .sort((a, b) => b - a)
      .slice(0, 5)
      .reduce((sum, amount) => sum + amount, 0);
    const concentration = total > 0 ? topFive / total : 0;
    const score = total > 0 ? Math.max(-1, Math.min(1, (0.55 - concentration) * 2)) : 0;
    const confidence = Math.min(1, holders.length / 20);

    return agentResult({
      name: this.name,
      score,
      confidence,
      probabilityShift: score * confidence * 0.018,
      notes: [`${holders.length} holders`, `top5 concentration ${(concentration * 100).toFixed(1)}%`],
      data: {
        holderCount: holders.length,
        total,
        concentration,
      },
    });
  }
}

module.exports = { HolderConcentrationAgent };
