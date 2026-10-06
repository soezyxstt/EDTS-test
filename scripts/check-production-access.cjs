/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS check. */
// Run with Node 24+ against `next start`: node scripts/check-production-access.cjs
const assert = require('node:assert/strict');
const { registerHooks } = require('node:module');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const ts = require('typescript');
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith(".ts") && specifier.startsWith("./") && !require("node:path").extname(specifier)) specifier += ".ts";
  return next(specifier === '@/lib/demo-session' ? pathToFileURL(path.resolve(__dirname, '../lib/demo-session.ts')).href : specifier, context);
} });
process.env.NODE_ENV = 'production';
const { authURLs } = require('../lib/auth-config.ts');
const { writeDemoIdentity, clearDemoIdentity, canApply, readWorkspaceIdentity } = require('../lib/demo-session.ts');
const { DEMO_APPLICATIONS, readDemoApplications, writeDemoApplications, hydrateDemoWorkspace, clearDemoWorkspace, initializeDemoWorkspace, readDemoPrograms } = require('../lib/demo-data.ts');
const storage = new Map();
global.window = { localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, dispatchEvent() {} };
assert.equal(authURLs('http://localhost:3000', true).baseURL, 'https://edts-apm.adihnursyam.com');
assert.equal(authURLs('http://localhost:3000', false).baseURL, 'http://localhost:3000');
assert.equal(authURLs('https://test.example.com', true).baseURL, 'https://test.example.com');
writeDemoIdentity('nadia');
assert.equal(readDemoApplications().length, DEMO_APPLICATIONS.length);
writeDemoApplications([{ ...DEMO_APPLICATIONS[0], id: 'demo-test' }]);
clearDemoIdentity();
clearDemoWorkspace();
assert.deepEqual(readDemoApplications(), []);
hydrateDemoWorkspace([], [{ ...DEMO_APPLICATIONS[0], id: 'account-test' }]);
assert.equal(readDemoApplications()[0].id, 'account-test');
writeDemoIdentity('nadia');
assert.equal(readDemoApplications()[0].id, 'demo-test');
storage.set('franchise-prototype:programs:v2', '[]');
storage.set('franchise-prototype:applications:v1', '[]');
clearDemoIdentity();
initializeDemoWorkspace('tim');
assert.equal(readWorkspaceIdentity().id, 'tim');
assert.equal(readDemoPrograms().length, 2);
assert.equal(readDemoApplications().length, DEMO_APPLICATIONS.length);
assert.equal(canApply(readWorkspaceIdentity()), false);
const preserved = readDemoApplications();
preserved[0].summary = 'Preserve demo edits';
writeDemoApplications(preserved);
initializeDemoWorkspace('nadia');
assert.equal(readDemoApplications()[0].summary, 'Preserve demo edits');
assert.equal(canApply(readWorkspaceIdentity()), true);
clearDemoIdentity();
assert.equal(canApply({ id: 'google', name: 'Test', email: 'test@example.test', role: 'franchisor' }), true);

(async () => {
  // Exercise the signed-in branch without borrowing a real user's session token.
  const pageSource = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../app/sign-in/page.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const pageModule = { exports: {} };
  const pageRequire = name => name === '@/lib/auth-server' ? { getDemoSession: async () => null, getSession: async () => ({ user: { role: 'applicant' } }) }
    : name === 'next/navigation' ? { redirect: url => { throw new Error(`redirect:${url}`); } }
    : name === 'next/image' || name.startsWith('@/components/') ? {} : require(name);
  new Function('require', 'module', 'exports', pageSource)(pageRequire, pageModule, pageModule.exports);
  await assert.rejects(pageModule.exports.default({ searchParams: Promise.resolve({ callbackURL: '/apply/restaurant-partner' }) }), { message: 'redirect:/apply/restaurant-partner' });
  await assert.rejects(pageModule.exports.default({ searchParams: Promise.resolve({ callbackURL: '//untrusted.example' }) }), { message: 'redirect:/' });
  await assert.rejects(pageModule.exports.default({ searchParams: Promise.resolve({ callbackURL: '/sign-in' }) }), { message: 'redirect:/profile' });
  const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const request = (url, options = {}) => fetch(`${base}${url}`, { redirect: 'manual', ...options });
  assert.equal((await request('/apply/restaurant-partner')).status, 307);
  assert.equal((await request('/api/demo-session', { method: 'POST', headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ identityId: 'tim' }) })).status, 403);
  for (const [id, route] of [['nadia', '/apply/restaurant-partner'], ['tim', '/manage']]) {
    const response = await request('/api/demo-session', { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ identityId: id }) });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const signIn = await request(`/sign-in?callbackURL=${encodeURIComponent(route)}`, { headers: { Cookie: cookie } });
    assert.equal(signIn.status, 307);
    assert.equal(new URL(signIn.headers.get('location'), base).pathname, route);
    assert.equal((await request(`/sign-in?callbackURL=${encodeURIComponent(id === 'tim' ? '/apply/restaurant-partner' : '/manage')}`, { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await request(route, { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await request('/profile', { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await request('/api/workspace', { headers: { Cookie: cookie } })).status, 401);
    assert.equal((await request('/api/workspace', { method: 'PUT', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
    assert.equal((await request(id === 'tim' ? '/apply/restaurant-partner' : '/manage', { headers: { Cookie: cookie } })).status, 307);
  }
  const oauth = await request('/api/auth/sign-in/social', { method: 'POST', headers: { Origin: 'https://edts-apm.adihnursyam.com', Cookie: 'probe=1', 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' }, body: JSON.stringify({ provider: 'google', callbackURL: '/' }) });
  assert.equal(oauth.status, 200);
  const callback = new URL((await oauth.json()).url).searchParams.get('redirect_uri');
  assert.equal(callback, 'https://edts-apm.adihnursyam.com/api/auth/callback/google');
  assert.equal((await request('/api/auth/sign-in/social', { method: 'POST', headers: { Origin: 'https://untrusted.example', Cookie: 'probe=1', 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'google', callbackURL: '/' }) })).status, 403);
  console.log('PASS: production demo, role guards, account isolation, database denial, OAuth callback, origin checks');
})().catch(error => { console.error(error); process.exitCode = 1; });
