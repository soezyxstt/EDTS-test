// Run against local dev: node scripts/check-draft-autosave.cjs (Playwright via NODE_PATH).
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await page.context().addCookies([{ name: 'franchise-prototype-demo-session-v1', value: 'nadia', url: base }]);
    const key = 'franchise-prototype:applicant-draft:nadia:restaurant-partner';
    await page.goto(`${base}/apply/restaurant-partner`);
    await page.locator('#fullName').waitFor();
    await page.locator('#fullName').fill('Autosave Test');
    await page.locator('#email').fill('autosave@example.test');
    await page.locator('#phone').fill('081234567890');
    await page.locator('#governmentEmployment').selectOption('Tidak');
    await page.locator('#age').fill('30');
    await page.locator('#residentialAddress').fill('Alamat pengujian');
    if (await page.locator('#ktp').isVisible()) await page.locator('#ktp').fill('0000000000000000');
    await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || 'null')?.answers.fullName === 'Autosave Test', key);
    await page.getByRole('button', { name: 'Lanjutkan', exact: true }).click();
    assert.deepEqual((await page.getByRole('alert').allTextContents()).filter((text) => text.trim()), []);
    await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || 'null')?.stepIndex === 1, key);
    await page.reload();
    await page.getByRole('button', { name: 'Kembali', exact: true }).click();
    assert.equal(await page.locator('#fullName').inputValue(), 'Autosave Test');
    assert.equal(await page.locator('#phone').inputValue(), '081234567890');

    // Switching accounts must neither leak nor overwrite the previous applicant's draft.
    await page.evaluate(() => {
      localStorage.setItem('franchise-prototype:identity:v1', 'rizky');
      window.dispatchEvent(new Event('franchise-prototype:update'));
    });
    await page.waitForFunction(() => document.querySelector('#fullName')?.value === 'Rizky Pratama');
    await page.locator('#fullName').fill('Second Applicant');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('franchise-prototype:applicant-draft:rizky:restaurant-partner') || 'null')?.answers.fullName === 'Second Applicant');
    assert.equal(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).answers.fullName, key), 'Autosave Test');
    await page.goto(`${base}/apply/strategic-location`);
    await page.locator('#fullName').waitFor();
    assert.equal(await page.locator('#fullName').inputValue(), 'Rizky Pratama');
    console.log('PASS: autosave, step restore, account isolation, program isolation');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
