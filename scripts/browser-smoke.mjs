import { chromium } from 'playwright';

const baseURL = process.argv[2] || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const results = [];
const checks = async (name, fn) => {
  try { await fn(); results.push(`PASS ${name}`); }
  catch (error) { results.push(`FAIL ${name}: ${error.message}`); }
};

const browserErrors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', message => { if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`); });
page.on('pageerror', error => browserErrors.push(`pageerror: ${error.message}`));

for (const route of ['/', '/field', '/privacy', '/gate', '/admin', '/not-a-real-route']) {
  await checks(`desktop ${route} renders`, async () => {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    if (!(await page.locator('main').count())) throw new Error('main landmark missing');
    if (await page.locator('h1').count() === 0) throw new Error('page heading missing');
  });
}
await checks('desktop has no horizontal overflow', async () => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error('document is wider than viewport');
});
await checks('theme persists and mobile menu exposes state', async () => {
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  const themeButton = page.getByRole('button', { name: /switch to day|switch to night/i });
  await themeButton.click();
  const chosen = await page.locator('html').getAttribute('data-theme');
  const chosenBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (!chosen) throw new Error('theme attribute missing');
  if (await page.evaluate(() => localStorage.getItem('ECHORA_THEME')) !== chosen) throw new Error('theme was not persisted');
  await page.reload({ waitUntil: 'networkidle' });
  if (await page.locator('html').getAttribute('data-theme') !== chosen) throw new Error('theme did not persist after reload');
  await page.locator('button[aria-label^="Switch to"]').click();
  const alternateBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (chosenBackground === alternateBackground) throw new Error('day/night themes have the same background');
  await page.setViewportSize({ width: 375, height: 812 });
  const menu = page.getByRole('button', { name: 'Toggle navigation' });
  if (await menu.getAttribute('aria-expanded') !== 'false') throw new Error('menu state not exposed');
  await menu.click();
  if (await menu.getAttribute('aria-expanded') !== 'true') throw new Error('menu did not expose expanded state');
});
await checks('mobile routes fit and primary targets are touch-sized', async () => {
  for (const route of ['/', '/field', '/privacy']) {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      smallButtons: [...document.querySelectorAll('button, a.button')].filter(el => { const box = el.getBoundingClientRect(); return box.width < 44 || box.height < 44; }).length,
    }));
    if (result.overflow) throw new Error(`${route} overflows horizontally`);
    if (result.smallButtons) throw new Error(`${route} has ${result.smallButtons} undersized controls`);
  }
});
const reducedMotion = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
await checks('reduced motion disables non-essential animation', async () => {
  await reducedMotion.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  const animation = await reducedMotion.locator('.threshold-figure').evaluate(element => getComputedStyle(element).animationDuration);
  if (parseFloat(animation) > 0.001) throw new Error(`unexpected animation duration: ${animation}`);
});
await reducedMotion.close();
if (browserErrors.length) results.push(`FAIL browser errors: ${browserErrors.join(' | ')}`); else results.push('PASS no browser console/page errors');
await browser.close();
console.log(results.join('\n'));
if (results.some(result => result.startsWith('FAIL'))) process.exitCode = 1;
