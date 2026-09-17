import type { StatsRange } from '../services/stats';

/**
 * Parseo de query params compartido por las rutas de la API y las páginas
 * de servidor. Antes cada ruta tenía su propia copia de `parseLimit` y del
 * rango de estadísticas.
 */

/** `7d`, `30d` o `all`; cualquier otra cosa (o nada) cae a los 30 días. */
export function parseRange(raw: string | null | undefined): StatsRange {
  return raw === '7d' || raw === 'all' ? raw : '30d';
}

/**
 * Un límite ausente, no numérico o menor que 1 (incluido un fraccionario
 * entre 0 y 1, que redondeado daría 0) cae al default; siempre se topa al
 * máximo.
 */
export function parseLimit(raw: string | null | undefined, fallback: number, max = 100): number {
  const n = Number(raw);
  if (raw == null || !Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}
