/**
 * Carga «Minna no Nihongo I» desde el markdown de vocabulario y reemplaza el
 * mazo del mismo nombre.
 *
 *   npm run db:import:minna -- <archivo.md> [--dry]
 *
 * La base es la de `DATABASE_PATH`, o `database.db`. Con `--dry` sólo lista lo
 * que cargaría -grupos, cartas, respuestas y lo que saltea- sin tocar nada.
 *
 * OJO: REEMPLAZA el mazo, no lo actualiza. Borrar el mazo borra en cascada sus
 * cartas y con ellas los intentos registrados, así que cada carga deja en cero
 * las estadísticas de este mazo. En el server, parar el servicio y hacer
 * backup de la base antes.
 *
 * Cómo lee el archivo:
 *  - Cada lección (`# … Lección N …`) es una sección, y cada `##` un grupo.
 *  - Lo que no es una lección va a una sección «Referencia», al final. La tabla
 *    de países se parte en tres grupos: Países, Gentilicios e Idiomas.
 *  - Del cruce (`# Cruce …`) entra sólo lo marcado «Complemento», en un grupo
 *    «Complementos» al final de su lección.
 *  - Una fila con varias entradas separadas por ／ es una carta por entrada.
 *  - Lo que ya está en una lección no se repite en referencias ni complementos.
 *  - Una entrada sin kana -IMC, CD- se saltea: no hay nada que escribir.
 *
 * Las respuestas salen del kana con `toRomaji`, el mismo conversor de la app,
 * así きょうし es `kyoushi` como en el resto de los mazos. Se acepta además el
 * romaji del archivo cuando no lleva macrones, con y sin espacios, y lo
 * opcional entre ［］ con y sin esa parte.
 */
import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { toRomaji } from '../lib/kana/transliterate';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const [file] = args.filter((a) => a !== '--dry');
if (!file) {
  console.error('Uso: npm run db:import:minna -- <archivo.md> [--dry]');
  process.exit(1);
}
const dbPath = process.env.DATABASE_PATH ?? 'database.db';
const DECK = 'Minna no Nihongo I';

type Card = { prompt: string; meaning: string; romaji: string };
type Group = { section: string; name: string; cards: Card[] };

// La tabla de países no trae el nombre en castellano, sólo el del idioma.
const COUNTRY_ES: Record<string, string> = {
  アメリカ: 'Estados Unidos', イギリス: 'Reino Unido', イタリア: 'Italia', イラン: 'Irán', インド: 'India',
  インドネシア: 'Indonesia', エジプト: 'Egipto', オーストラリア: 'Australia', カナダ: 'Canadá', かんこく: 'Corea',
  サウジアラビア: 'Arabia Saudita', シンガポール: 'Singapur', スペイン: 'España', タイ: 'Tailandia',
  ちゅうごく: 'China', ドイツ: 'Alemania', にほん: 'Japón', フランス: 'Francia', フィリピン: 'Filipinas',
  ブラジル: 'Brasil', ベトナム: 'Vietnam', マレーシア: 'Malasia', メキシコ: 'México', ロシア: 'Rusia',
};

const KANA = /[぀-ヿ]/;

const cells = (line: string) => line.split('|').slice(1, -1).map((c) => c.trim());
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function sectionOf(title: string) {
  if (title.startsWith('Cruce')) return 'cross';
  const m = title.match(/Lección (\d+)/);
  return m ? `Lección ${m[1]}` : 'Referencia';
}

function parse(text: string) {
  const lessons: Group[] = [];
  const refs: Group[] = [];
  const complements: Record<string, Card[]> = {};
  let h1 = '';
  let h2 = '';
  let current: Group | null = null;
  let header: string[] = [];

  const open = (name: string) => {
    const section = sectionOf(h1);
    current = { section, name, cards: [] };
    (section === 'Referencia' ? refs : lessons).push(current);
    return current;
  };

  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('# ')) { h1 = line.slice(2).trim(); h2 = ''; current = null; header = []; continue; }
    if (line.startsWith('## ')) { h2 = line.slice(3).trim(); current = null; header = []; continue; }
    if (!line.startsWith('|')) continue;
    const c = cells(line);
    if (c.every((x) => /^:?-+:?$/.test(x))) continue;
    if (header.length === 0) { header = c; continue; }

    if (sectionOf(h1) === 'cross') {
      // Sólo lo que el cruce marca como nuevo: lo «ya incluido» ya está cargado.
      if (!c[3].startsWith('Complemento')) continue;
      const lesson = `Lección ${h2.match(/\d+/)![0]}`;
      const roms = c[1].split(' / ');
      c[0].split('／').forEach((k, i) =>
        (complements[lesson] ??= []).push({ prompt: k, meaning: c[2], romaji: roms[i] ?? roms[0] }));
      continue;
    }

    if (header[0] === 'País (kana)') {
      const [pk, pr, gk, gr, ik, ir, it] = c;
      if (!current) {
        open('Países');
        refs.push({ section: 'Referencia', name: 'Gentilicios', cards: [] });
        refs.push({ section: 'Referencia', name: 'Idiomas', cards: [] });
      }
      const [countries, demonyms, languages] = refs.slice(-3);
      const country = COUNTRY_ES[pk] ?? pr;
      countries.cards.push({ prompt: pk, meaning: country, romaji: pr });
      demonyms.cards.push({ prompt: gk, meaning: `persona de ${country}`, romaji: gr });
      languages.cards.push({ prompt: ik, meaning: it, romaji: ir });
      continue;
    }

    if (header[0] === 'Fecha') {
      const g = current ?? open('Días festivos');
      g.cards.push({ prompt: c[1], meaning: `${c[3]} (${c[0].replace('*', '')})`, romaji: c[2] });
      continue;
    }

    const g = current ?? open(h2 || h1);
    // «MT／ヨーネン／アキックス»: varias entradas en una fila, una carta cada una.
    const roms = c[1].split(' / ');
    c[0].split('／').forEach((k, i) => g.cards.push({ prompt: k, meaning: c[2], romaji: roms[i] ?? roms[0] }));
  }

  // Las lecciones en el orden del libro, cada una con sus complementos al
  // final, y después las referencias. El orden importa: la grilla de Práctica
  // abre una sección nueva cada vez que cambia la del grupo.
  const groups: Group[] = [];
  lessons.forEach((g, i) => {
    groups.push(g);
    const next = lessons[i + 1];
    if ((!next || next.section !== g.section) && complements[g.section]) {
      groups.push({ section: g.section, name: 'Complementos', cards: complements[g.section] });
    }
  });
  return [...groups, ...refs];
}

/** Las variantes de kana: con y sin lo opcional entre ［］, y cada lectura de （）. */
function kanaVariants(prompt: string): string[] {
  const base = prompt.split('（')[0];
  const alts = [...prompt.matchAll(/（([^）]+)）/g)].map((m) => m[1]);
  return [base, ...alts]
    .flatMap((k) => [k.replace(/［|］/g, ''), k.replace(/［[^］]*］/g, '')])
    .map((k) => k.replace(/[～〜。？！、]/g, '').trim())
    .filter(Boolean);
}

/** El romaji del archivo, sólo si queda en ASCII: los macrones no se pueden teclear. */
function romajiVariants(romaji: string): string[] {
  const base = romaji.split('(')[0];
  return [base.replace(/\[|\]/g, ''), base.replace(/\[[^\]]*\]/g, '')]
    .map((x) => x.toLowerCase().replace(/[~?.!…’',]/g, '').replace(/-/g, '').replace(/\s+/g, ' ').trim())
    .filter((x) => x && /^[a-z ]+$/.test(x));
}

type Built = { section: string; name: string; cards: { prompt: string; meaning: string; answers: string[] }[] };

function build(groups: Group[]) {
  const out: Built[] = [];
  const skipped: string[] = [];
  const inLessons = new Set<string>();
  for (const g of groups) {
    const isLesson = g.section !== 'Referencia' && g.name !== 'Complementos';
    const cards: Built['cards'] = [];
    const inGroup = new Set<string>();
    for (const c of g.cards) {
      const prompt = c.prompt.replace(/。$/, '').trim();
      const where = `${g.section} / ${g.name}: ${prompt}`;
      if (!KANA.test(prompt)) { skipped.push(`${where} (sin kana)`); continue; }
      if (inGroup.has(prompt)) continue;
      if (!isLesson && inLessons.has(prompt)) { skipped.push(`${where} (ya está en una lección)`); continue; }
      inGroup.add(prompt);
      if (isLesson) inLessons.add(prompt);

      const fromKana = kanaVariants(prompt).map((k) => toRomaji(k).replace(/\s+/g, ' ').trim());
      const fromFile = romajiVariants(c.romaji);
      // La primaria es la que se muestra al revelar: la del archivo, que trae
      // los espacios entre palabras, y si no la hay la del kana.
      const primary = fromFile[0] ?? fromKana[0];
      const answers = [...new Set([primary, ...fromFile, ...fromKana].flatMap((a) => [a, a.replace(/ /g, '')]))]
        .filter((a) => /^[a-z ]+$/.test(a));
      if (answers.length === 0) { skipped.push(`${where} (sin romaji)`); continue; }
      cards.push({ prompt, meaning: capitalize(c.meaning), answers });
    }
    if (cards.length) out.push({ section: g.section, name: g.name, cards });
  }
  return { groups: out, skipped };
}

const { groups, skipped } = build(parse(readFileSync(file, 'utf8')));
const total = groups.reduce((n, g) => n + g.cards.length, 0);
console.log(`${groups.length} grupos, ${total} cartas`);
for (const g of groups) console.log(`  ${g.section} · ${g.name}: ${g.cards.length}`);
console.log(`salteadas (${skipped.length}):${skipped.map((s) => `\n  ${s}`).join('')}`);

if (dry) {
  for (const g of groups) for (const c of g.cards) console.log(`${c.prompt}\t${c.answers.join(' | ')}\t${c.meaning}`);
  process.exit(0);
}

const db = new Database(dbPath);
// Sin esto los ON DELETE CASCADE no hacen nada y quedan cartas huérfanas.
db.pragma('foreign_keys = ON');
db.transaction(() => {
  const old = db.prepare('select id from deck where name = ?').all(DECK) as { id: number }[];
  for (const d of old) db.prepare('delete from deck where id = ?').run(d.id);
  const order = (db.prepare('select coalesce(max(sort_order), 0) + 1 n from deck').get() as { n: number }).n;
  // Incluido, como Hiragana y Katakana: viene del libro y no se edita en la app.
  const deckId = db.prepare('insert into deck (name, is_builtin, sort_order, created_at) values (?, 1, ?, ?)')
    .run(DECK, order, new Date().toISOString()).lastInsertRowid;
  const insertGroup = db.prepare('insert into card_group (deck_id, name, section, sort_order) values (?, ?, ?, ?)');
  const insertCard = db.prepare('insert into card (group_id, prompt, meaning, sort_order) values (?, ?, ?, ?)');
  const insertAnswer = db.prepare('insert into card_answer (card_id, romaji, is_primary) values (?, ?, ?)');
  groups.forEach((g, gi) => {
    const groupId = insertGroup.run(deckId, g.name, g.section, gi).lastInsertRowid;
    g.cards.forEach((c, ci) => {
      const cardId = insertCard.run(groupId, c.prompt, c.meaning, ci).lastInsertRowid;
      c.answers.forEach((a, ai) => insertAnswer.run(cardId, a, ai === 0 ? 1 : 0));
    });
  });
  console.log(`borrados: ${old.map((d) => d.id).join(', ') || 'ninguno'}; mazo nuevo: ${deckId}`);
})();
