import pg from 'pg';
import dotenv from 'dotenv';
import { resolve } from 'node:path';

const { Pool } = pg;

const projectRoot = /[\\/]server$/.test(process.cwd()) ? resolve(process.cwd(), '..') : process.cwd();
dotenv.config({ path: [resolve(projectRoot, '.env.local'), resolve(projectRoot, '.env')] });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Run `neon env pull` or set it in the project .env.local file.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? undefined : { rejectUnauthorized: false },
  max: 5,
});
