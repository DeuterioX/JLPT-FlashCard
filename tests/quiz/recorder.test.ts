import { describe, it, expect, vi } from 'vitest';
import { createRoundRecorder, type FetchLike } from '../../lib/quiz/recorder';

/**
 * Doble de `fetch` con resolución manual para los POST de apertura y de
 * intentos: cada llamada queda en `calls` y no resuelve hasta que el test
 * invoque el `resolve`/`reject` correspondiente. Eso es lo que permite poner
 * a prueba el orden exacto en que las promesas asientan -justo lo que
 * rompía la implementación compartida en QuizRunner-.
 *
 * El PATCH de cierre se resuelve solo: a ningún test le importa CUÁNDO
 * responde el servidor al cierre, sino SI se mandó y a qué id, después de
 * qué otras cosas.
 */
function fakeFetch() {
  const calls: { url: string; init?: RequestInit; resolve: (r: Response) => void; reject: (e: unknown) => void }[] = [];
  const fetch: FetchLike = (url, init) => {
    if (init?.method === 'PATCH') {
      calls.push({ url, init, resolve: () => {}, reject: () => {} });
      return Promise.resolve(ok({}));
    }
    return new Promise<Response>((resolve, reject) => {
      calls.push({ url, init, resolve, reject });
    });
  };
  return { fetch, calls };
}

/** Deja drenar toda la cola de microtasks pendiente (varios `await` encadenados). */
const flush = () => new Promise<void>((r) => setImmediate(r));

function ok(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

function bad(): Response {
  return { ok: false, json: async () => ({}) } as unknown as Response;
}

function body(init?: RequestInit): Record<string, unknown> {
  return JSON.parse(String(init?.body));
}

const attempt = (cardId: number) =>
  ({ cardId, typed: 'ka', isCorrect: true, revealed: false, ms: 10 });

describe('createRoundRecorder', () => {
  it('con id conocido: manda cada intento ya mismo y cierra una sola vez, después de que asienten', async () => {
    const { fetch, calls } = fakeFetch();
    const rec = createRoundRecorder({ fetch, sessionId: 9 });

    rec.record(attempt(1));
    rec.record(attempt(2));

    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe('/api/attempts');
    expect(body(calls[0].init).sessionId).toBe(9);
    expect(body(calls[0].init).cardId).toBe(1);
    expect(body(calls[1].init).cardId).toBe(2);

    const finished = rec.finish();
    // Todavía no se mandó el PATCH: los dos intentos no asentaron.
    await flush();
    expect(calls).toHaveLength(2);

    calls[0].resolve(ok({}));
    calls[1].resolve(ok({}));
    await finished;

    expect(calls).toHaveLength(3);
    expect(calls[2].url).toBe('/api/sessions/9');
    expect(calls[2].init?.method).toBe('PATCH');
  });

  it('buffer mientras la sesión se abre: nada se manda hasta que resuelve, y en orden', async () => {
    const { fetch, calls } = fakeFetch();
    const rec = createRoundRecorder({ fetch, groupIds: [2] });

    rec.record(attempt(1));
    rec.record(attempt(2));

    // Solo el POST de apertura, nada de intentos todavía.
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/api/sessions');
    expect(rec.status()).toBe('pending');

    calls[0].resolve(ok({ sessionId: 42 }));
    await flush();

    expect(rec.status()).toBe('ready');
    expect(calls).toHaveLength(3);
    expect(body(calls[1].init).cardId).toBe(1);
    expect(body(calls[1].init).sessionId).toBe(42);
    expect(body(calls[2].init).cardId).toBe(2);
    expect(body(calls[2].init).sessionId).toBe(42);

    rec.record(attempt(3));
    expect(calls).toHaveLength(4);
    expect(body(calls[3].init).sessionId).toBe(42);
  });

  it('finish() mientras la sesión está pendiente: espera la apertura y después los intentos', async () => {
    const { fetch, calls } = fakeFetch();
    const rec = createRoundRecorder({ fetch, groupIds: [2] });
    rec.record(attempt(1));

    const finished = rec.finish();
    await flush();
    // Todavía no hay ni sesión ni PATCH.
    expect(calls).toHaveLength(1);

    calls[0].resolve(ok({ sessionId: 7 }));
    await flush();
    expect(calls).toHaveLength(2); // se mandó el intento en cola
    expect(body(calls[1].init).sessionId).toBe(7);
    // El PATCH todavía no salió: el intento recién mandado no asentó.
    expect(calls.some((c) => c.init?.method === 'PATCH')).toBe(false);

    calls[1].resolve(ok({}));
    await finished;
    expect(calls).toHaveLength(3);
    expect(calls[2].url).toBe('/api/sessions/7');
    expect(calls[2].init?.method).toBe('PATCH');
  });

  it('dos rondas superpuestas nunca cruzan sus intentos ni su cierre', async () => {
    const { fetch, calls } = fakeFetch();
    const a = createRoundRecorder({ fetch, groupIds: [2] }); // calls[0]: abrir A
    a.record(attempt(1));
    const aFinished = a.finish();

    const b = createRoundRecorder({ fetch, groupIds: [2] }); // calls[1]: abrir B
    b.record(attempt(2));

    // B resuelve PRIMERO.
    calls[1].resolve(ok({ sessionId: 200 }));
    await flush();
    expect(calls).toHaveLength(3); // abrir A, abrir B, intento de B
    expect(body(calls[2].init).sessionId).toBe(200);
    expect(body(calls[2].init).cardId).toBe(2);
    calls[2].resolve(ok({}));
    await flush();

    // Recién ahora resuelve A.
    calls[0].resolve(ok({ sessionId: 100 }));
    await flush();
    expect(calls).toHaveLength(4); // + intento de A
    expect(body(calls[3].init).sessionId).toBe(100);
    expect(body(calls[3].init).cardId).toBe(1);
    calls[3].resolve(ok({}));

    await aFinished;
    // Solo A se cerró (se le pidió finish()); B nunca lo pidió.
    const patches = calls.filter((c) => c.init?.method === 'PATCH');
    expect(patches).toHaveLength(1);
    expect(patches[0].url).toBe('/api/sessions/100');
  });

  it('si la apertura falla (red), no se manda ni se reintenta nada', async () => {
    const { fetch, calls } = fakeFetch();
    const onFailure = vi.fn();
    const rec = createRoundRecorder({ fetch, groupIds: [2], onFailure });

    rec.record(attempt(1));
    calls[0].reject(new Error('network down'));
    await flush();

    expect(rec.status()).toBe('failed');
    expect(onFailure).toHaveBeenCalledTimes(1);

    rec.record(attempt(2));
    expect(calls).toHaveLength(1); // nunca se mandó ningún intento

    await rec.finish();
    expect(calls).toHaveLength(1); // finish() no manda nada si falló
  });

  it('una respuesta no-OK también cuenta como falla', async () => {
    const { fetch, calls } = fakeFetch();
    const onFailure = vi.fn();
    const rec = createRoundRecorder({ fetch, groupIds: [2], onFailure });

    calls[0].resolve(bad());
    await flush();
    expect(rec.status()).toBe('failed');
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it('una respuesta ok sin sessionId numérico es una falla, no un id undefined', async () => {
    const { fetch, calls } = fakeFetch();
    const onFailure = vi.fn();
    const rec = createRoundRecorder({ fetch, groupIds: [2], onFailure });

    calls[0].resolve(ok({}));
    await flush();
    expect(rec.status()).toBe('failed');
    expect(onFailure).toHaveBeenCalledTimes(1);
  });

  it('finish() llamado dos veces manda un solo PATCH', async () => {
    const { fetch, calls } = fakeFetch();
    const rec = createRoundRecorder({ fetch, sessionId: 5 });

    const f1 = rec.finish();
    const f2 = rec.finish();
    expect(f1).toBe(f2);
    await Promise.all([f1, f2]);

    const patches = calls.filter((c) => c.init?.method === 'PATCH');
    expect(patches).toHaveLength(1);
  });

  it('si el POST de un intento rechaza, finish() igual cierra después de que asiente', async () => {
    const { fetch, calls } = fakeFetch();
    const rec = createRoundRecorder({ fetch, sessionId: 3 });
    rec.record(attempt(1));

    const finished = rec.finish();
    calls[0].reject(new Error('boom'));
    await finished;

    const patches = calls.filter((c) => c.init?.method === 'PATCH');
    expect(patches).toHaveLength(1);
    expect(patches[0].url).toBe('/api/sessions/3');
  });
});
