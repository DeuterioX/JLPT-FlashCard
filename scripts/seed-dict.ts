/**
 * Importa un build de scriptin/jmdict-simplified a la base local.
 *
 * Descargar de https://github.com/scriptin/jmdict-simplified/releases (usar
 * la API, `https://api.github.com/repos/scriptin/jmdict-simplified/releases/latest`,
 * para encontrar los assets de la versión vigente: llevan el número de
 * versión en el nombre y vienen como `.json.zip` / `.json.tgz`) los archivos:
 *   - `jmdict-spa-<version>.json` (español; no existe un build "-common" para
 *     este idioma, así que se usa el completo)
 *   - `jmdict-eng-common-<version>.json` (inglés, solo palabras comunes, para
 *     completar cuando el español no alcanza)
 * y descomprimirlos en `data/` (carpeta ignorada por git: ver .gitignore).
 *
 * Uso:
 *   npm run db:seed:dict -- data/jmdict-spa-3.6.2.json spa
 *   npm run db:seed:dict -- data/jmdict-eng-common-3.6.2.json eng
 */
import { readFileSync } from 'node:fs';
import { db, migrate } from '../lib/db/client';
import { createDictFts } from '../lib/db/dict-fts';
import { importJmdict, type JmdictFile } from '../lib/db/dict-import';

const [file, lang] = process.argv.slice(2);
if (!file || (lang !== 'spa' && lang !== 'eng')) {
  console.error('uso: tsx scripts/seed-dict.ts <archivo.json> <spa|eng>');
  process.exit(1);
}

migrate(db);
createDictFts(db);

const data = JSON.parse(readFileSync(file, 'utf8')) as JmdictFile;

const start = Date.now();
const { entries, glosses } = importJmdict(db, data, lang);
const ms = Date.now() - start;

console.log(`diccionario ${lang}: ${entries} entradas, ${glosses} glosas (${ms} ms)`);
