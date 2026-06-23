const { SwarmOrchestrator } = require('../src/agents/SwarmOrchestrator');

async function test() {
  const orchestrator = new SwarmOrchestrator({});
  console.log("Registered Agents:", orchestrator.agents.map(a => a.instance.name).join(', '));
  
  const mockMarket = {
    title: 'Will Max Verstappen win the Miami Grand Prix?',
    sport: 'F1',
    endDate: new Date().toISOString()
  };
  
  // This just tests if the orchestrator can call analyze without crashing.
  const result = await orchestrator.analyze({ market: mockMarket, baseSignal: { probability: 0.5 } });
  console.log("Analysis Output:", JSON.stringify(result, null, 2));
}

test().catch(console.error);
