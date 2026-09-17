/**
 * Un `RoundRecorder` por ronda, con TODO su estado en el closure. Nada se
 * comparte entre rondas: es la corrección al bug de la Task 13 original,
 * donde `sessionIdRef`/`sessionStatus`/`pendingAttempts`/`closePending` eran
 * refs únicas en QuizRunner que una ronda N+1 podía pisarle a la ronda N si
 * la apertura de sesión de N tardaba más que N entera (incluidos los 6s de
 * auto-continuación). Acá cada ronda tiene su propia instancia y no hay
 * forma de que una pise el estado de la otra.
 *
 * Puro TypeScript, sin React: `fetch` se inyecta para poder testearlo con un
 * doble que resuelve a mano y así controlar el orden exacto en que las
 * promesas asientan.
 */

export type AttemptBody = {
  cardId: number; typed: string; isCorrect: boolean; revealed: boolean; ms: number;
};

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type RoundRecorder = {
  record(attempt: AttemptBody): void;
  finish(): Promise<void>;
  status(): 'pending' | 'ready' | 'failed';
};

function postJson(fetch: FetchLike, url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patch(fetch: FetchLike, url: string): Promise<Response> {
  return fetch(url, { method: 'PATCH' });
}

export function createRoundRecorder(opts: {
  fetch: FetchLike;
  /** Sesión ya abierta (la primera ronda, abierta por quien arma el `Round`). */
  sessionId?: number;
  /** Grupos para abrir una sesión nueva, cuando no se da `sessionId`. */
  groupIds?: number[];
  /** Se llama a lo sumo una vez, si la sesión nunca se pudo abrir. */
  onFailure?: () => void;
}): RoundRecorder {
  let status: 'pending' | 'ready' | 'failed' = 'ready';
  let sessionId = opts.sessionId;
  let buffer: AttemptBody[] = [];
  // Los POST de intentos son fire-and-forget hacia la UI (un error no se
  // propaga), pero `finish()` necesita saber cuándo TODOS asentaron -haya
  // ido bien o mal- antes de cerrar: si no, el PATCH puede llegar al server
  // antes que el último intento y el total se cierra sin contarlo.
  const inFlight = new Set<Promise<void>>();

  function sendAttempt(id: number, attempt: AttemptBody) {
    const p = postJson(opts.fetch, '/api/attempts', { sessionId: id, ...attempt })
      .then(() => {}, () => {});
    inFlight.add(p);
    void p.then(() => inFlight.delete(p));
  }

  let opened: Promise<void>;
  if (opts.sessionId !== undefined) {
    opened = Promise.resolve();
  } else {
    status = 'pending';
    opened = postJson(opts.fetch, '/api/sessions', { groupIds: opts.groupIds ?? [] })
      .then(async (res) => {
        if (!res.ok) throw new Error('no se pudo abrir la sesión');
        const json: unknown = await res.json();
        const id = (json as { sessionId?: unknown } | null)?.sessionId;
        if (typeof id !== 'number') throw new Error('la sesión no devolvió un id');
        sessionId = id;
        status = 'ready';
        const queued = buffer;
        buffer = [];
        for (const attempt of queued) sendAttempt(id, attempt);
      })
      .catch(() => {
        status = 'failed';
        buffer = [];
        opts.onFailure?.();
      });
  }

  let finishPromise: Promise<void> | null = null;

  return {
    record(attempt) {
      if (status === 'pending') {
        buffer.push(attempt);
        return;
      }
      // 'failed': no hay id válido y no hay que mandarlo a uno viejo -eso
      // ya lo cerró otro recorder-, así que se descarta.
      if (status === 'failed') return;
      sendAttempt(sessionId!, attempt);
    },
    finish() {
      if (finishPromise) return finishPromise;
      finishPromise = opened.then(async () => {
        if (status === 'failed') return;
        // Esperar los intentos en vuelo (incluidos los que la apertura
        // acaba de destrabar) ANTES del PATCH: si no, el cierre puede
        // ganarle la carrera al último intento y el total queda corto.
        await Promise.allSettled([...inFlight]);
        await patch(opts.fetch, `/api/sessions/${sessionId}`).then(() => {}, () => {});
      });
      return finishPromise;
    },
    status() {
      return status;
    },
  };
}
