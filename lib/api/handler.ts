import { ZodError } from 'zod';
import { AppError } from '../services/errors';
// Efecto de lado: configura los mensajes por defecto de Zod en castellano.
// Tiene que importarse antes de que cualquier schema haga `.parse(...)`.
import './zod';

/** Params de una ruta dinámica `[id]`. En el App Router es una promesa. */
export type RouteCtx = { params: Promise<{ id: string }> };

export function ok<T>(data: T, status = 200): Response {
  return Response.json(data as object, { status });
}

/**
 * Envuelve la lógica de una ruta y traduce errores a HTTP.
 * Equivale a un filtro de excepciones: evita repetir try/catch en cada handler.
 */
export async function route<T>(fn: () => T | Promise<T>, status = 200): Promise<Response> {
  try {
    return ok(await fn(), status);
  } catch (e) {
    if (e instanceof AppError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    if (e instanceof ZodError) {
      return Response.json(
        { error: 'Datos inválidos', issues: e.issues.map((i) => i.message) },
        { status: 400 },
      );
    }
    // No se filtra el detalle al cliente, pero sí al log del servidor.
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

/** En el App Router los params son una promesa. */
export async function idFrom(ctx: RouteCtx): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new AppError('Id inválido', 400);
  return n;
}

/**
 * Parsea el body como JSON y traduce un body que ni siquiera es JSON válido
 * a un AppError 400. A diferencia del `SyntaxError` que tiraría `req.json()`
 * directo, este error sí es del cliente (mandó basura en el body), así que
 * no debe tratarse como los bugs internos que caen al 500 genérico de
 * `route()`. Cualquier otro `SyntaxError` que se produzca dentro de un
 * handler (uno real, de un bug interno) sigue cayendo en el 500 y quedando
 * logueado, porque acá solo se atrapa el que sale de este `req.json()`.
 */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError('El cuerpo de la solicitud no es JSON válido', 400);
  }
}
