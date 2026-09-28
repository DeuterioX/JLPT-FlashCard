import { chromium } from 'playwright';
const br = await chromium.launch();
const p = await (await br.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
// Borrar grupo
await p.goto('http://192.168.1.86:3000/decks/17', { waitUntil: 'networkidle' });
await p.click('#group-delete-78');
await p.waitForTimeout(600);
await p.screenshot({ path: '.qa-scratch/mod-borrar-app.png', clip: { x: 380, y: 250, width: 680, height: 320 } });
// Nuevo mazo
await p.goto('http://192.168.1.86:3000/decks', { waitUntil: 'networkidle' });
await p.click('#new-deck-btn');
await p.waitForTimeout(600);
await p.screenshot({ path: '.qa-scratch/mod-crear-app.png', clip: { x: 380, y: 200, width: 680, height: 430 } });
await br.close();
