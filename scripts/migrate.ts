import { db, migrate } from '../lib/db/client';

// `migrate` también crea la tabla FTS5 del diccionario (ver lib/db/client.ts).
migrate(db);
console.log('migraciones aplicadas');
