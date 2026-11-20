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

export function circularDependencyError() {
  const error = new Error('This change would create a circular dependency.');
  error.status = 409;
  error.code = 'CIRCULAR_DEPENDENCY';
  return error;
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

export function quoteBundles(bundleSizes, groupSize) {
  const fewest = new Array(groupSize + 1).fill(Number.POSITIVE_INFINITY);
  const lastSize = new Array(groupSize + 1).fill(0);
  fewest[0] = 0;

  for (let seats = 1; seats <= groupSize; seats += 1) {
    for (const size of bundleSizes) {
      if (size <= seats && fewest[seats - size] + 1 < fewest[seats]) {
        fewest[seats] = fewest[seats - size] + 1;
        lastSize[seats] = size;
      }
    }
  }

  if (!Number.isFinite(fewest[groupSize])) return { possible: false };

  const bundles = new Map();
  for (let remaining = groupSize; remaining > 0;) {
    const size = lastSize[remaining];
    bundles.set(size, (bundles.get(size) ?? 0) + 1);
    remaining -= size;
  }

  return {
    possible: true,
    bundleCount: fewest[groupSize],
    bundles: [...bundles.entries()]
      .sort(([first], [second]) => second - first)
      .map(([size, count]) => ({ size, count })),
  };
}
