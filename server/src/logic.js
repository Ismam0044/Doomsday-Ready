export function hasCircularDependency(movieId, proposedPrerequisites, prerequisiteMap) {
  const visited = new Set();
  const pending = [...proposedPrerequisites];

  while (pending.length > 0) {
    const currentId = pending.pop();
    if (currentId === movieId) return true;
    if (visited.has(currentId)) continue;

    visited.add(currentId);
    pending.push(...(prerequisiteMap.get(currentId) ?? []));
  }

  return false;
}

export function buildRewatchPlan(targetId, movies, prerequisiteRows) {
  const movieById = new Map(movies.map((movie) => [movie.id, movie]));
  const prerequisiteMap = new Map();

  for (const row of prerequisiteRows) {
    const list = prerequisiteMap.get(row.movie_id) ?? [];
    list.push(row.prerequisite_id);
    prerequisiteMap.set(row.movie_id, list);
  }

  const orderedIds = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(movieId) {
    if (movieId === targetId || visiting.has(movieId)) {
      throw new Error('Movie prerequisites contain a circular dependency.');
    }
    if (visited.has(movieId)) return;

    visiting.add(movieId);
    for (const prerequisiteId of prerequisiteMap.get(movieId) ?? []) visit(prerequisiteId);
    visiting.delete(movieId);
    visited.add(movieId);
    orderedIds.push(movieId);
  }

  for (const prerequisiteId of prerequisiteMap.get(targetId) ?? []) visit(prerequisiteId);

  const orderedMovies = orderedIds.map((movieId) => movieById.get(movieId));
  const watchedCount = orderedMovies.filter((movie) => movie.watched).length;
  const unwatchedRuntime = orderedMovies
    .filter((movie) => !movie.watched)
    .reduce((total, movie) => total + movie.runtime, 0);

  return {
    movies: orderedMovies,
    watchedCount,
    totalCount: orderedMovies.length,
    unwatchedRuntime,
  };
}
