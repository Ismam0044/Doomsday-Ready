import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { buildRewatchPlan, hasCircularDependency, quoteBundles } from './logic.js';

const app = express();
app.use(express.json());

function apiError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

function integer(value, label, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw apiError(400, `${label} must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

function requiredText(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw apiError(400, `${label} is required.`);
  }
  return value.trim();
}

function prerequisiteIds(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw apiError(400, 'Prerequisites must be an array of movie IDs.');
  if (value.some((id) => !Number.isInteger(Number(id)) || Number(id) < 1)) {
    throw apiError(400, 'Prerequisite IDs must be positive whole numbers.');
  }

  const ids = value.map(Number);
  if (new Set(ids).size !== ids.length) {
    throw apiError(400, 'Prerequisites cannot contain duplicates.');
  }
  return ids;
}

function watchedValue(value, currentValue = false) {
  if (value === undefined) return currentValue;
  if (typeof value !== 'boolean') throw apiError(400, 'Watched must be true or false.');
  return value;
}

async function readPrerequisiteMap(client = pool) {
  const result = await client.query('SELECT movie_id, prerequisite_id FROM movie_prerequisites');
  const map = new Map();
  for (const row of result.rows) {
    const list = map.get(row.movie_id) ?? [];
    list.push(row.prerequisite_id);
    map.set(row.movie_id, list);
  }
  return map;
}

async function ensurePrerequisitesExist(client, ids) {
  if (ids.length === 0) return;
  const result = await client.query('SELECT id FROM movies WHERE id = ANY($1::int[])', [ids]);
  if (result.rowCount !== ids.length) throw apiError(404, 'One or more prerequisite movies do not exist.');
}

async function sendError(error, response) {
  if (error.code === '23505') {
    response.status(409).json({ error: 'That title or cinema name is already in use.' });
    return;
  }
  response.status(error.status ?? 500).json({
    error: error.message ?? 'Unexpected server error.',
    ...(error.code ? { code: error.code } : {}),
  });
}

function asyncRoute(handler) {
  return (request, response) => {
    handler(request, response).catch((error) => sendError(error, response));
  };
}

app.get('/api/movies', asyncRoute(async (_request, response) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.title, m.release_year AS "releaseYear", m.runtime, m.watched,
             p.prerequisite_id AS "prerequisiteId"
      FROM movies m
      LEFT JOIN movie_prerequisites p ON p.movie_id = m.id
      ORDER BY m.release_year, m.title, p.prerequisite_id
    `);
    const moviesById = new Map();
    for (const row of result.rows) {
      let movie = moviesById.get(row.id);
      if (!movie) {
        movie = {
          id: row.id,
          title: row.title,
          releaseYear: row.releaseYear,
          runtime: row.runtime,
          watched: row.watched,
          prerequisites: [],
        };
        moviesById.set(row.id, movie);
      }
      if (row.prerequisiteId !== null) movie.prerequisites.push(row.prerequisiteId);
    }
    response.json([...moviesById.values()]);
  } catch (error) {
    await sendError(error, response);
  }
}));

app.post('/api/movies', asyncRoute(async (request, response) => {
  const client = await pool.connect();
  try {
    const title = requiredText(request.body.title, 'Title');
    const releaseYear = integer(request.body.releaseYear, 'Release year', Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    const runtime = integer(request.body.runtime, 'Runtime', 1, 300);
    const watched = watchedValue(request.body.watched);
    const prerequisites = prerequisiteIds(request.body.prerequisites);

    await client.query('BEGIN');
    await ensurePrerequisitesExist(client, prerequisites);
    const inserted = await client.query(
      'INSERT INTO movies (title, release_year, runtime, watched) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, releaseYear, runtime, watched],
    );
    const id = inserted.rows[0].id;
    const graph = await readPrerequisiteMap(client);
    if (hasCircularDependency(id, prerequisites, graph)) {
      throw apiError(409, 'This change would create a circular dependency.', 'CIRCULAR_DEPENDENCY');
    }
    for (const prerequisiteId of prerequisites) {
      await client.query(
        'INSERT INTO movie_prerequisites (movie_id, prerequisite_id) VALUES ($1, $2)',
        [id, prerequisiteId],
      );
    }
    await client.query('COMMIT');
    response.status(201).json({ id, title, releaseYear, runtime, watched, prerequisites });
  } catch (error) {
    await client.query('ROLLBACK');
    await sendError(error, response);
  } finally {
    client.release();
  }
}));

app.patch('/api/movies/:id', asyncRoute(async (request, response) => {
  const client = await pool.connect();
  try {
    const id = integer(request.params.id, 'Movie ID', 1, Number.MAX_SAFE_INTEGER);
    const found = await client.query('SELECT * FROM movies WHERE id = $1', [id]);
    if (found.rowCount === 0) throw apiError(404, 'Movie not found.');

    const movie = found.rows[0];
    const title = request.body.title === undefined ? movie.title : requiredText(request.body.title, 'Title');
    const releaseYear = request.body.releaseYear === undefined
      ? movie.release_year
      : integer(request.body.releaseYear, 'Release year', Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    const runtime = request.body.runtime === undefined ? movie.runtime : integer(request.body.runtime, 'Runtime', 1, 300);
    const watched = watchedValue(request.body.watched, movie.watched);
    const prerequisites = request.body.prerequisites === undefined
      ? undefined
      : prerequisiteIds(request.body.prerequisites);

    await client.query('BEGIN');
    await client.query(
      'UPDATE movies SET title = $1, release_year = $2, runtime = $3, watched = $4 WHERE id = $5',
      [title, releaseYear, runtime, watched, id],
    );

    if (prerequisites !== undefined) {
      await ensurePrerequisitesExist(client, prerequisites);
      const graph = await readPrerequisiteMap(client);
      if (hasCircularDependency(id, prerequisites, graph)) {
        throw apiError(409, 'This change would create a circular dependency.', 'CIRCULAR_DEPENDENCY');
      }
      await client.query('DELETE FROM movie_prerequisites WHERE movie_id = $1', [id]);
      for (const prerequisiteId of prerequisites) {
        await client.query(
          'INSERT INTO movie_prerequisites (movie_id, prerequisite_id) VALUES ($1, $2)',
          [id, prerequisiteId],
        );
      }
    }

    await client.query('COMMIT');
    const updated = await pool.query(`
      SELECT id, title, release_year AS "releaseYear", runtime, watched
      FROM movies WHERE id = $1
    `, [id]);
    const edgeRows = await pool.query(
      'SELECT prerequisite_id FROM movie_prerequisites WHERE movie_id = $1', [id],
    );
    response.json({ ...updated.rows[0], prerequisites: edgeRows.rows.map((row) => row.prerequisite_id) });
  } catch (error) {
    await client.query('ROLLBACK');
    await sendError(error, response);
  } finally {
    client.release();
  }
}));

app.get('/api/movies/:id/rewatch-order', asyncRoute(async (request, response) => {
  try {
    const targetId = integer(request.params.id, 'Movie ID', 1, Number.MAX_SAFE_INTEGER);
    const result = await pool.query(`
      SELECT m.id, m.title, m.release_year AS "releaseYear", m.runtime, m.watched,
             p.movie_id AS "movieId", p.prerequisite_id AS "prerequisiteId"
      FROM movies m
      LEFT JOIN movie_prerequisites p ON p.movie_id = m.id
      ORDER BY m.id, p.prerequisite_id
    `);
    const moviesById = new Map();
    const prerequisites = [];
    for (const row of result.rows) {
      let movie = moviesById.get(row.id);
      if (!movie) {
        movie = { id: row.id, title: row.title, releaseYear: row.releaseYear, runtime: row.runtime, watched: row.watched };
        moviesById.set(row.id, movie);
      }
      if (row.prerequisiteId !== null) {
        prerequisites.push({ movie_id: row.movieId, prerequisite_id: row.prerequisiteId });
      }
    }
    const target = moviesById.get(targetId);
    if (!target) throw apiError(404, 'Movie not found.');
    const plan = buildRewatchPlan(targetId, [...moviesById.values()], prerequisites);
    response.json({ target, ...plan });
  } catch (error) {
    await sendError(error, response);
  }
}));

app.get('/api/cinemas', asyncRoute(async (_request, response) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.name, b.size
      FROM cinemas c
      LEFT JOIN cinema_bundle_sizes b ON b.cinema_id = c.id
      ORDER BY c.name, b.size
    `);
    const cinemasById = new Map();
    for (const row of result.rows) {
      let cinema = cinemasById.get(row.id);
      if (!cinema) {
        cinema = { id: row.id, name: row.name, bundleSizes: [] };
        cinemasById.set(row.id, cinema);
      }
      if (row.size !== null) cinema.bundleSizes.push(row.size);
    }
    response.json([...cinemasById.values()]);
  } catch (error) {
    await sendError(error, response);
  }
}));

app.post('/api/cinemas', asyncRoute(async (request, response) => {
  const client = await pool.connect();
  try {
    const name = requiredText(request.body.name, 'Cinema name');
    const sizes = request.body.bundleSizes;
    if (!Array.isArray(sizes) || sizes.length < 1 || sizes.length > 10) {
      throw apiError(400, 'A cinema needs between 1 and 10 bundle sizes.');
    }
    if (sizes.some((size) => !Number.isInteger(Number(size)) || Number(size) < 1 || Number(size) > 500)) {
      throw apiError(400, 'Each bundle size must be a whole number from 1 to 500.');
    }
    const bundleSizes = sizes.map(Number);
    if (new Set(bundleSizes).size !== bundleSizes.length) {
      throw apiError(400, 'Bundle sizes must be different.');
    }

    await client.query('BEGIN');
    const inserted = await client.query(
      'INSERT INTO cinemas (name) VALUES ($1) RETURNING id', [name],
    );
    const id = inserted.rows[0].id;
    for (const size of bundleSizes) {
      await client.query(
        'INSERT INTO cinema_bundle_sizes (cinema_id, size) VALUES ($1, $2)',
        [id, size],
      );
    }
    await client.query('COMMIT');
    response.status(201).json({ id, name, bundleSizes });
  } catch (error) {
    await client.query('ROLLBACK');
    await sendError(error, response);
  } finally {
    client.release();
  }
}));

app.get('/api/cinemas/:id/booking', asyncRoute(async (request, response) => {
  try {
    const id = integer(request.params.id, 'Cinema ID', 1, Number.MAX_SAFE_INTEGER);
    const groupSize = integer(request.query.groupSize, 'Group size', 1, 10_000);
    const result = await pool.query(`
      SELECT c.id, c.name, b.size
      FROM cinemas c
      LEFT JOIN cinema_bundle_sizes b ON b.cinema_id = c.id
      WHERE c.id = $1
      ORDER BY b.size
    `, [id]);
    if (result.rowCount === 0) throw apiError(404, 'Cinema not found.');
    response.json({
      cinema: { id: result.rows[0].id, name: result.rows[0].name },
      groupSize,
      ...quoteBundles(result.rows.flatMap((row) => row.size === null ? [] : [row.size]), groupSize),
    });
  } catch (error) {
    await sendError(error, response);
  }
}));

const clientBuild = resolve(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
app.use(express.static(clientBuild));

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API listening on port ${port}`));
