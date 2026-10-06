// Node 24+: node scripts/check-review-actions.cjs. Synthetic data, no provider calls.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS check. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { normalizeActions } = require('../lib/ai-actions.ts');
const fields = [
  { id: 'experience', label: 'Pengalaman', type: 'textarea', required: true },
  { id: 'siteNotes', label: 'Catatan lokasi', type: 'textarea', required: true },
  { id: 'fullName', label: 'Nama', type: 'text', required: true },
  { id: 'financialSummary', label: 'Dokumen', type: 'file', required: true },
];
const answers = { experience: 'Mengelola katering 3 tahun', fullName: 'Synthetic Person' };
const action = { fieldId: 'experience', evidence: 'katering 3 tahun', suggestion: 'Jelaskan peran operasional Anda.' };
assert.deepEqual(normalizeActions([
  action, action,
  { ...action, evidence: 'Mengelola 100 restoran' },
  { ...action, fieldId: 'unknown' },
  { ...action, fieldId: 'fullName', evidence: 'Synthetic Person' },
  { ...action, fieldId: 'financialSummary', evidence: '' },
  { ...action, fieldId: 'siteNotes', evidence: 'ramai' },
  { fieldId: 'siteNotes', evidence: '', suggestion: 'Jelaskan bukti kondisi lokasi.' },
], fields, answers), [action, { fieldId: 'siteNotes', evidence: '', suggestion: 'Jelaskan bukti kondisi lokasi.' }]);

const data = {};
const storage = new Map();
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/demo-data.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: data, structuredClone, Event,
  window: { localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) }, dispatchEvent() {} },
  require: (name) => name === '@/lib/demo-session' ? { isDemoWorkspace: () => true } : require(`../lib/${name.slice(2)}.ts`),
});
const application = { ...data.DEMO_APPLICATIONS[0], answers, reviewActions: [action], reviewSource: 'gemini' };
data.saveDemoApplication(application);
const updated = data.updateDemoApplication(application.id, { answers: { ...answers, experience: 'Updated answer' } });
assert.equal(updated.reviewSource, 'rules');
assert.equal(updated.reviewActions.length, 0);
assert.equal(data.updateDemoApplication(application.id, { summary: 'Late review' }, application), undefined);
// A replacement file can have the same name; the revision counter still invalidates a late OCR response.
const replacement = data.updateDemoApplication(application.id, { documents: updated.documents });
assert.equal(replacement.reviewRevision, updated.reviewRevision + 1);
assert.equal(data.updateDemoApplication(application.id, { summary: 'Late OCR' }, updated), undefined);

const exportsRoute = {};
let calls = 0;
const source = ts.transpileModule(fs.readFileSync('app/api/application-review/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, {
  exports: exportsRoute, Request, Response, File, AbortSignal, TextDecoder, Uint8Array, Buffer,
  process: { env: { GEMINI_API_KEY: 'synthetic-test-key' } },
  require: (name) => name.startsWith('@/lib/') ? require(`../lib/${name.slice(6)}.ts`) : require(name),
  fetch: async (_url, options) => {
    calls++;
    const prompt = JSON.parse(options.body).contents[0].parts[0].text;
    assert.ok(!prompt.includes('Synthetic Person'), 'Identity excluded from review prompt');
    const review = { summary: 'Synthetic review', strengths: [], concerns: [], questions: [],
      actions: [action, { ...action, fieldId: 'fullName', evidence: 'Synthetic Person' }],
      locationAssessment: { rating: 'insufficient-data', summary: 'Perlu survei', signals: [], gaps: [] }, documentFindings: [] };
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(review) }] } }] });
  },
});
(async () => {
  const input = { programName: 'Synthetic program', fields, answers, screening: { outcome: 'pass', checks: [], reasons: [] }, aiConsent: true };
  const request = (data) => new Request('http://localhost/api/application-review', { method: 'POST', body: JSON.stringify(data) });
  const result = await (await exportsRoute.POST(request(input))).json();
  assert.equal(result.source, 'gemini');
  assert.deepEqual(result.actions, [action]);
  const fallback = await (await exportsRoute.POST(request({ ...input, aiConsent: false }))).json();
  assert.equal(calls, 1, 'No provider call without consent');
  assert.equal(fallback.source, 'rules');
  assert.equal(fallback.actions[0].fieldId, 'siteNotes');
  console.log('PASS: grounded actions, missing data, duplicates, privacy, structured API output, consent fallback');
})().catch((error) => { console.error(error); process.exitCode = 1; });
