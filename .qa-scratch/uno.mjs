import { chromium } from 'playwright';
const br = await chromium.launch();
const p = await (await br.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
await p.goto('http://192.168.1.86:3000/', { waitUntil: 'networkidle' });
await p.locator(".knd-group-card").nth(0).click();
await p.locator(".knd-group-card").nth(1).click();
await p.waitForTimeout(600);
await p.screenshot({ path: '.qa-scratch/practica-esc-app.png', clip: { x: 0, y: 60, width: 1440, height: 560 } });
await br.close();
