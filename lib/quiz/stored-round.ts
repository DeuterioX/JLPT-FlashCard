import type { QuizCard } from './engine';

/**
 * La ronda que `PracticeBoard`/`StatsBoard` dejan en `sessionStorage` antes
 * de navegar a /quiz. Puro TypeScript, sin React ni `window`: todo lo
 * que decide qué hacer con una ronda guardada vive acá para poder testearlo.
 */
export type StoredRound = {
  sessionId: number; groupIds: number[]; cards: QuizCard[];
  mode: 'normal' | 'review' | 'meaning';
  /** Nombre del mazo, para el contexto de la barra superior del quiz
   * ("Hiragana · 6 grupos"). Ausente en un repaso (`mode: 'review'`): sus
   * grupos pueden venir de mazos distintos, no hay un único nombre que
   * mostrar. */
  deckName?: string;
};

/** Clave de la ronda guardada. */
export const ROUND_KEY = 'ronda';
/**
 * Clave del `sessionId` de la ronda guardada que ya se empezó a jugar en
 * esta pestaña. `sessionStorage['ronda']` nunca se borra (una recarga de
 * /quiz la necesita), así que sin esta marca un Back, una recarga o una
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
  const withMode = parsed as StoredRound & { mode?: unknown; deckName?: unknown };
  return {
    ...withMode,
    mode: withMode.mode === 'review' || withMode.mode === 'meaning'
      ? withMode.mode
      : 'normal',
    deckName: typeof withMode.deckName === 'string' ? withMode.deckName : undefined,
  };
}

export type RoundStart =
  /** Primera vez que se juega: se usa la sesión que ya abrió el server. */
  | { kind: 'reuse'; sessionId: number }
  /** Ronda normal ya jugada: se abre una sesión nueva para los mismos grupos. */
  | { kind: 'fresh'; groupIds: number[] }
  /** Repaso ya jugado: no se puede reabrir con las mismas cartas. */
  | { kind: 'redirect'; to: '/stats' };

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
  if (round.mode === 'review') return { kind: 'redirect', to: '/stats' };
  return { kind: 'fresh', groupIds: round.groupIds };
}

/**
 * La marca de «esta ronda ya se jugó», leída y escrita en un solo lugar.
 *
 * Las dos pantallas de ronda la usan, y hasta ahora cada una se la arreglaba
 * por su cuenta: el quiz envolvía los accesos en `try/catch` -en una ventana
 * privada `sessionStorage` tira- y el repaso de significados no, así que ahí
 * la pantalla entera se caía. Esa es la clase de diferencia que aparece sola
 * cuando dos pantallas resuelven lo mismo por copia.
 */
export function readUsedRound(): string | null {
  try {
    return sessionStorage.getItem(USED_ROUND_KEY);
  } catch {
    return null;
  }
}

/** Idempotente: el doble efecto de StrictMode escribe el mismo valor. */
export function markRoundUsed(sessionId: number) {
  try {
    sessionStorage.setItem(USED_ROUND_KEY, String(sessionId));
  } catch {
    // sin sessionStorage no hay replay posible que evitar
  }
}
