import { chromium, devices } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
const BASE = 'C:/Users/DeuterioX/AppData/Local/Temp/claude/C--Users-DeuterioX-Downloads-jlpt-flashcard/0d024772-ee7b-4aad-afe3-147b7e0e3f37/scratchpad/kc/project/';
const br = await chromium.launch();

// [nombre, ruta de la app, tablero del canvas, ancho, alto, preparar]
const PARES = [
  ['practica-esc', '/', 'Main.dc.html', 1440, 900],
  ['mazos-esc', '/decks', 'EscMazos.dc.html', 1440, 900],
  ['grupos-esc', '/decks/17', 'EscGrupos.dc.html', 1440, 900],
  ['cartas-esc', '/decks/17/groups/78', 'EscCartas.dc.html', 1440, 900],
  ['stats-esc', '/stats', 'EscStats.dc.html', 1440, 900],
  ['mazos-tel', '/decks', 'TelMazos.dc.html', 390, 844],
  ['grupos-tel', '/decks/17', 'TelGrupos.dc.html', 390, 844],
  ['cartas-tel', '/decks/17/groups/78', 'TelCartas.dc.html', 390, 844],
  ['stats-tel', '/stats', 'TelStats.dc.html', 390, 844],
  ['practica-tel', '/', 'TelPractica.dc.html', 390, 844],
];
for (const [nombre, ruta, tablero, w, h] of PARES) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: 'dark' });
  const p = await ctx.newPage();
  await p.goto('http://192.168.1.86:3000' + ruta, { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `.qa-scratch/${nombre}-app.png` });
  await p.close();

  const src = readFileSync(BASE + tablero, 'utf8')
    .replace(/<script src="\.\/support\.js"><\/script>/, '').replace(/<x-dc>|<\/x-dc>/g, '')
    .replace(/<helmet>|<\/helmet>/g, '').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/, '');
  writeFileSync('.qa-scratch/t.html', src);
  const q = await (await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage();
  await q.goto(pathToFileURL('.qa-scratch/t.html').href);
  await q.waitForTimeout(1100);
  await q.screenshot({ path: `.qa-scratch/${nombre}-dis.png` });
  await q.close();
}
await br.close();
console.log('listo:', PARES.length, 'pares');
