# Evaluación: JWT para autenticación en Kitsune Cards

## Resumen ejecutivo

El skill auth-implementation-patterns aporta reglas útiles: tokens de acceso cortos, cookies HttpOnly/Secure/SameSite, validación del lado del servidor, secretos fuertes y límite de intentos. Su ejemplo de JWT usa Express y bearer tokens; no conviene copiar ese middleware tal cual en esta app Next.js.

La app todavía no tiene autenticación implementada. El seam lib/auth/context.ts siempre devuelve userId: null. El esquema no contiene propietarios ni sesiones de login, y las rutas API y los services operan sin identidad. En cambio, docs/owner-and-login.md ya define una migración concreta basada en una cookie opaca, cuyo hash se guarda en SQLite, y en una entidad owner que nace anónima y después puede recibir email y contraseña.

**Recomendación:** para la app web de mismo origen, seguir el diseño de cookie opaca de owner-and-login.md y no agregar JWT sin una necesidad concreta de clientes externos o validación distribuida sin consultar la base. Esa cookie persistida es revocable por navegador, encaja con el alta anónima y permite cerrar sesiones en todos los dispositivos. JWT más refresh tokens persistidos sumaría piezas sin eliminar la necesidad de guardar estado.

Si JWT es un requisito, usar JWT sólo como token de acceso de vida corta y mantener un refresh token opaco, rotatorio y revocable en SQLite. No usar un JWT de larga duración como única cookie.

## Estado actual del proyecto

- Next.js 16.3.5 con App Router, Route Handlers y Server Components; Drizzle sobre SQLite con better-sqlite3.
- Hay 13 Route Handlers y varias páginas Server Component que llaman directamente a los services.
- lib/auth/context.ts es el único archivo de auth y es un stub.
- lib/db/schema.ts no contiene owner, credenciales, refresh tokens ni owner_id.
- package.json no tiene una biblioteca JWT ni una biblioteca de sesiones.
- docs/owner-and-login.md ya especifica owners anónimos, tokens por dispositivo, asociación de datos y registro posterior. También propone usar scrypt para contraseñas para evitar otra dependencia nativa.
- La tabla session actual guarda rondas del quiz; no debe reutilizarse para sesiones de autenticación.

## Diseño recomendado: mantener la cookie opaca

1. Implementar el primer paso descrito en owner-and-login.md: owner, owner_token y owner_id en deck, session y attempt; migración con backfill del dueño actual e índices.
2. Emitir un valor aleatorio de alta entropía en una cookie HttpOnly, SameSite=Lax y Secure en producción. Guardar en owner_token sólo su hash SHA-256 y los metadatos de expiración/último uso. La cookie no contiene datos que el servidor tenga que confiar.
3. Resolver el owner desde la cookie en una función server-only de lib/auth. Reemplazar el stub de lib/auth/context.ts y pasar ownerId a los services.
4. Aislar cada consulta y mutación por ownerId. Los mazos incluidos siguen siendo globales; los mazos propios y las rondas/intentos quedan asociados al owner. Verificar también que el grupo, mazo o ronda solicitado pertenezca al owner autenticado.
5. Implementar después alta, login y logout: email único, password_hash con scrypt, una fila de owner_token por navegador y revocación de una o de todas las filas.
6. Aplicar límite de intentos al login y mensajes que no revelen si un email existe. Revisar origen/CSRF para operaciones que cambian datos y registrar fallos de autenticación sin guardar contraseñas ni tokens.

Este diseño ya resuelve la necesidad de sesiones de navegador y revocación. La contraseña sirve para emitir una nueva cookie en otro dispositivo; no hace falta convertirla en JWT.

## Si JWT es obligatorio

### Flujo de credenciales

- Access token: JWT firmado, expira en unos 15 minutos y viaja en una cookie HttpOnly.
- Refresh token: cadena aleatoria opaca, no JWT; dura, por ejemplo, 30 días, viaja en otra cookie HttpOnly y sólo se guarda hasheado en la tabla de tokens.
- Renovación: cada uso valida el hash, expiración y estado del refresh token; lo rota dentro de una transacción y emite un access JWT nuevo. El refresh anterior queda revocado.
- Logout: revoca el refresh de este navegador y borra ambas cookies. “Cerrar en todos los dispositivos” revoca todos los refresh tokens del owner.
- Registro desde uso anónimo: completa email y password_hash del owner ya existente, preservando sus datos. Login desde otro dispositivo emite un refresh token nuevo para ese mismo owner.
- Primer acceso anónimo: como el JWT necesita un ownerId y un Server Component no puede escribir cookies durante el render, hace falta un Route Handler de inicialización que cree el owner y emita las cookies. Puede redirigir de vuelta a la ruta original, validando que el destino sea interno. No conviene crear el JWT en un Server Component ni depender de proxy para tocar SQLite.

### Cambios concretos

| Área | Cambio requerido |
|---|---|
| Base y migraciones | Crear owner; agregar email y password_hash; agregar owner_id a deck, session y attempt; crear owner_token para refresh tokens con token_hash, owner_id, created_at, expires_at, last_seen_at y revoked_at; agregar índices y backfill. |
| lib/auth | Reemplazar context.ts por funciones server-only para obtener el owner, firmar/verificar JWT, crear/rotar/revocar refresh tokens y configurar cookies. Mantener claims mínimos: sub, iss, aud, iat, exp y jti; fijar el algoritmo aceptado y validar issuer/audience/expiración al verificar. |
| Dependencia y secretos | Evaluar jose, que Next menciona como biblioteca compatible; hoy no está instalada. Guardar una clave aleatoria fuerte fuera del repositorio y configurar su rotación. Nunca incluir secretos en el bundle del cliente. |
| Rutas | Añadir handlers de inicialización anónima, registro, login, refresh y logout. Proteger todos los handlers de datos, incluidos los GET, además de las mutaciones. Las rutas públicas de diccionario deben quedar explícitamente identificadas. |
| Services y páginas | Cambiar las funciones de service para recibir ownerId; actualizar las consultas que tocan deck, session o attempt; pasar la identidad desde cada Route Handler y desde las páginas que llaman services directamente. |
| Cookies y CSRF | Escribir o borrar cookies sólo desde Route Handlers o Server Functions. Usar HttpOnly, SameSite=Lax, Path=/ y Secure bajo HTTPS. En operaciones mutables validar Origin/Host y mantener protección CSRF acorde al flujo. No guardar JWT en localStorage. |
| Contraseñas y abuso | Usar scrypt como ya propone el documento; validar entradas; limitar intentos de login y refresh; devolver errores genéricos ante credenciales incorrectas. |
| Verificación | Agregar pruebas de aislamiento entre dos owners, acceso cruzado a grupos/rondas, expiración y rechazo de JWT inválido, rotación/reuso de refresh token, logout individual y global, registro que conserva datos anónimos y rate limit. |

## Orden de implementación sugerido

1. Completar primero esquema, migración y backfill de owners.
2. Implementar resolución de identidad y filtros de autorización en services y rutas; revisar especialmente apertura de rondas, registro de intentos y estadísticas.
3. Cubrir aislamiento de datos antes de habilitar cuentas.
4. Implementar el flujo de registro/login/logout con cookie opaca, o con access JWT + refresh opaco si JWT quedó confirmado como requisito.
5. Antes de migrar una base con datos reales, hacer un backup consistente de SQLite y comprobar el procedimiento de restauración.

La parte grande del trabajo no es firmar el JWT: es introducir ownerId de punta a punta y evitar que una ruta consulte o modifique datos de otra persona. El login se monta sobre esa frontera.

## Referencias revisadas

- Skill local: .agents/skills/auth-implementation-patterns/SKILL.md y references/details.md.
- Diseño existente: docs/owner-and-login.md.
- Next.js 16 local: node_modules/next/dist/docs/01-app/02-guides/authentication.md y 01-app/03-api-reference/04-functions/cookies.md. La API cookies es asíncrona; permite leer desde Server Components, pero cambiar cookies requiere un Route Handler o Server Function.

