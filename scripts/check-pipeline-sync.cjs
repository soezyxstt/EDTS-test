// Node 24+, Playwright via NODE_PATH; requires localhost:3000.
const assert = require('node:assert/strict');
require('node:module').registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith(".ts") && specifier.startsWith("./") && !require("node:path").extname(specifier)) specifier += ".ts";
  return next(specifier === '@/lib/demo-session' ? new URL('../lib/demo-session.ts', require('node:url').pathToFileURL(__filename)).href : specifier, context);
} });
const { chromium } = require('playwright');
const { DEMO_APPLICATIONS } = require('../lib/demo-data.ts');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
    const application = { ...structuredClone(DEMO_APPLICATIONS[0]), id: 'pipeline-sync-test', stage: 'proposal',
      answers: { proposalChangeRequest: 'Synthetic request: three years' },
      proposal: { summary: 'Synthetic proposal', amount: 'Test only', sentAt: new Date().toISOString(),
        response: 'changes-requested', terms: { area: 'Test area', operatingModel: 'Test model', duration: '5 years', initialFee: '', royalty: '', conditions: '' } } };
    await context.addCookies([{ name: 'franchise-prototype-demo-session-v1', value: 'tim', url: base }]);
    await context.addInitScript(application => {
      const key = 'franchise-prototype:applications:v1';
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([application]));
    }, application);
    const first = await context.newPage();
    const second = await context.newPage();
    await first.goto(`${base}/manage/applications/${application.id}`);
    await second.goto(`${base}/manage/applications/${application.id}`);
    const proposal = first.locator('section[aria-labelledby="proposal-heading"]');
    await proposal.getByText('Catatan pemohon: Synthetic request: three years', { exact: true }).waitFor();
    await first.locator('#proposal-duration').fill('3 years');
    await first.getByRole('button', { name: 'Kirim proposal', exact: true }).click();
    await proposal.getByText('Menunggu respons pemohon.', { exact: true }).waitFor();
    await second.locator('#application-stage').selectOption('interview');
    await first.waitForFunction(() => document.querySelector('#application-stage')?.value === 'interview');
    await first.reload();
    await first.locator('#proposal-duration').waitFor();
    assert.equal(await first.locator('#application-stage').inputValue(), 'interview');
    assert.equal(await first.locator('#proposal-duration').inputValue(), '3 years');
    console.log('PASS: negotiation note, sent status, cross-tab stage sync, refresh persistence');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
