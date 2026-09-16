/**
 * Deja una respuesta en forma canónica para poder compararla. Se aplica a los
 * dos lados: a lo que escribe el usuario y a lo guardado en card_answer.
 */
export function normalizeAnswer(raw: string): string {
  return raw.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Una respuesta es correcta si coincide con CUALQUIERA de las romanizaciones
 * aceptadas. `is_primary` no participa: solo decide qué se muestra al revelar.
 */
export function matchesAnswer(typed: string, accepted: string[]): boolean {
  const n = normalizeAnswer(typed);
  if (n.length === 0) return false;
  return accepted.some((a) => normalizeAnswer(a) === n);
}
