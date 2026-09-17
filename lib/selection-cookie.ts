export const SELECTION_COOKIE = 'grupos';

/** Tolerante a basura: una cookie corrupta no puede tirar abajo la home. */
export function parseSelection(raw: string | undefined): number[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].sort((a, b) => a - b);
}

export function serializeSelection(ids: number[]): string {
  return [...new Set(ids)].sort((a, b) => a - b).join(',');
}
