// Node 24+: node scripts/check-review-errors.cjs (no network requests).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('app/api/application-review/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
let status = 503;
let calls = 0;
const routeExports = {};
vm.runInNewContext(source, { exports: routeExports, Request, Response, File, AbortSignal, TextDecoder, Uint8Array, Buffer,
  process: { env: { GEMINI_API_KEY: 'synthetic-test-key' } },
  require: (name) => name === '@/lib/screening' ? require('../lib/screening.ts') : require(name),
  fetch: async () => { calls++; return new Response('{}', { status }); },
});
const input = { programName: 'Test', fields: [{ id: 'experience', label: 'Pengalaman', type: 'text', required: true }],
  answers: { experience: 'Data pengujian' }, screening: { outcome: 'pass', checks: [], reasons: [] }, aiConsent: true };
(async () => {
  for (const code of [503, 429, 401, 403, 400]) {
    status = code;
    const result = await routeExports.POST(new Request('http://localhost/api/application-review', { method: 'POST', body: JSON.stringify(input) }));
    const review = await result.json();
    assert.equal(review.source, 'rules');
    assert.ok(review.reviewNote.includes(`HTTP ${code}`));
    assert.equal(review.documentFindings.length, 0);
  }
  const previousCalls = calls;
  await routeExports.POST(new Request('http://localhost/api/application-review', { method: 'POST', body: JSON.stringify({ ...input, aiConsent: false }) }));
  assert.equal(calls, previousCalls, 'No provider call without consent');
  console.log('PASS: explicit provider error messages, rules fallback, consent guard');
})().catch((error) => { console.error(error); process.exitCode = 1; });
