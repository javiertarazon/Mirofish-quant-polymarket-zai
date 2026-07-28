const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const dbPath = path.resolve(__dirname, '../prisma/test_auto_schema.db');

test('DatabaseManager initializes a fresh SQLite schema without manual migrate', () => {
  fs.rmSync(dbPath, { force: true });
  fs.rmSync(`${dbPath}-journal`, { force: true });

  const result = spawnSync(process.execPath, ['-e', `
    const { DatabaseManager } = require('./src/core/DatabaseManager');
    (async () => {
      const db = new DatabaseManager();
      await db.connect();
      await db.ensureSystemUser();
      const ok = await db.healthCheck();
      await db.disconnect();
      if (!ok) process.exit(2);
    })().catch((error) => {
      console.error(error);
      process.exit(1);
    });
  `], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: 'file:./test_auto_schema.db' },
    encoding: 'utf8',
  });

  fs.rmSync(dbPath, { force: true });
  fs.rmSync(`${dbPath}-journal`, { force: true });

  assert.equal(result.status, 0, result.stderr || result.stdout);
});
