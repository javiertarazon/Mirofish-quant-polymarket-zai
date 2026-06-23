const { SwarmOrchestrator } = require('../src/agents/SwarmOrchestrator');
const { PolymarketClient } = require('../src/services/PolymarketClient');

async function testWorldCup() {
  const pmClient = new PolymarketClient();
  const orchestrator = new SwarmOrchestrator(pmClient);
  
  const mockMarket = {
    title: 'Will Brazil win against Argentina in the World Cup?',
    sport: 'Soccer',
    category: 'Sports',
    endDate: new Date().toISOString()
  };
  
  console.log("Analyzing World Cup Market:", mockMarket.title);
  const result = await orchestrator.analyze({ market: mockMarket, baseSignal: { probability: 0.5 } });
  
  console.log("\n--- Final Analysis ---");
  console.log("Probability Shift:", result.probabilityShift);
  console.log("Score:", result.score);
  
  result.results.forEach(res => {
    if (res.enabled && res.name !== 'top_traders' && res.name !== 'holder_concentration' && res.name !== 'market_mood' && res.name !== 'external_odds') {
      console.log(`\n[Agent: ${res.name}]`);
      console.log(`Score: ${res.score} | Confidence: ${res.confidence}`);
      console.log("Notes:", res.notes.join(' | '));
      // Print first 2 data points for context
      const dataKeys = Object.keys(res.data);
      dataKeys.slice(0, 3).forEach(k => {
        console.log(`  ${k}:`, JSON.stringify(res.data[k]).slice(0, 100));
      });
    }
  });
}

testWorldCup().catch(console.error);
