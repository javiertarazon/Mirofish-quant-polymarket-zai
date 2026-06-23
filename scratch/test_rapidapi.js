const { SwarmOrchestrator } = require('../src/agents/SwarmOrchestrator');
const { PolymarketClient } = require('../src/services/PolymarketClient');

async function runTest() {
  const pmClient = new PolymarketClient();
  const orchestrator = new SwarmOrchestrator(pmClient);
  
  const testCases = [
    { title: 'Will the Lakers beat the Warriors?', sport: 'NBA' },
    { title: 'Will the Yankees win against the Red Sox?', sport: 'MLB' },
    { title: 'Will the Chiefs win the Superbowl?', sport: 'NFL' },
    { title: 'Will Max Verstappen win the next race?', sport: 'F1' }
  ];

  for (const tc of testCases) {
    console.log(`\n--- Testing ${tc.sport} ---`);
    try {
      const result = await orchestrator.analyze({ market: tc, baseSignal: { probability: 0.5 } });
      const officialAgent = result.results.find(r => r.name === 'official_sources');
      if (officialAgent) {
        console.log(`Score: ${officialAgent.score} | Confidence: ${officialAgent.confidence}`);
        console.log("Notes:", officialAgent.notes.join(' | '));
      }
    } catch (e) {
      console.log(`Error testing ${tc.sport}:`, e.message);
    }
  }
}

runTest().catch(console.error);
