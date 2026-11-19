import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Add it to the root .env file.');
}

const databaseUrl = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(databaseUrl.hostname)) {
  databaseUrl.searchParams.set('sslmode', 'verify-full');
}

export const pool = new pg.Pool({ connectionString: databaseUrl.toString() });
