
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath =
  process.env.DATABASE_PATH ||
  join(dirname(__dirname), 'dreams.db');

let db = null;

export async function getDatabase() {
  if (!db) {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign key support
    await db.exec('PRAGMA foreign_keys = ON');

    console.log('SQLite database connected:', dbPath);
  }

  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;

    console.log('SQLite database connection closed');
  }
}

export default { getDatabase, closeDatabase };
