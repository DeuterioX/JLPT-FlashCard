/**
 * Los códigos de categoría gramatical de JMdict, llevados a una categoría que
 * la pantalla traduce.
 *
 * El diccionario los guarda crudos -`n`, `v5s`, `adj-na`, `exp`- porque son
 * los del archivo original, y así salían a la pantalla: nadie que no conozca
 * JMdict sabe que `v5s` es «verbo godan terminado en す».
 *
 * La clase de verbo NO se traduce: para una app de vocabulario, saber que
 * algo es un verbo alcanza, y distinguir godan de ichidan en una etiqueta de
 * 9px al costado de la fila no ayuda a nadie a elegir una palabra. En cambio
 * la distinción -i / -na de los adjetivos SÍ se conserva, porque cambia cómo
 * se usa la palabra en la frase.
 */
/** La clave de la categoría en los mensajes (`dict.pos.…`). */
export type PosCategory =
  | 'noun' | 'suffix' | 'prefix' | 'expression' | 'adverb' | 'interjection' | 'pronoun'
  | 'conjunction' | 'numeral' | 'counter' | 'particle' | 'copula' | 'auxiliary'
  | 'adjI' | 'adjNa' | 'adjective' | 'verb';

const EXACT: Record<string, PosCategory> = {
  n: 'noun',
  'n-suf': 'suffix',
  'n-pref': 'prefix',
  exp: 'expression',
  adv: 'adverb',
  'adv-to': 'adverb',
  int: 'interjection',
  pn: 'pronoun',
  conj: 'conjunction',
  pref: 'prefix',
  suf: 'suffix',
  num: 'numeral',
  ctr: 'counter',
  prt: 'particle',
  cop: 'copula',
  aux: 'auxiliary',
  'aux-v': 'auxiliary',
  'aux-adj': 'auxiliary',
  'adj-i': 'adjI',
  'adj-ix': 'adjI',
  'adj-na': 'adjNa',
};

/**
 * Devuelve la categoría, o `null` si el código no dice nada
 * útil -`unc` es «sin clasificar», y una etiqueta que dice eso es peor que
 * ninguna-.
 */
export function posCategory(pos: string | null): PosCategory | null {
  if (!pos) return null;
  const code = pos.trim();
  if (!code || code === 'unc') return null;
  if (EXACT[code]) return EXACT[code];
  // Las familias cubren de una los 30 y pico de códigos restantes: todas las
  // clases de verbo (v1, v5r, vs-i, vk, v2a-s...) y los adjetivos arcaicos
  // (adj-t, adj-nari, adj-ku...).
  if (/^v[0-9krsz]/.test(code)) return 'verb';
  if (code.startsWith('adj')) return 'adjective';
  return null;
}
