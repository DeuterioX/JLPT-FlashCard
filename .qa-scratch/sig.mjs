import { chromium } from 'playwright';
const br = await chromium.launch();
const p = await (await br.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark' })).newPage();
await p.goto('http://192.168.1.86:3000/', { waitUntil: 'networkidle' });
// el mazo de palabras
await p.getByText('Minna no Nihongo I', { exact: true }).first().click();
await p.waitForTimeout(700);
console.log('botones:', await p.evaluate(() => [...document.querySelectorAll('#begin-meaning-btn, #begin-round-btn')]
  .map((b) => `${b.textContent.trim()}${b.disabled ? ' (off)' : ''}`)));
await p.locator('.knd-group-card').first().click();
await p.waitForTimeout(400);
console.log('con un grupo:', await p.evaluate(() => [...document.querySelectorAll('#begin-meaning-btn, #begin-round-btn')]
  .map((b) => `${b.textContent.trim()}${b.disabled ? ' (off)' : ''}`)));
await p.click('#begin-meaning-btn');
await p.waitForURL(/\/quiz/);
await p.waitForTimeout(900);
console.log('pantalla:', await p.evaluate(() => ({
  kana: document.querySelector('#meaning-kana')?.textContent,
  carta: document.querySelector('#meaning-caption')?.textContent,
  revelado: !!document.querySelector('#meaning-answer'),
  botones: [...document.querySelectorAll('#meaning-no, #meaning-si, #meaning-reveal')].map((b) => b.textContent.trim()),
})));
await p.screenshot({ path: '.qa-scratch/sig-1.png' });
await p.keyboard.press(' ');
await p.waitForTimeout(400);
console.log('tras Espacio:', await p.evaluate(() => ({
  significado: document.querySelector('#meaning-answer')?.textContent,
  lectura: document.querySelector('#meaning-reading')?.textContent,
  boton: document.querySelector('#meaning-reveal')?.textContent,
})));
await p.screenshot({ path: '.qa-scratch/sig-2.png' });
await br.close();
