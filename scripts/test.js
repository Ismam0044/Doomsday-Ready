import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { buildRewatchPlan, circularDependencyError, hasCircularDependency, quoteBundles } from '../server/src/logic.js';
import { sampleMovies } from '../server/src/sample-data.js';

let server;
let apiUrl;
let pool;

before(async () => {
  const savedDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1/test';
  const { default: app } = await import('../server/src/index.js');
  ({ pool } = await import('../server/src/db.js'));
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  apiUrl = `http://127.0.0.1:${server.address().port}`;
});

async function withMovieDatabase({ movieExists = true, isPrerequisite = false } = {}, run) {
  const originalConnect = pool.connect;
  const queries = [];

  pool.connect = async () => ({
    async query(sql, values = []) {
      const statement = String(sql).replace(/\s+/g, ' ').trim();
      queries.push({ statement, values });
      if (statement === 'SELECT id FROM movies WHERE id = $1 FOR UPDATE') {
        return { rows: movieExists ? [{ id: values[0] }] : [], rowCount: movieExists ? 1 : 0 };
      }
      if (statement === 'SELECT movie_id FROM movie_prerequisites WHERE prerequisite_id = $1 LIMIT 1') {
        return { rows: isPrerequisite ? [{ movie_id: 2 }] : [], rowCount: isPrerequisite ? 1 : 0 };
      }
      if (statement.startsWith('DELETE FROM movie_prerequisites WHERE movie_id = $1')) {
        return { rows: [], rowCount: 1 };
      }
      if (statement === 'DELETE FROM movies WHERE id = $1') {
        return { rows: [], rowCount: 1 };
      }
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(statement)) {
        return { rows: [], rowCount: null };
      }
      throw new Error(`Unexpected test query: ${statement}`);
    },
    release() {},
  });

  try {
    await run(queries);
  } finally {
    pool.connect = originalConnect;
  }
}

async function withMockedPool(query, run) {
  const originalConnect = pool.connect;
  const originalQuery = pool.query;
  const statements = [];
  const mockQuery = async (sql, values = []) => {
    const statement = String(sql).replace(/\s+/g, ' ').trim();
    statements.push({ statement, values });
    return query(statement, values);
  };

  pool.connect = async () => ({ query: mockQuery, release() {} });
  pool.query = mockQuery;
  try {
    await run(statements);
  } finally {
    pool.connect = originalConnect;
    pool.query = originalQuery;
  }
}

async function withMovieWriteDatabase({ insertedId = 9, graphRows = [] } = {}, run) {
  return withMockedPool((statement, values) => {
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(statement)) return { rows: [], rowCount: null };
    if (statement === 'SELECT * FROM movies WHERE id = $1') {
      const movie = movies.find((item) => item.id === values[0]);
      return {
        rows: movie ? [{
          id: movie.id,
          title: movie.title,
          release_year: movie.releaseYear,
          runtime: movie.runtime,
          watched: movie.watched,
        }] : [],
        rowCount: movie ? 1 : 0,
      };
    }
    if (statement === 'SELECT id FROM movies WHERE id = ANY($1::int[])') {
      const rows = values[0].map((id) => ({ id }));
      return { rows, rowCount: rows.length };
    }
    if (statement.startsWith('INSERT INTO movies ')) return { rows: [{ id: insertedId }], rowCount: 1 };
    if (statement === 'SELECT movie_id, prerequisite_id FROM movie_prerequisites') {
      return { rows: graphRows, rowCount: graphRows.length };
    }
    if (statement.startsWith('UPDATE movies SET ')) return { rows: [], rowCount: 1 };
    throw new Error(`Unexpected movie test query: ${statement}`);
  }, run);
}

async function assertCircularResponse(response) {
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: 'This change would create a circular dependency.',
    code: 'CIRCULAR_DEPENDENCY',
  });
}

async function assertValidationResponse(response) {
  assert.equal(response.status, 400);
  assert.equal(typeof (await response.json()).error, 'string');
}

function rejectUnexpectedQuery(statement) {
  if (statement === 'ROLLBACK') return { rows: [], rowCount: null };
  throw new Error(`Validation unexpectedly queried the database: ${statement}`);
}

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const movies = sampleMovies.map((movie, index) => ({
  id: index + 1,
  title: movie.title,
  releaseYear: movie.releaseYear,
  runtime: movie.runtime,
  watched: index === 0,
}));
const idByTitle = new Map(movies.map((movie) => [movie.title, movie.id]));
const prerequisiteRows = sampleMovies.flatMap((movie) => movie.prerequisites.map((title) => ({
  movie_id: idByTitle.get(movie.title),
  prerequisite_id: idByTitle.get(title),
})));

test('Doomsday rewatch plan includes all seven prerequisites once in valid order', () => {
  const targetId = idByTitle.get('Avengers: Doomsday');
  const plan = buildRewatchPlan(targetId, movies, prerequisiteRows);
  const targetMovies = movies.filter((movie) => movie.id !== targetId);
  const planIds = plan.movies.map((movie) => movie.id);
  const position = new Map(planIds.map((id, index) => [id, index]));

  assert.equal(plan.movies.length, 7);
  assert.equal(plan.totalCount, 7);
  assert.equal(plan.watchedCount, 1);
  assert.equal(plan.unwatchedRuntime, targetMovies.reduce((total, movie) => total + movie.runtime, 0) - movies[0].runtime);
  assert.equal(new Set(planIds).size, 7);
  assert.equal(planIds.includes(targetId), false);
  assert.deepEqual(new Set(plan.movies.map((movie) => movie.title)), new Set(targetMovies.map((movie) => movie.title)));
  for (const row of prerequisiteRows) {
    if (position.has(row.movie_id) && position.has(row.prerequisite_id)) {
      assert.ok(position.get(row.prerequisite_id) < position.get(row.movie_id));
    }
  }
});

test('Civil War rewatch plan is Iron Man and First Avenger before The Avengers', () => {
  const targetId = idByTitle.get('Captain America: Civil War');
  const plan = buildRewatchPlan(targetId, movies, prerequisiteRows);
  assert.deepEqual(plan.movies.map((movie) => movie.title), [
    'Iron Man',
    'Captain America: The First Avenger',
    'The Avengers',
  ]);
});

test('Ragnarok has an empty rewatch plan', () => {
  const targetId = idByTitle.get('Thor: Ragnarok');
  const plan = buildRewatchPlan(targetId, movies, prerequisiteRows);
  assert.deepEqual(plan.movies, []);
  assert.equal(plan.watchedCount, 0);
  assert.equal(plan.unwatchedRuntime, 0);
});

test('making Endgame a prerequisite of Iron Man is circular', () => {
  const prerequisiteMap = new Map();
  for (const row of prerequisiteRows) {
    const list = prerequisiteMap.get(row.movie_id) ?? [];
    list.push(row.prerequisite_id);
    prerequisiteMap.set(row.movie_id, list);
  }
  assert.equal(
    hasCircularDependency(
      idByTitle.get('Iron Man'),
      [idByTitle.get('Avengers: Endgame')],
      prerequisiteMap,
    ),
    true,
  );
});

test('a movie cannot depend on itself', () => {
  assert.equal(hasCircularDependency(1, [1], new Map()), true);
});

test('a direct two-movie loop is circular', () => {
  assert.equal(hasCircularDependency(1, [2], new Map([[2, [1]]])), true);
});

test('circular dependency errors use HTTP 409 and the assessment code', () => {
  const error = circularDependencyError();
  assert.equal(error.status, 409);
  assert.equal(error.code, 'CIRCULAR_DEPENDENCY');
});

test('malformed API JSON returns a JSON 400 response', async () => {
  const response = await fetch(`${apiUrl}/api/movies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(response.status, 400);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(typeof (await response.json()).error, 'string');
});

test('an unknown API route returns a JSON 404 response', async () => {
  const response = await fetch(`${apiUrl}/api/not-an-endpoint`);
  assert.equal(response.status, 404);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), { error: 'API endpoint not found.' });
});

test('POST /api/movies returns CIRCULAR_DEPENDENCY for a self prerequisite', async () => {
  await withMovieWriteDatabase({ insertedId: 1 }, async () => {
    const response = await fetch(`${apiUrl}/api/movies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'TEST self', releaseYear: 2026, runtime: 100, prerequisites: [1] }),
    });
    await assertCircularResponse(response);
  });
});

test('PATCH /api/movies/:id returns CIRCULAR_DEPENDENCY for a self prerequisite', async () => {
  await withMovieWriteDatabase({}, async () => {
    const response = await fetch(`${apiUrl}/api/movies/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prerequisites: [1] }),
    });
    await assertCircularResponse(response);
  });
});

test('PATCH /api/movies/:id returns CIRCULAR_DEPENDENCY for a direct two-movie loop', async () => {
  await withMovieWriteDatabase({ graphRows: [{ movie_id: 2, prerequisite_id: 1 }] }, async () => {
    const response = await fetch(`${apiUrl}/api/movies/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prerequisites: [2] }),
    });
    await assertCircularResponse(response);
  });
});

test('PATCH rejects making Endgame a prerequisite of Iron Man', async () => {
  await withMovieWriteDatabase({ graphRows: prerequisiteRows }, async () => {
    const ironManId = idByTitle.get('Iron Man');
    const endgameId = idByTitle.get('Avengers: Endgame');
    const response = await fetch(`${apiUrl}/api/movies/${ironManId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prerequisites: [endgameId] }),
    });
    await assertCircularResponse(response);
  });
});

test('movie API rejects runtime 0 and 301 with HTTP 400', async () => {
  await withMockedPool(rejectUnexpectedQuery, async () => {
    for (const runtime of [0, 301]) {
      const response = await fetch(`${apiUrl}/api/movies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `TEST runtime ${runtime}`, releaseYear: 2026, runtime }),
      });
      await assertValidationResponse(response);
    }
  });
});

test('movie API rejects null, empty and boolean release years with HTTP 400', async () => {
  await withMockedPool(rejectUnexpectedQuery, async () => {
    for (const releaseYear of [null, '', true]) {
      const response = await fetch(`${apiUrl}/api/movies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'TEST invalid year', releaseYear, runtime: 100 }),
      });
      await assertValidationResponse(response);
    }
  });
});

test('cinema API rejects 11 bundle sizes and bundle sizes 0, 501 and true', async () => {
  await withMockedPool(rejectUnexpectedQuery, async () => {
    const invalidSizes = [
      Array.from({ length: 11 }, (_, index) => index + 1),
      [0],
      [501],
      [true],
    ];
    for (const bundleSizes of invalidSizes) {
      const response = await fetch(`${apiUrl}/api/cinemas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'TEST validation cinema', bundleSizes }),
      });
      await assertValidationResponse(response);
    }
  });
});

test('booking API rejects group sizes 0 and 10001 with HTTP 400', async () => {
  await withMockedPool(() => { throw new Error('Validation unexpectedly queried the database.'); }, async () => {
    for (const groupSize of [0, 10001]) {
      const response = await fetch(`${apiUrl}/api/cinemas/1/booking?groupSize=${groupSize}`);
      await assertValidationResponse(response);
    }
  });
});

test('DELETE /api/movies/:id returns 204 and explicitly removes its own prerequisite links', async () => {
  await withMovieDatabase({}, async (queries) => {
    const response = await fetch(`${apiUrl}/api/movies/1`, { method: 'DELETE' });
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');

    const statements = queries.map(({ statement }) => statement);
    assert.ok(statements.indexOf('DELETE FROM movie_prerequisites WHERE movie_id = $1') < statements.indexOf('DELETE FROM movies WHERE id = $1'));
    assert.ok(statements.includes('COMMIT'));
    assert.equal(statements.some((statement) => statement.includes('ON DELETE CASCADE')), false);
  });
});

test('DELETE /api/movies/:id returns JSON 404 when the movie does not exist', async () => {
  await withMovieDatabase({ movieExists: false }, async (queries) => {
    const response = await fetch(`${apiUrl}/api/movies/999`, { method: 'DELETE' });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Movie not found.' });
    assert.equal(queries.some(({ statement }) => statement.startsWith('DELETE FROM')), false);
  });
});

test('DELETE /api/movies/:id returns MOVIE_IS_PREREQUISITE and leaves links untouched', async () => {
  await withMovieDatabase({ isPrerequisite: true }, async (queries) => {
    const response = await fetch(`${apiUrl}/api/movies/1`, { method: 'DELETE' });
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: 'This movie is a prerequisite for other movies and cannot be deleted.',
      code: 'MOVIE_IS_PREREQUISITE',
    });
    assert.equal(queries.some(({ statement }) => statement.startsWith('DELETE FROM')), false);
  });
});

test('movie prerequisite foreign keys explicitly prevent cascading deletes', async () => {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  assert.match(schema, /movie_id INTEGER NOT NULL REFERENCES movies\(id\) ON DELETE NO ACTION/);
  assert.match(schema, /prerequisite_id INTEGER NOT NULL REFERENCES movies\(id\) ON DELETE NO ACTION/);
  assert.doesNotMatch(schema, /ON DELETE CASCADE/i);
});

test('bundle sizes 1, 3, 4 quote two bundles of 3 for six people', () => {
  assert.deepEqual(quoteBundles([1, 3, 4], 6), {
    possible: true,
    bundleCount: 2,
    bundles: [{ size: 3, count: 2 }],
  });
});

test('bundle sizes 2, 5 quote one 5 and three 2 bundles for eleven people', () => {
  assert.deepEqual(quoteBundles([2, 5], 11), {
    possible: true,
    bundleCount: 4,
    bundles: [{ size: 5, count: 1 }, { size: 2, count: 3 }],
  });
});

test('bundle sizes 6, 9, 20 quote four bundles for forty-four people', () => {
  assert.deepEqual(quoteBundles([6, 9, 20], 44), {
    possible: true,
    bundleCount: 4,
    bundles: [{ size: 20, count: 1 }, { size: 9, count: 2 }, { size: 6, count: 1 }],
  });
});

test('bundle sizes 4 and 6 cannot exactly seat seven people', () => {
  assert.deepEqual(quoteBundles([4, 6], 7), { possible: false });
});
