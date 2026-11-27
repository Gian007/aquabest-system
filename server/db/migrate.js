import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = [];
  for (const file of files) {
    const existing = db
      .prepare('SELECT version FROM schema_migrations WHERE version = ?')
      .get(file);
    if (existing) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .run(file, new Date().toISOString());
      db.exec('COMMIT');
      applied.push(file);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  return applied;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = openDatabase();
  const applied = runMigrations(db);
  console.log(applied.length ? `Applied migrations: ${applied.join(', ')}` : 'All migrations already applied.');
  db.close();
}
