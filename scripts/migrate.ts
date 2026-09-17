import { db, migrate } from '../lib/db/client';
import { createDictFts } from '../lib/db/dict-fts';

migrate(db);
// Idempotente (`IF NOT EXISTS`): así `dict_fts` existe en toda base, se haya
// importado o no el diccionario, y `/api/dict/search` nunca falla con
// "no such table: dict_fts".
createDictFts(db);
console.log('migraciones aplicadas');
