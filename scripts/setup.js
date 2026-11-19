import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { sampleMovies } from '../server/src/sample-data.js';

if (!process.env.DATABASE_URL) {
  throw new Error('Set DATABASE_URL in the root .env file before running setup.');
}

const databaseUrl = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(databaseUrl.hostname)) {
  databaseUrl.searchParams.set('sslmode', 'verify-full');
}

const pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 1 });
const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');

try {
  await pool.query(schema);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const movie of sampleMovies) {
      await client.query(
        'INSERT INTO movies (title, release_year, runtime) VALUES ($1, $2, $3) ON CONFLICT (title) DO NOTHING',
        [movie.title, movie.releaseYear, movie.runtime],
      );
    }

    const titles = sampleMovies.map((movie) => movie.title);
    const result = await client.query('SELECT id, title FROM movies WHERE title = ANY($1::text[])', [titles]);
    const idByTitle = new Map(result.rows.map((movie) => [movie.title, movie.id]));

    for (const movie of sampleMovies) {
      for (const prerequisiteTitle of movie.prerequisites) {
        await client.query(
          'INSERT INTO movie_prerequisites (movie_id, prerequisite_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [idByTitle.get(movie.title), idByTitle.get(prerequisiteTitle)],
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  console.log('Schema is ready and the eight sample movies are seeded.');
} finally {
  await pool.end();
}
