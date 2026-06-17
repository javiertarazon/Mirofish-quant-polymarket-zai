const { PrismaClient } = require('../src/generated/prisma');
require('../src/core/Config');

const prisma = new PrismaClient();

function parseOlderThanHours(args) {
  const value = args.find((arg) => arg.startsWith('--older-than-hours='));
  if (!value) return 0;

  const hours = Number(value.split('=')[1]);
  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error('--older-than-hours must be a positive number');
  }

  return hours;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const olderThanHours = parseOlderThanHours(args);
  const where = {
    status: 'OPEN',
    isShadowTrade: true,
  };

  if (olderThanHours > 0) {
    where.executedAt = {
      lt: new Date(Date.now() - olderThanHours * 60 * 60 * 1000),
    };
  }

  const [count, sample] = await Promise.all([
    prisma.trade.count({ where }),
    prisma.trade.findMany({
      where,
      select: {
        id: true,
        marketId: true,
        stake: true,
        odds: true,
        executedAt: true,
      },
      orderBy: { executedAt: 'desc' },
      take: 10,
    }),
  ]);

  console.log(JSON.stringify({ matchingOpenShadowTrades: count, sample }, null, 2));

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to mark matching shadow trades as CANCELLED.');
    return;
  }

  const now = new Date();
  const result = await prisma.trade.updateMany({
    where,
    data: {
      status: 'CANCELLED',
      resolvedAt: now,
      notes: `Cancelled by reset-shadow-trades at ${now.toISOString()}`,
    },
  });

  console.log(JSON.stringify({ cancelled: result.count }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
