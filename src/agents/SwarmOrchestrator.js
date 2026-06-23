const config = require('../core/Config');
const logger = require('../core/Logger');
const { clamp, round } = require('../utils/number');
const { ExternalOddsAgent } = require('./ExternalOddsAgent');
const { HolderConcentrationAgent } = require('./HolderConcentrationAgent');
const { MarketMoodAgent } = require('./MarketMoodAgent');
const { NewsSentimentAgent } = require('./NewsSentimentAgent');
const { OfficialSourcesAgent } = require('./OfficialSourcesAgent');
const { SportsContextAgent } = require('./SportsContextAgent');
const { TopTraderAgent } = require('./TopTraderAgent');
const { TeamRosterAgent } = require('./TeamRosterAgent');
const { MotorsportTechAgent } = require('./MotorsportTechAgent');

class SwarmOrchestrator {
  constructor(polymarketClient) {
    this.agents = [
      { weight: config.swarm.newsWeight, instance: new NewsSentimentAgent() },
      { weight: config.swarm.sportsWeight, instance: new SportsContextAgent() },
      { weight: config.swarm.officialSourcesWeight, instance: new OfficialSourcesAgent() },
      { weight: config.swarm.topTraderWeight, instance: new TopTraderAgent(polymarketClient) },
      { weight: config.swarm.holderWeight, instance: new HolderConcentrationAgent(polymarketClient) },
      { weight: config.swarm.marketMoodWeight, instance: new MarketMoodAgent() },
      { weight: config.swarm.externalOddsWeight, instance: new ExternalOddsAgent() },
      { weight: config.swarm.rosterWeight, instance: new TeamRosterAgent() },
      { weight: config.swarm.motorsportTechWeight, instance: new MotorsportTechAgent() },
    ];
  }

  async analyze(context) {
    if (!config.swarm.enabled) {
      return { probabilityShift: 0, confidenceBoost: 0, score: 0, results: [] };
    }

    const settled = await Promise.allSettled(this.agents.map(agent => agent.instance.analyze(context)));
    const results = settled.map((result, index) => {
      if (result.status === 'fulfilled') return { ...result.value, weight: this.agents[index].weight };
      logger.warn(`Agent ${this.agents[index].instance.name} failed: ${result.reason?.message || result.reason}`);
      return {
        name: this.agents[index].instance.name,
        enabled: false,
        score: 0,
        confidence: 0,
        probabilityShift: 0,
        notes: ['agent failed'],
        data: {},
        weight: this.agents[index].weight,
      };
    });

    const active = results.filter(result => result.enabled && result.confidence > 0 && result.weight > 0);
    const weightSum = active.reduce((sum, result) => sum + result.weight * result.confidence, 0);
    const rawShift = active.reduce((sum, result) => sum + result.probabilityShift * result.weight, 0);
    const score = weightSum
      ? active.reduce((sum, result) => sum + result.score * result.weight * result.confidence, 0) / weightSum
      : 0;
    const probabilityShift = clamp(rawShift, -config.swarm.maxProbabilityShift, config.swarm.maxProbabilityShift);
    const agreement = active.length
      ? active.filter(result => Math.sign(result.score) === Math.sign(score) || Math.abs(result.score) < 0.05).length / active.length
      : 0;
    const confidenceBoost = round(config.swarm.maxConfidenceBoost * Math.abs(score) * agreement, 2);

    return {
      probabilityShift: round(probabilityShift, 4),
      confidenceBoost,
      score: round(score, 4),
      agreement: round(agreement, 4),
      results,
    };
  }
}

module.exports = { SwarmOrchestrator };
