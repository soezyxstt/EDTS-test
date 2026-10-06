/* eslint-disable @typescript-eslint/no-require-imports -- Standalone database bootstrap. */
// Idempotent: node scripts/seed-programs.cjs. Uses the configured franchisor; never overwrites programs.
const assert = require('node:assert/strict');
const { registerHooks } = require('node:module');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith('.ts') && specifier.startsWith('./') && !path.extname(specifier)) specifier += '.ts';
  return next(specifier === '@/lib/demo-session' ? pathToFileURL(path.resolve(__dirname, '../lib/demo-session.ts')).href : specifier, context);
} });
process.loadEnvFile('.env');
const { createClient } = require('@libsql/client');
const { DEMO_PROGRAMS } = require('../lib/demo-data.ts');

(async () => {
  const client = createClient({ url: process.env.TURSO_CONNECTION_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  const transaction = await client.transaction('write');
  try {
    const email = process.env.FRANCHISOR_EMAIL?.trim().toLowerCase();
    const owners = await transaction.execute(email
      ? { sql: "SELECT id FROM user WHERE role = 'franchisor' AND lower(email) = ?", args: [email] }
      : "SELECT id FROM user WHERE role = 'franchisor'");
    assert.equal(owners.rows.length, 1, 'Exactly one matching franchisor account is required.');
    const now = Date.now();
    for (const program of DEMO_PROGRAMS) {
      await transaction.execute({
        sql: 'INSERT INTO program (id, ownerId, name, payload, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
        args: [program.id, owners.rows[0].id, program.name, JSON.stringify(program), now, now],
      });
    }
    await transaction.commit();
    const result = await client.execute('SELECT count(*) AS total FROM program');
    console.log(`Program bootstrap complete: ${result.rows[0].total} programs available.`);
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally { transaction.close(); client.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
