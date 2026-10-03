import { HIRAGANA, KATAKANA } from './tables';

export type KanaScript = 'hiragana' | 'katakana';

/**
 * El katakana es el hiragana desplazado 0x60 en Unicode: あ U+3042 → ア
 * U+30A2. Vale para todo el silabario, incluidos los chicos (っ → ッ), así
 * que no hace falta una segunda tabla que se pueda desincronizar.
 */
function aKatakana(s: string): string {
  return [...s].map((ch) => {
    const n = ch.codePointAt(0)!;
    return n >= 0x3041 && n <= 0x3096 ? String.fromCodePoint(n + 0x60) : ch;
  }).join('');
}

/**
 * romaji → hiragana, invirtiendo la tabla que ya existe. La PRIMERA aparición
 * gana, y ese orden resuelve solo las romanizaciones que dos kana comparten:
 * "o" cae en お y no en を, "zu" en ず y no en づ, "ji" en じ y no en ぢ, que
 * es lo que alguien espera al tipear.
 */
const HIRA: Record<string, string> = {};
for (const group of HIRAGANA) {
  for (const card of group.cards) {
    for (const r of card.romaji) if (!(r in HIRA)) HIRA[r] = card.prompt;
  }
}

/**
 * Para katakana se deriva lo anterior y se agregan los sonidos que SÓLO
 * existen en katakana (ファ, ヴィ, シェ...). Se agregan sin pisar: "ti" sigue
 * siendo チ y no ティ, que es la lectura básica y la que se espera por
 * defecto; a ティ se llega editando el campo.
 */
const KATA: Record<string, string> = {};
for (const [r, k] of Object.entries(HIRA)) KATA[r] = aKatakana(k);
for (const group of KATAKANA) {
  if (group.section !== 'Extendidos') continue;
  for (const card of group.cards) {
    for (const r of card.romaji) if (!(r in KATA)) KATA[r] = card.prompt;
  }
}

const VOWELS = 'aiueo';
/** Marca interna para la vocal larga, antes de convertirla en chōonpu. */
const LONG_MARK = '';

/**
 * Transcribe romaji a kana. Es la vuelta de `toRomaji`, y tiene una
 * ambigüedad que aquélla no tiene: el romaji NO dice el silabario. "neko" es
 * ねこ o ネコ según si la palabra es japonesa o prestada, y eso no se deduce
 * de las letras, así que el silabario entra por parámetro y lo elige quien
 * escribe.
 *
 * Los casos que no se resuelven letra por letra:
 *  - vocal larga: en katakana se escribe con chōonpu (suupaa → スーパー), que
 *    es la convención; en hiragana se escribe tal cual se tipeó, y por eso
 *    toukyou → とうきょう y ookii → おおきい salen los dos bien
 *  - sokuon: consonante doble (kitte → きって), salvo la n, que es otra cosa
 *  - ん: una n que no arranca sílaba. El apóstrofo la fuerza cuando lo que
 *    sigue podría formar uno (hon'ya → ほんや y no ほにゃ)
 *
 * Lo que no reconoce lo deja tal cual, igual que `toRomaji`: el campo es
 * editable en la UI.
 */
export function toKana(romaji: string, script: KanaScript): string {
  const table = script === 'katakana' ? KATA : HIRA;
  let s = romaji.toLowerCase().trim();
  if (!s) return '';

  if (script === 'katakana') {
    s = s.replace(/([aiueo])\1/g, `$1${LONG_MARK}`).replace(/ou/g, `o${LONG_MARK}`);
  }

  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];

    if (ch === LONG_MARK) { out += 'ー'; i += 1; continue; }
    if (ch === "'") { i += 1; continue; }

    // "nn" al final es la forma alternativa de ん que la tabla ya acepta.
    // Sólo al final: en el medio, la segunda n arranca la sílaba siguiente
    // (konnichiwa es ko-n-ni-chi-wa, no ko-nn-i-chi-wa).
    if (ch === 'n' && s[i + 1] === 'n' && i + 2 >= s.length) {
      out += table.n ?? 'ん';
      i += 2;
      continue;
    }

    // Sokuon: consonante repetida. La n queda afuera porque una n repetida
    // es ん + sílaba, no una consonante geminada.
    if (ch === s[i + 1] && ch !== 'n' && !VOWELS.includes(ch) && /[a-z]/.test(ch)) {
      out += script === 'katakana' ? 'ッ' : 'っ';
      i += 1;
      continue;
    }

    // ん: una n que no puede estar arrancando sílaba.
    if (ch === 'n' && (i + 1 >= s.length || !(VOWELS + 'y').includes(s[i + 1]))) {
      out += table.n ?? 'ん';
      i += 1;
      continue;
    }

    // La coincidencia más larga primero: "shi" antes que "si", "kya" antes
    // que "ka". Sin esto, cualquier contracción saldría partida.
    let found = false;
    for (let n = 3; n >= 1; n -= 1) {
      const chunk = s.slice(i, i + n);
      if (table[chunk]) {
        out += table[chunk];
        i += n;
        found = true;
        break;
      }
    }
    if (found) continue;

    out += ch;
    i += 1;
  }

  return out;
}
