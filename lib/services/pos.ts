/**
 * Los códigos de categoría gramatical de JMdict, en castellano.
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
const EXACT: Record<string, string> = {
  n: 'sustantivo',
  'n-suf': 'sufijo',
  'n-pref': 'prefijo',
  exp: 'expresión',
  adv: 'adverbio',
  'adv-to': 'adverbio',
  int: 'interjección',
  pn: 'pronombre',
  conj: 'conjunción',
  pref: 'prefijo',
  suf: 'sufijo',
  num: 'numeral',
  ctr: 'contador',
  prt: 'partícula',
  cop: 'cópula',
  aux: 'auxiliar',
  'aux-v': 'auxiliar',
  'aux-adj': 'auxiliar',
  'adj-i': 'adjetivo -i',
  'adj-ix': 'adjetivo -i',
  'adj-na': 'adjetivo -na',
};

/**
 * Devuelve la etiqueta en castellano, o `null` si el código no dice nada
 * útil -`unc` es «sin clasificar», y una etiqueta que dice eso es peor que
 * ninguna-.
 */
export function posInSpanish(pos: string | null): string | null {
  if (!pos) return null;
  const code = pos.trim();
  if (!code || code === 'unc') return null;
  if (EXACT[code]) return EXACT[code];
  // Las familias cubren de una los 30 y pico de códigos restantes: todas las
  // clases de verbo (v1, v5r, vs-i, vk, v2a-s...) y los adjetivos arcaicos
  // (adj-t, adj-nari, adj-ku...).
  if (/^v[0-9krsz]/.test(code)) return 'verbo';
  if (code.startsWith('adj')) return 'adjetivo';
  return null;
}
