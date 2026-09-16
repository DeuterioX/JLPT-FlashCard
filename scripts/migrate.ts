import { db, migrate } from '../lib/db/client';
migrate(db);
console.log('migraciones aplicadas');
