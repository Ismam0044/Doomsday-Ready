import express from 'express';
import { pool } from './db.js';
import { buildRewatchPlan, hasCircularDependency } from './logic.js';

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

app.get('/api/movies', async (_request, response) => {
  try {
    const movies = await pool.query(`
      SELECT id, title, release_year AS "releaseYear", runtime, watched
      FROM movies ORDER BY release_year, title
    `);
    const prerequisites = await pool.query('SELECT movie_id, prerequisite_id FROM movie_prerequisites');
    const byMovie = new Map();
    for (const row of prerequisites.rows) {
      const list = byMovie.get(row.movie_id) ?? [];
      list.push(row.prerequisite_id);
      byMovie.set(row.movie_id, list);
    }
    response.json(movies.rows.map((movie) => ({
      ...movie,
      prerequisites: byMovie.get(movie.id) ?? [],
    })));
  } catch (error) {
    await sendError(error, response);
  }
});

app.post('/api/movies', async (request, response) => {
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
});

app.patch('/api/movies/:id', async (request, response) => {
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
});

app.get('/api/movies/:id/rewatch-order', async (request, response) => {
  try {
    const targetId = integer(request.params.id, 'Movie ID', 1, Number.MAX_SAFE_INTEGER);
    const targetResult = await pool.query(`
      SELECT id, title, release_year AS "releaseYear", runtime, watched
      FROM movies WHERE id = $1
    `, [targetId]);
    if (targetResult.rowCount === 0) throw apiError(404, 'Movie not found.');

    const movieResult = await pool.query(`
      SELECT id, title, release_year AS "releaseYear", runtime, watched FROM movies
    `);
    const prerequisiteResult = await pool.query(
      'SELECT movie_id, prerequisite_id FROM movie_prerequisites',
    );
    const plan = buildRewatchPlan(targetId, movieResult.rows, prerequisiteResult.rows);
    response.json({ target: targetResult.rows[0], ...plan });
  } catch (error) {
    await sendError(error, response);
  }
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API listening on port ${port}`));
