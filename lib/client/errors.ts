/**
 * Mensajes y helper compartidos por todos los componentes cliente que hacen
 * `fetch` a la API: antes vivían duplicados byte a byte en `DeckList` y
 * `DeckEditor`, y `PracticeBoard` tenía su propia variante inline. Un solo
 * lugar para el texto en castellano.
 */

export const GENERIC_ERROR = 'No se pudo completar la acción. Probá de nuevo.';
export const NETWORK_ERROR = 'No hay conexión con el servidor. Probá de nuevo.';

/**
 * Lee el `error` del body de una respuesta no-OK; si no vino como JSON, usa
 * `fallback` (el genérico por defecto). `PracticeBoard` pasa su propio
 * mensaje ("no se pudo empezar la ronda") porque ahí el genérico no calza.
 */
export async function errorFrom(res: Response, fallback: string = GENERIC_ERROR): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // el body no vino como JSON: se usa el mensaje de fallback
  }
  return fallback;
}
