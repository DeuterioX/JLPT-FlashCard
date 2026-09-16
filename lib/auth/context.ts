/**
 * Seam para el login futuro. Hoy la app es de un solo usuario local.
 * Cuando entre el login, esta función lee la cookie de sesión y se agrega
 * `owner_id` a `deck` y `session`. Ninguna pantalla cambia de forma.
 */
export type AuthContext = { userId: number | null };

export function getAuthContext(): AuthContext {
  return { userId: null };
}
