import { chromium, devices } from 'playwright';
const br = await chromium.launch();
for (const [ruta, nombre, prep] of [
  ['/', 'practica-tel', true],
  ['/decks/17/groups/78', 'cartas-tel', false],
]) {
  const p = await (await br.newContext({ ...devices['Pixel 5'], deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
  await p.goto('http://192.168.1.86:3000' + ruta, { waitUntil: 'networkidle' });
  if (prep) { await p.locator('.knd-group-card').nth(0).click(); await p.locator('.knd-group-card').nth(1).click(); }
  await p.waitForTimeout(700);
  await p.screenshot({ path: `.qa-scratch/${nombre}-app.png` });
  await p.close();
}
await br.close();
