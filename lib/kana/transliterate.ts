import { HIRAGANA, KATAKANA } from './tables';

// Mapa prompt → romaji primario, construido desde las tablas para que no haya
// dos fuentes de verdad que se desincronicen.
const MAP: Record<string, string> = {};
for (const group of [...HIRAGANA, ...KATAKANA]) {
  for (const card of group.cards) MAP[card.prompt] = card.romaji[0];
}

const SOKUON = new Set(['っ', 'ッ']);
const CHOONPU = 'ー';
const VOWELS = new Set(['a', 'i', 'u', 'e', 'o']);

/**
 * Transcribe kana a romaji Hepburn.
 * Los tres casos que no se resuelven carácter por carácter:
 *  - contracciones (きゃ): hay que mirar dos caracteres antes que uno
 *  - sokuon (っ): duplica la consonante inicial de la sílaba siguiente
 *  - chōonpu (ー): repite la última vocal emitida
 * Lo que no reconoce lo deja tal cual; el campo es editable en la UI.
 */
export function toRomaji(kana: string): string {
  const chars = [...kana];
  let out = '';
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];

    if (SOKUON.has(ch)) {
      // Mirar la sílaba siguiente para saber qué consonante duplicar.
      const next = MAP[chars.slice(i + 1, i + 3).join('')] ?? MAP[chars[i + 1] ?? ''];
      if (next && !VOWELS.has(next[0])) out += next[0];
      i += 1;
      continue;
    }

    if (ch === CHOONPU) {
      const last = out.at(-1);
      if (last && VOWELS.has(last)) out += last;
      i += 1;
      continue;
    }

    // Dos caracteres primero: きゃ tiene que ganarle a き.
    const pair = chars.slice(i, i + 2).join('');
    if (pair.length === 2 && MAP[pair]) {
      out += MAP[pair];
      i += 2;
      continue;
    }

    if (MAP[ch]) {
      out += MAP[ch];
      i += 1;
      continue;
    }

    out += ch; // kanji, latino, puntuación
    i += 1;
  }

  return out;
}
