/**
 * Lee el `error` del body de una respuesta no-OK. Si no vino como JSON, usa
 * `fallback`, que cada pantalla pasa ya traducido: el genérico
 * (`errors.generic`) o uno propio donde ése no calza.
 */
export async function errorFrom(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === 'string') return body.error;
  } catch {
    // el body no vino como JSON: se usa el mensaje de fallback
  }
  return fallback;
}
