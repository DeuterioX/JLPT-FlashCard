import type { QuizCard } from './engine';

/**
 * La ronda que `PracticeBoard`/`StatsBoard` dejan en `sessionStorage` antes
 * de navegar a /practicar. Puro TypeScript, sin React ni `window`: todo lo
 * que decide qué hacer con una ronda guardada vive acá para poder testearlo.
 */
export type StoredRound = {
  sessionId: number; groupIds: number[]; cards: QuizCard[]; mode: 'normal' | 'review';
};

/** Clave de la ronda guardada. */
export const ROUND_KEY = 'ronda';
/**
 * Clave del `sessionId` de la ronda guardada que ya se empezó a jugar en
 * esta pestaña. `sessionStorage['ronda']` nunca se borra (una recarga de
 * /practicar la necesita), así que sin esta marca un Back, una recarga o una
 * pestaña restaurada volvían a jugar la misma ronda escribiendo sobre una
 * sesión que ya se había cerrado.
 */
export const USED_ROUND_KEY = 'ronda-usada';

export function parseStoredRound(raw: string): StoredRound | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !parsed || typeof parsed !== 'object'
    || typeof (parsed as StoredRound).sessionId !== 'number'
    || !Array.isArray((parsed as StoredRound).cards)
    || !Array.isArray((parsed as StoredRound).groupIds)
    || !(parsed as StoredRound).groupIds.every((g) => typeof g === 'number')
  ) {
    return null;
  }
  // `mode` es nuevo (Task 15, sección B): un `sessionStorage` viejo de antes
  // de ese cambio no lo trae, así que su ausencia se toma como 'normal' en
  // vez de invalidar la ronda entera.
  const withMode = parsed as StoredRound & { mode?: unknown };
  return { ...withMode, mode: withMode.mode === 'review' ? 'review' : 'normal' };
}

export type RoundStart =
  /** Primera vez que se juega: se usa la sesión que ya abrió el server. */
  | { kind: 'reuse'; sessionId: number }
  /** Ronda normal ya jugada: se abre una sesión nueva para los mismos grupos. */
  | { kind: 'fresh'; groupIds: number[] }
  /** Repaso ya jugado: no se puede reabrir con las mismas cartas. */
  | { kind: 'redirect'; to: '/estadisticas' };

/**
 * Decide cómo arranca una ronda guardada según la marca de "ya usada".
 * `usedSessionId` es el valor crudo de `sessionStorage[USED_ROUND_KEY]`
 * (null si no hay marca).
 */
export function decideRoundStart(
  round: Pick<StoredRound, 'sessionId' | 'groupIds' | 'mode'>,
  usedSessionId: string | null,
): RoundStart {
  if (usedSessionId !== String(round.sessionId)) {
    return { kind: 'reuse', sessionId: round.sessionId };
  }
  if (round.mode === 'review') return { kind: 'redirect', to: '/estadisticas' };
  return { kind: 'fresh', groupIds: round.groupIds };
}
