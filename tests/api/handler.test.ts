import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { route, readJson, readOptionalJson } from '../../lib/api/handler';
import { AppError } from '../../lib/services/errors';

describe('route', () => {
  it('devuelve 200 con el JSON del service', async () => {
    const res = await route(() => ({ hola: 'mundo' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hola: 'mundo' });
  });

  it('acepta un status explícito para los 201', async () => {
    const res = await route(() => ({ id: 1 }), 201);
    expect(res.status).toBe(201);
  });

  it('traduce un AppError a su status con el mensaje', async () => {
    const res = await route(() => { throw new AppError('El mazo no existe', 404); });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'El mazo no existe' });
  });

  it('respeta el 403 de los mazos incluidos', async () => {
    const res = await route(() => { throw new AppError('no se puede borrar', 403); });
    expect(res.status).toBe(403);
  });

  it('convierte cualquier otro error en 500 sin filtrar el detalle', async () => {
    const res = await route(() => { throw new Error('connection reset at 0x7f'); });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Error interno');
    expect(JSON.stringify(body)).not.toContain('0x7f');
  });

  it('soporta services asincrónicos', async () => {
    const res = await route(async () => ({ ok: true }));
    expect(await res.json()).toEqual({ ok: true });
  });

  it('un SyntaxError genuino de un handler (no de parsear el body) sigue siendo un 500', async () => {
    // route() ya no atrapa SyntaxError como caso especial: ese atajo vivía
    // en el catch de toda la función y hubiera convertido en 400 (y sin
    // loguear) un bug interno real que por casualidad tira un SyntaxError,
    // por ejemplo un JSON.parse roto en medio de la lógica del service.
    const res = await route(() => { throw new SyntaxError('bug interno, no del body'); });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Error interno');
  });

  it('los mensajes de Zod que caen en route() salen en castellano', async () => {
    // Sin `.min()` propio: el mensaje que dispara es el de "tipo inválido"
    // por defecto de Zod, que tiene que quedar en castellano gracias al
    // locale configurado en lib/api/zod.ts (importado por handler.ts).
    const schema = z.object({ name: z.string() });
    const res = await route(() => schema.parse({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    const message = body.issues[0] as string;
    expect(message).not.toMatch(/Invalid input|expected/i);
    expect(message).toContain('inválid');
  });
});

describe('readJson', () => {
  it('devuelve el body parseado cuando es JSON válido', async () => {
    const req = new Request('http://localhost/api/decks', {
      method: 'POST',
      body: JSON.stringify({ name: 'Comidas' }),
    });
    await expect(readJson(req)).resolves.toEqual({ name: 'Comidas' });
  });

  it('convierte un body que no es JSON en un AppError 400', async () => {
    const req = new Request('http://localhost/api/decks', {
      method: 'POST',
      body: 'esto no es json',
    });
    await expect(readJson(req)).rejects.toMatchObject({
      status: 400,
      message: 'El cuerpo de la solicitud no es JSON válido',
    });
  });

  it('el 400 de readJson llega intacto a través de route()', async () => {
    const req = new Request('http://localhost/api/decks', {
      method: 'POST',
      body: 'esto no es json',
    });
    const res = await route(async () => readJson(req));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('El cuerpo de la solicitud no es JSON válido');
  });
});

describe('readOptionalJson', () => {
  it('sin body devuelve un objeto vacío', async () => {
    const req = new Request('http://localhost/api/sessions/review', { method: 'POST' });
    await expect(readOptionalJson(req)).resolves.toEqual({});
  });

  it('un body en blanco también devuelve un objeto vacío', async () => {
    const req = new Request('http://localhost/api/sessions/review', {
      method: 'POST',
      body: '   ',
    });
    await expect(readOptionalJson(req)).resolves.toEqual({});
  });

  it('un body JSON válido se parsea', async () => {
    const req = new Request('http://localhost/api/sessions/review', {
      method: 'POST',
      body: JSON.stringify({ limit: 5 }),
    });
    await expect(readOptionalJson(req)).resolves.toEqual({ limit: 5 });
  });

  it('un body mal formado se convierte en un AppError 400, no se traga en silencio', async () => {
    const req = new Request('http://localhost/api/sessions/review', {
      method: 'POST',
      body: 'esto no es json',
    });
    await expect(readOptionalJson(req)).rejects.toMatchObject({
      status: 400,
      message: 'El cuerpo de la solicitud no es JSON válido',
    });
  });
});
