const { BETTING_SOURCES, SOURCE_REGISTRY } = require('../src/services/sports/SportsSourceRegistry');

for (const [sport, profile] of Object.entries(SOURCE_REGISTRY)) {
  console.log(`\n${sport}`);
  console.log('  Official stats:');
  for (const source of profile.officialStats) console.log(`  - ${source.name}: ${source.url}`);
  console.log('  Official news:');
  for (const source of profile.officialNews) console.log(`  - ${source.name}: ${source.url}`);
  console.log(`  External news domains: ${profile.externalNewsDomains.join(', ') || 'none'}`);
}

console.log('\nExternal betting / odds references:');
for (const source of BETTING_SOURCES) console.log(`- ${source.name}: ${source.url}`);
