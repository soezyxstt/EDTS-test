/* eslint-disable @typescript-eslint/no-require-imports -- Standalone local database regression check. */
// Node 24+: no Google credentials, no production database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');
const schema = require('../lib/db-schema.ts');
const client = createClient({ url: 'file::memory:' });
const db = drizzle(client);
let identity = { id: 'owner', role: 'franchisor' };
let demo;
function load(file, imports) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Request, Response, URL, TextDecoder, Uint8Array,
    require: name => imports[name] ?? require(name) });
  return exports;
}
const auth = load('lib/auth-server.ts', {
  'next/headers': { cookies: async () => ({ get: () => undefined }), headers: async () => ({}) },
  'next/navigation': { redirect: path => { throw new Error(`redirect:${path}`); } },
  '@/lib/auth': { auth: { api: { getSession: async () => ({ user: identity }) } } },
  '@/lib/demo-session': { DEMO_IDENTITIES: [], DEMO_SESSION_COOKIE: 'test' },
});
const api = load('app/api/workspace/route.ts', {
  '@/lib/db': { db }, '@/lib/db-schema': schema,
  '@/lib/auth-server': { getSession: async () => ({ user: identity }), getDemoSession: async () => demo },
});
const request = (view, body) => new Request(`http://localhost/api/workspace?view=${view}`, body
  ? { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
(async () => {
  await client.executeMultiple(`
    CREATE TABLE program (id TEXT PRIMARY KEY, ownerId TEXT, name TEXT, payload TEXT, createdAt INTEGER, updatedAt INTEGER);
    CREATE TABLE application (id TEXT PRIMARY KEY, programId TEXT, applicantId TEXT, reviewerId TEXT, stage TEXT, payload TEXT, createdAt INTEGER, updatedAt INTEGER);
  `);
  await db.insert(schema.program).values([{ id: 'owned', ownerId: 'owner', name: 'Owned', payload: { open: true }, createdAt: new Date(), updatedAt: new Date() },
    { id: 'other-program', ownerId: 'other', name: 'Other', payload: { open: true }, createdAt: new Date(), updatedAt: new Date() }]);
  await db.insert(schema.application).values({ id: 'other-application', programId: 'owned', applicantId: 'other', stage: 'submitted', payload: {}, createdAt: new Date(), updatedAt: new Date() });
  assert.equal((await auth.requireRole('applicant')).user.id, 'owner');
  assert.equal((await auth.requireRole('franchisor')).user.id, 'owner');
  assert.equal((await api.PUT(request('applicant', { applications: [{ id: 'own', programId: 'other-program', stage: 'submitted', applicantIdentityId: 'forged' }] }))).status, 200);
  const own = await (await api.GET(request('applicant'))).json();
  assert.deepEqual(own.applications.map(row => row.id), ['own']);
  assert.equal(own.applications[0].applicantIdentityId, 'owner');
  assert.equal(own.programs.length, 2);
  assert.equal((await api.PUT(request('applicant', { applications: [{ id: 'other-application', programId: 'owned', stage: 'approved' }] }))).status, 403);
  assert.equal((await api.PUT(request('applicant', { programs: [] }))).status, 403);
  const managed = await (await api.GET(request('manage'))).json();
  assert.deepEqual(managed.applications.map(row => row.id), ['other-application']);
  identity = { id: 'other', role: 'applicant' };
  await assert.rejects(auth.requireRole('franchisor'), { message: 'redirect:/profile' });
  assert.equal((await api.GET(request('manage'))).status, 403);
  demo = { id: 'tim', role: 'franchisor' };
  assert.equal((await api.GET(request('applicant'))).status, 401);
  console.log('PASS: Google franchisor can apply, submissions persist, own/review data isolated, applicant and demo guards retained');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => client.close());
