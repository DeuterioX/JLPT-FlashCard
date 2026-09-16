import { describe, it, expect } from 'vitest';
import { route } from '../../lib/api/handler';
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

  it('convierte un body con JSON malformado en 400, no en 500', async () => {
    const req = new Request('http://localhost/api/decks', {
      method: 'POST',
      body: 'esto no es json',
    });
    const res = await route(async () => req.json());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTypeOf('string');
  });
});
