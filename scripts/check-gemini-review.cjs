// Node 24+: node scripts/check-gemini-review.cjs against local dev, using synthetic data only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const answers = { experience: 'Data pengujian: mengelola usaha katering selama 3 tahun.', investmentCapacity: 'Rp 10-25 miliar',
    city: 'Bandung', siteArea: '500', buildingType: 'Ruko', siteOwnership: 'Sewa',
    siteNotes: 'Data pengujian. Belum ada survei lapangan atau bukti pendanaan.' };
  const input = { programName: 'Mitra Pengelola Restoran', answers,
    fields: Object.keys(answers).map((id) => ({ id, label: id, type: 'text', required: false })),
    screening: { outcome: 'pass', checks: [], reasons: [] }, documentFieldIds: ['businessProfile', 'financialSummary'], aiConsent: true };
  const form = new FormData();
  form.set('payload', JSON.stringify(input));
  for (const [id, name] of [['businessProfile', 'test-business-profile.pdf'], ['financialSummary', 'test-financial-summary.pdf']]) {
    form.set(id, new File([fs.readFileSync(path.join(__dirname, '../output/pdf', name))], name, { type: 'application/pdf' }));
  }
  const started = Date.now();
  const response = await fetch(`${process.env.TEST_BASE_URL || 'http://localhost:3000'}/api/application-review`, {
    method: 'POST', body: form, signal: AbortSignal.timeout(65000),
  });
  const result = await response.json();
  console.log(JSON.stringify({ httpStatus: response.status, elapsedMs: Date.now() - started, source: result.source,
    reviewNote: result.reviewNote, locationRating: result.locationAssessment?.rating, documentFindings: result.documentFindings?.length, actions: result.actions?.length }));
  assert.ok(response.ok);
  assert.equal(result.source, 'gemini', 'Expected live Gemini review');
  assert.ok(result.locationAssessment?.summary);
  assert.equal(result.documentFindings.length, 2);
  assert.ok(Array.isArray(result.actions));
  for (const action of result.actions) {
    assert.ok(Object.hasOwn(answers, action.fieldId));
    assert.ok(action.evidence && answers[action.fieldId].includes(action.evidence), 'AI evidence must match the answer');
    assert.ok(action.suggestion);
  }
  console.log('PASS: live Gemini review, location assessment, both synthetic PDFs');
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
