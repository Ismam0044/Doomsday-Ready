import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

const projectRoot = /[\\/]server$/.test(process.cwd()) ? resolve(process.cwd(), '..') : process.cwd();
dotenv.config({ path: [resolve(projectRoot, '.env.local'), resolve(projectRoot, '.env')] });

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) {
  throw new Error('DATABASE_URL_UNPOOLED is required for schema migrations. Run `neon env pull` first.');
}
if (connectionString.includes('-pooler')) {
  throw new Error('Migrations require the direct DATABASE_URL_UNPOOLED connection, not the pooled endpoint.');
}

const directUrl = new URL(connectionString);
if (!['localhost', '127.0.0.1'].includes(directUrl.hostname)) {
  directUrl.searchParams.set('sslmode', 'verify-full');
}

const pool = new pg.Pool({
  connectionString: directUrl.toString(),
  max: 1,
});

const migration = '001_initial_schema.sql';
const sql = await readFile(new URL('../migrations/001_initial_schema.sql', import.meta.url), 'utf8');
const client = await pool.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS app_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const existing = await client.query('SELECT name FROM app_migrations WHERE name = $1', [migration]);
  if (existing.rowCount === 0) {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO app_migrations (name) VALUES ($1)', [migration]);
    await client.query('COMMIT');
    console.log(`Applied ${migration}`);
  } else {
    console.log(`${migration} is already applied`);
  }
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
