import { ZodError } from 'zod';
import { AppError } from '../services/errors';

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
    // `req.json()` tira SyntaxError con un body que ni siquiera es JSON
    // (a diferencia de un JSON válido pero con datos inválidos, que cae en
    // ZodError arriba). Sin este caso el cliente vería un 500 por mandar
    // basura en el body, cuando en realidad es un error suyo (400).
    if (e instanceof SyntaxError) {
      return Response.json({ error: 'El cuerpo de la solicitud no es JSON válido' }, { status: 400 });
    }
    // No se filtra el detalle al cliente, pero sí al log del servidor.
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

/** En el App Router los params son una promesa. */
export async function idFrom(ctx: { params: Promise<{ id: string }> }): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new AppError('Id inválido', 400);
  return n;
}
