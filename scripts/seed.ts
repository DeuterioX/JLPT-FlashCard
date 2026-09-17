import { db, migrate } from '../lib/db/client';
import { seedKana } from '../lib/db/seed';

migrate(db);
seedKana(db);
console.log('mazos de kana cargados');
