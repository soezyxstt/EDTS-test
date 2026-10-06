// Local dev, bundled Playwright via NODE_PATH. Synthetic data and mocked AI only.
/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS check. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const program = { id: 'ai-workflow-test', name: 'Program pengujian', open: true, summary: '', investmentLabel: '', operatingModel: 'Aktif', locations: 'Bandung', screeningRules: [], fields: [
  { id: 'fullName', label: 'Nama', type: 'text', required: true, section: 'Data diri' },
  { id: 'experience', label: 'Pengalaman', type: 'textarea', required: true, section: 'Pengalaman usaha' },
  { id: 'aiConsent', label: 'Izinkan analisis AI', type: 'checkbox', required: false, section: 'Persetujuan' },
  { id: 'financialSummary', label: 'Ringkasan finansial', type: 'file', required: false, section: 'Dokumen' },
] };
const answers = { fullName: 'Synthetic Test', experience: 'Mengelola katering 3 tahun', aiConsent: 'true' };
const brief = { source: 'gemini', summary: 'Synthetic review', strengths: [], concerns: [], questions: [], score: 100, documentFindings: [],
  actions: [{ fieldId: 'experience', evidence: 'katering 3 tahun', suggestion: 'Jelaskan peran operasional Anda.' }] };
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport });
      await context.addCookies([{ name: 'franchise-prototype-demo-session-v1', value: 'nadia', url: base }]);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(({ program, answers }) => {
        if (sessionStorage.getItem('ai-test-seeded')) return;
        localStorage.setItem('franchise-prototype:programs:v2', JSON.stringify([program]));
        localStorage.setItem(`franchise-prototype:applicant-draft:nadia:${program.id}`, JSON.stringify({ answers, stepIndex: 2 }));
        sessionStorage.setItem('ai-test-seeded', 'true');
      }, { program, answers });
      let requestCount = 0;
      await page.route('**/api/application-review', async (route) => {
        requestCount++;
        const input = route.request().postDataJSON();
        assert.deepEqual(input.documentFieldIds, []);
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(brief) });
      });
      await page.goto(`${base}/apply/${program.id}`);
      const check = page.getByRole('button', { name: 'Periksa draf dengan AI', exact: true });
      await check.waitFor();
      await page.locator('#aiConsent').uncheck();
      assert.equal(await check.isDisabled(), true);
      assert.equal(requestCount, 0);
      await page.locator('#aiConsent').check();
      await check.click();
      await page.getByText('Jelaskan peran operasional Anda.', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `artifacts/browser-tests/ai-draft-${viewport.width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Perbaiki jawaban', exact: true }).click();
      await page.locator('#experience').fill('Jawaban diperbarui');
      await page.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
      assert.equal(await page.getByText('Jelaskan peran operasional Anda.', { exact: true }).count(), 0, 'Stale draft suggestions hidden');

      await context.addCookies([{ name: 'franchise-prototype-demo-session-v1', value: 'tim', url: base }]);
      await page.evaluate(({ program, answers, brief }) => {
        localStorage.setItem('franchise-prototype:identity:v1', 'tim');
        localStorage.setItem('franchise-prototype:applications:v1', JSON.stringify([{
          id: 'ai-review-test', programId: program.id, programName: program.name, reference: 'TEST-001', applicantName: 'Synthetic Test',
          submittedAt: new Date().toISOString(), stage: 'review', owner: 'Tim Franchise', answers, summary: brief.summary,
          strengths: [], concerns: [], revisionItems: [], documents: [], score: 100, reviewActions: brief.actions, reviewSource: 'gemini',
          documentFindings: [{ fieldId: 'financialSummary', summary: 'Simulasi dana', verificationItems: ['Lampirkan bukti ketersediaan dana.'] }],
        }]));
      }, { program, answers, brief });
      await page.goto(`${base}/manage/applications/ai-review-test`);
      await page.getByRole('button', { name: 'Gunakan untuk draf revisi', exact: true }).click();
      assert.equal(await page.locator('#revision-items').inputValue(), brief.actions[0].suggestion);
      await page.getByRole('button', { name: 'Gunakan untuk draf revisi dokumen', exact: true }).click();
      assert.ok((await page.locator('#revision-items').inputValue()).includes('Lampirkan bukti ketersediaan dana.'));
      const readApplication = () => page.evaluate(() => JSON.parse(localStorage.getItem('franchise-prototype:applications:v1'))[0]);
      assert.equal((await readApplication()).stage, 'review', 'AI action only prepares a draft');
      await page.screenshot({ path: `artifacts/browser-tests/ai-review-${viewport.width}.png`, fullPage: true });
      await page.getByRole('button', { name: 'Kirim permintaan revisi', exact: true }).click();
      const saved = await readApplication();
      assert.equal(saved.stage, 'revision');
      assert.deepEqual(saved.revisionFieldIds, ['experience', 'financialSummary']);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('PASS: desktop/mobile draft coaching, consent, field navigation, stale results, editable revision draft, explicit sending');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
