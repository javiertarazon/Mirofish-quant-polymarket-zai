const { PolymarketClient } = require('../src/services/PolymarketClient');
const { inferSportFromTitle } = require('../src/utils/teams');

const TARGET_SPORTS = new Set(['MLB', 'Soccer', 'Football', 'NBA', 'NFL', 'F1', 'MotoGP']);

function money(value) {
  return Number(value || 0).toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
}

function isoFromSeconds(value) {
  return new Date(Number(value || 0) * 1000).toISOString();
}

function addFlow(bucket, trader, trade) {
  const sport = inferSportFromTitle(`${trade.title || ''} ${trade.slug || ''} ${trade.eventSlug || ''}`);
  if (!TARGET_SPORTS.has(sport)) return;

  const key = `${sport}|${trade.title}|${trade.outcome}|${trade.side}`;
  const existing = bucket.get(key) || {
    sport,
    title: trade.title,
    outcome: trade.outcome,
    side: trade.side,
    size: 0,
    notional: 0,
    weightedPrice: 0,
    traders: new Set(),
    lastTradeAt: 0,
    slug: trade.slug,
  };

  const size = Number(trade.size) || 0;
  const price = Number(trade.price) || 0;
  existing.size += size;
  existing.notional += size * price;
  existing.weightedPrice += size * price;
  existing.traders.add(`${trader.rank}:${trader.userName}`);
  existing.lastTradeAt = Math.max(existing.lastTradeAt, Number(trade.timestamp) || 0);
  bucket.set(key, existing);
}

async function main() {
  const client = new PolymarketClient();
  const flows = await client.fetchTopTraderFlow({
    category: 'SPORTS',
    timePeriod: 'MONTH',
    topLimit: Number(process.env.TOP_TRADER_LIMIT || 10),
    tradesPerTrader: Number(process.env.TRADES_PER_TRADER || 50),
  });
  const bucket = new Map();

  for (const trader of flows) {
    for (const trade of trader.trades || []) {
      if (!trade.title || !trade.side) continue;
      addFlow(bucket, trader, trade);
    }
  }

  const markets = [...bucket.values()]
    .map((market) => ({
      ...market,
      avgPrice: market.size ? market.weightedPrice / market.size : 0,
      traders: [...market.traders],
    }))
    .sort((a, b) => b.notional - a.notional);

  const bySport = {};
  for (const market of markets) {
    bySport[market.sport] ||= [];
    if (bySport[market.sport].length < 5) {
      bySport[market.sport].push({
        title: market.title,
        side: market.side,
        outcome: market.outcome,
        size: Number(market.size.toFixed(2)),
        avgPrice: Number(market.avgPrice.toFixed(4)),
        notional: Number(market.notional.toFixed(2)),
        traders: market.traders,
        lastTradeAt: isoFromSeconds(market.lastTradeAt),
        slug: market.slug,
      });
    }
  }

  console.log(`Top sports flow report generated at ${new Date().toISOString()}`);
  console.log(`Source: ${client.data.defaults.baseURL}`);
  console.log(`Top traders analyzed: ${flows.length}`);

  for (const sport of ['MLB', 'Soccer', 'Football', 'NBA', 'NFL', 'F1', 'MotoGP']) {
    const rows = bySport[sport] || [];
    console.log(`\n${sport}: ${rows.length ? '' : 'no recent top-trader flow found'}`);
    for (const row of rows) {
      console.log(`- ${row.side} ${row.outcome} | ${row.title}`);
      console.log(`  notional $${money(row.notional)} | size ${money(row.size)} | avg ${row.avgPrice} | traders ${row.traders.join(', ')}`);
      console.log(`  last ${row.lastTradeAt} | ${row.slug}`);
    }
  }
}

main().catch((error) => {
  console.error(error.response?.data || error.message);
  process.exitCode = 1;
});
