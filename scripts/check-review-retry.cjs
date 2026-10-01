// Node 24+, Playwright via NODE_PATH: node scripts/check-review-retry.cjs
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { DEMO_APPLICATIONS } = require('../lib/demo-data.ts');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
    const application = { ...structuredClone(DEMO_APPLICATIONS[0]), id: 'review-retry-test',
      answers: { experience: 'Synthetic test', aiConsent: 'true' }, documents: [],
      summary: 'Saved review', reviewSource: 'rules', screening: { outcome: 'pass', reasons: [], checks: [] } };
    await page.context().addCookies([{ name: 'franchise-prototype-demo-session-v1', value: 'tim', url: base }]);
    await page.addInitScript((application) => localStorage.setItem('franchise-prototype:applications:v1', JSON.stringify([application])), application);
    let success = false;
    await page.route('**/api/application-review', async (route) => {
      // Multipart is covered by the live synthetic PDF smoke test.
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        summary: 'Updated Gemini review', strengths: [], concerns: [], questions: [], score: 100,
        source: success ? 'gemini' : 'rules', reviewNote: success ? undefined : 'HTTP 503 test',
        documentFindings: [], locationAssessment: { rating: 'insufficient-data', summary: 'Need survey', signals: [], gaps: [] },
      }) });
    });
    await page.goto(`${base}/manage/applications/${application.id}`);
    const button = page.getByRole('button', { name: 'Analisis ulang dengan Gemini', exact: true });
    await button.click();
    await page.getByText('HTTP 503 test', { exact: true }).waitFor();
    assert.ok((await page.locator('section[aria-labelledby="summary-heading"]').innerText()).includes('Saved review'));
    success = true;
    await button.click();
    await page.getByText('Analisis Gemini diperbarui.', { exact: true }).waitFor();
    assert.ok((await page.locator('section[aria-labelledby="summary-heading"]').innerText()).includes('Updated Gemini review'));
    console.log('PASS: failed retry preserves saved review; successful retry updates it');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
