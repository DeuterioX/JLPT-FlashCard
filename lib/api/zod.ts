import { z } from 'zod';

// Configura los mensajes por defecto de Zod (los de "tipo inválido", los que
// disparan cuando falta un campo entero) en castellano. Los mensajes
// específicos que ya pasamos con `.min(1, '...')` en lib/api/schemas.ts
// siguen ganando: esto solo cambia el fallback que usa Zod cuando no le
// dimos uno propio. Se importa una sola vez desde lib/api/handler.ts para
// que cualquier ruta que pase por `route()` quede cubierta sin tener que
// acordarse de configurarlo en cada schema nuevo (tareas 11, 12, 15 y 16).
z.config(z.locales.es());
