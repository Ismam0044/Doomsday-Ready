import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { buildRewatchPlan, circularDependencyError, hasCircularDependency, quoteBundles } from '../server/src/logic.js';
import { sampleMovies } from '../server/src/sample-data.js';

let server;
let apiUrl;

before(async () => {
  const savedDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1/test';
  const { default: app } = await import('../server/src/index.js');
  if (savedDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedDatabaseUrl;

  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  apiUrl = `http://127.0.0.1:${server.address().port}`;
});

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
