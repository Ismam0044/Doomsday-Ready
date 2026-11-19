import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { pool } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

type ApiError = Error & { status?: number; code?: string };
function fail(message: string, status = 400, code?: string): never {
  const error: ApiError = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
}
function validText(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} is required.`);
  return value.trim();
}
function validInteger(value: unknown, label: string, min: number, max: number): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    fail(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return value as number;
}

async function moviePrerequisites() {
  const { rows } = await pool.query<{ movie_id: number; prerequisite_id: number }>(
    'SELECT movie_id, prerequisite_id FROM movie_prerequisites',
  );
  const graph = new Map<number, number[]>();
  for (const row of rows) graph.set(row.movie_id, [...(graph.get(row.movie_id) ?? []), row.prerequisite_id]);
  return graph;
}

function wouldCycle(graph: Map<number, number[]>, movieId: number, proposed: number[]) {
  const visiting = new Set<number>();
  const visited = new Set<number>();
  const reachesMovie = (id: number): boolean => {
    if (id === movieId) return true;
    if (visiting.has(id)) return false;
    if (visited.has(id)) return false;
    visiting.add(id);
    const result = (graph.get(id) ?? []).some(reachesMovie);
    visiting.delete(id);
    visited.add(id);
    return result;
  };
  return proposed.some(reachesMovie);
}

function parsePrerequisiteIds(value: unknown): number[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail('prerequisites must be an array of movie IDs.');
  const ids = value.map((id) => validInteger(id, 'Prerequisite ID', 1, Number.MAX_SAFE_INTEGER));
  if (new Set(ids).size !== ids.length) fail('Prerequisites cannot contain duplicates.');
  return ids;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/movies', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m.title, m.release_year AS "releaseYear", m.runtime,
        m.watched, COALESCE(array_agg(mp.prerequisite_id) FILTER (WHERE mp.prerequisite_id IS NOT NULL), '{}') AS prerequisites
      FROM movies m LEFT JOIN movie_prerequisites mp ON mp.movie_id = m.id
      GROUP BY m.id ORDER BY m.release_year, m.title
    `);
    res.json(rows);
  } catch (error) { next(error); }
});

app.post('/api/movies', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const title = validText(req.body.title, 'Title');
    const releaseYear = validInteger(req.body.releaseYear, 'Release year', 1888, 3000);
    const runtime = validInteger(req.body.runtime, 'Runtime', 1, 300);
    const watched = req.body.watched === undefined ? false : req.body.watched;
    if (typeof watched !== 'boolean') fail('Watched must be true or false.');
    const prerequisites = parsePrerequisiteIds(req.body.prerequisites);
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO movies (title, release_year, runtime, watched) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, releaseYear, runtime, watched],
    );
    const id = rows[0].id as number;
    if (prerequisites.length) {
      const existing = await client.query('SELECT id FROM movies WHERE id = ANY($1::int[])', [prerequisites]);
      if (existing.rows.length !== prerequisites.length) fail('One or more prerequisite movies do not exist.', 404);
      const graph = await moviePrerequisites();
      if (wouldCycle(graph, id, prerequisites)) fail('This change would create a circular movie dependency.', 409, 'CIRCULAR_DEPENDENCY');
      for (const prerequisiteId of prerequisites) await client.query(
        'INSERT INTO movie_prerequisites (movie_id, prerequisite_id) VALUES ($1, $2)', [id, prerequisiteId],
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id, title, releaseYear, runtime, watched, prerequisites });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally { client.release(); }
});

app.patch('/api/movies/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = validInteger(Number(req.params.id), 'Movie ID', 1, Number.MAX_SAFE_INTEGER);
    const current = await client.query('SELECT * FROM movies WHERE id = $1', [id]);
    if (!current.rows[0]) fail('Movie not found.', 404);
    const movie = current.rows[0];
    const title = req.body.title === undefined ? movie.title : validText(req.body.title, 'Title');
    const releaseYear = req.body.releaseYear === undefined ? movie.release_year : validInteger(req.body.releaseYear, 'Release year', 1888, 3000);
    const runtime = req.body.runtime === undefined ? movie.runtime : validInteger(req.body.runtime, 'Runtime', 1, 300);
    const watched = req.body.watched === undefined ? movie.watched : req.body.watched;
    if (typeof watched !== 'boolean') fail('Watched must be true or false.');
    const prerequisites = req.body.prerequisites === undefined ? undefined : parsePrerequisiteIds(req.body.prerequisites);
    await client.query('BEGIN');
    await client.query('UPDATE movies SET title=$1, release_year=$2, runtime=$3, watched=$4 WHERE id=$5',
      [title, releaseYear, runtime, watched, id]);
    if (prerequisites !== undefined) {
      if (prerequisites.includes(id)) fail('A movie cannot be its own prerequisite.', 409, 'CIRCULAR_DEPENDENCY');
      if (prerequisites.length) {
        const existing = await client.query('SELECT id FROM movies WHERE id = ANY($1::int[])', [prerequisites]);
        if (existing.rows.length !== prerequisites.length) fail('One or more prerequisite movies do not exist.', 404);
      }
      const graph = await moviePrerequisites();
      if (wouldCycle(graph, id, prerequisites)) fail('This change would create a circular movie dependency.', 409, 'CIRCULAR_DEPENDENCY');
      await client.query('DELETE FROM movie_prerequisites WHERE movie_id=$1', [id]);
      for (const prerequisiteId of prerequisites) await client.query(
        'INSERT INTO movie_prerequisites (movie_id, prerequisite_id) VALUES ($1, $2)', [id, prerequisiteId],
      );
    }
    await client.query('COMMIT');
    const result = await pool.query(`SELECT m.id, m.title, m.release_year AS "releaseYear", m.runtime, m.watched,
      COALESCE(array_agg(mp.prerequisite_id) FILTER (WHERE mp.prerequisite_id IS NOT NULL), '{}') AS prerequisites
      FROM movies m LEFT JOIN movie_prerequisites mp ON mp.movie_id=m.id WHERE m.id=$1 GROUP BY m.id`, [id]);
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally { client.release(); }
});

app.get('/api/movies/:id/rewatch-order', async (req, res, next) => {
  try {
    const targetId = validInteger(Number(req.params.id), 'Movie ID', 1, Number.MAX_SAFE_INTEGER);
    const found = await pool.query('SELECT id, title FROM movies WHERE id=$1', [targetId]);
    if (!found.rows[0]) fail('Movie not found.', 404);
    const { rows } = await pool.query(`SELECT m.id, m.title, m.release_year AS "releaseYear", m.runtime, m.watched,
      mp.prerequisite_id FROM movies m LEFT JOIN movie_prerequisites mp ON mp.movie_id=m.id`);
    const byId = new Map<number, Record<string, unknown> & { id: number }>();
    const prerequisites = new Map<number, number[]>();
    for (const row of rows) {
      byId.set(row.id, { id: row.id, title: row.title, releaseYear: row.releaseYear, runtime: row.runtime, watched: row.watched });
      if (row.prerequisite_id != null) prerequisites.set(row.id, [...(prerequisites.get(row.id) ?? []), Number(row.prerequisite_id)]);
    }
    const order: number[] = [];
    const visited = new Set<number>();
    const visit = (id: number) => {
      if (visited.has(id)) return;
      visited.add(id);
      for (const prerequisite of prerequisites.get(id) ?? []) visit(prerequisite);
      order.push(id);
    };
    for (const prerequisite of prerequisites.get(targetId) ?? []) visit(prerequisite);
    const movies = order.map((id) => byId.get(id)).filter((movie) => movie !== undefined);
    const watchedCount = movies.filter((movie) => movie.watched).length;
    const unwatchedRuntime = movies.filter((movie) => !movie.watched).reduce((sum, movie) => sum + Number(movie.runtime), 0);
    res.json({ target: found.rows[0], movies, watchedCount, totalCount: movies.length, unwatchedRuntime });
  } catch (error) { next(error); }
});

app.get('/api/cinemas', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT c.id, c.name,
      COALESCE(array_agg(bs.size ORDER BY bs.size) FILTER (WHERE bs.size IS NOT NULL), '{}') AS "bundleSizes"
      FROM cinemas c LEFT JOIN cinema_bundle_sizes bs ON bs.cinema_id=c.id GROUP BY c.id ORDER BY c.name`);
    res.json(rows);
  } catch (error) { next(error); }
});

app.post('/api/cinemas', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const name = validText(req.body.name, 'Cinema name');
    if (!Array.isArray(req.body.bundleSizes) || req.body.bundleSizes.length < 1 || req.body.bundleSizes.length > 10) {
      fail('A cinema needs between 1 and 10 bundle sizes.');
    }
    const sizes = req.body.bundleSizes.map((size: unknown) => validInteger(size, 'Bundle size', 1, 500));
    if (new Set(sizes).size !== sizes.length) fail('Bundle sizes must be unique.');
    await client.query('BEGIN');
    const { rows } = await client.query('INSERT INTO cinemas (name) VALUES ($1) RETURNING id', [name]);
    const id = rows[0].id as number;
    for (const size of sizes) await client.query('INSERT INTO cinema_bundle_sizes (cinema_id, size) VALUES ($1, $2)', [id, size]);
    await client.query('COMMIT');
    res.status(201).json({ id, name, bundleSizes: sizes });
  } catch (error) { await client.query('ROLLBACK'); next(error); }
  finally { client.release(); }
});

app.get('/api/cinemas/:id/booking', async (req, res, next) => {
  try {
    const id = validInteger(Number(req.params.id), 'Cinema ID', 1, Number.MAX_SAFE_INTEGER);
    const groupSize = validInteger(Number(req.query.groupSize), 'Group size', 1, 10_000);
    const cinemaResult = await pool.query('SELECT id, name FROM cinemas WHERE id=$1', [id]);
    if (!cinemaResult.rows[0]) fail('Cinema not found.', 404);
    const bundleResult = await pool.query('SELECT size FROM cinema_bundle_sizes WHERE cinema_id=$1 ORDER BY size DESC', [id]);
    const sizes = bundleResult.rows.map((row) => Number(row.size));
    const best = new Array<number>(groupSize + 1).fill(Number.POSITIVE_INFINITY);
    const previous = new Array<number>(groupSize + 1).fill(-1);
    best[0] = 0;
    for (let seats = 1; seats <= groupSize; seats++) {
      for (const size of sizes) {
        if (size <= seats && best[seats - size] + 1 < best[seats]) {
          best[seats] = best[seats - size] + 1;
          previous[seats] = size;
        }
      }
    }
    if (!Number.isFinite(best[groupSize])) {
      res.json({ possible: false, cinema: cinemaResult.rows[0], groupSize });
      return;
    }
    const bundles: Record<string, number> = {};
    for (let remaining = groupSize; remaining > 0;) {
      const size = previous[remaining];
      bundles[size] = (bundles[size] ?? 0) + 1;
      remaining -= size;
    }
    res.json({ possible: true, cinema: cinemaResult.rows[0], groupSize, bundleCount: best[groupSize], bundles });
  } catch (error) { next(error); }
});

app.use((error: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  if (error.code === '23505') {
    res.status(409).json({ error: 'That name is already in use.', code: 'DUPLICATE_NAME' });
    return;
  }
  res.status(error.status ?? 500).json({ error: error.message ?? 'Unexpected server error.', ...(error.code ? { code: error.code } : {}) });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
