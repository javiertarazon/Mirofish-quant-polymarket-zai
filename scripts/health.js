const { MiroFishQuant } = require('../src/index');

async function main() {
  const app = new MiroFishQuant();

  const initialized = await app.initialize();
  if (!initialized) process.exit(1);

  await app.startTradingCycle();
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
