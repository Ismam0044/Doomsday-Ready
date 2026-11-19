import { useEffect, useState } from 'react';

const api = (path, options = {}) => fetch(`/api${path}`, {
  ...options,
  headers: { 'Content-Type': 'application/json', ...options.headers },
}).then(async (response) => {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
});

const duration = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export default function App() {
  const [view, setView] = useState('Movies');
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [targetId, setTargetId] = useState('');
  const [plan, setPlan] = useState(null);
  const [cinemaId, setCinemaId] = useState('');
  const [groupSize, setGroupSize] = useState('6');
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const [movieRows, cinemaRows] = await Promise.all([api('/movies'), api('/cinemas')]);
      setMovies(movieRows);
      setCinemas(cinemaRows);
      setTargetId((current) => current || String(movieRows.at(-1)?.id || ''));
      setCinemaId((current) => current || String(cinemaRows[0]?.id || ''));
      setError('');
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!targetId) return setPlan(null);
    api(`/movies/${targetId}/rewatch-order`).then(setPlan).catch((problem) => setError(problem.message));
  }, [targetId, movies]);

  async function save(path, options) { await api(path, options); await refresh(); }
  async function addMovie(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await save('/movies', { method: 'POST', body: JSON.stringify({
        title: form.get('title'), releaseYear: Number(form.get('year')), runtime: Number(form.get('runtime')),
        prerequisites: form.getAll('prerequisites').map(Number),
      }) });
      event.currentTarget.reset();
    } catch (problem) { setError(problem.message); }
  }
  async function addCinema(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await save('/cinemas', { method: 'POST', body: JSON.stringify({
        name: form.get('name'), bundleSizes: form.get('sizes').split(',').map((size) => Number(size.trim())),
      }) });
      event.currentTarget.reset();
    } catch (problem) { setError(problem.message); }
  }
  async function toggleWatched(movie) {
    try { await save(`/movies/${movie.id}`, { method: 'PATCH', body: JSON.stringify({ watched: !movie.watched }) }); }
    catch (problem) { setError(problem.message); }
  }
  async function getQuote(event) {
    event.preventDefault(); setQuote(null);
    try { setQuote(await api(`/cinemas/${cinemaId}/booking?groupSize=${groupSize}`)); }
    catch (problem) { setError(problem.message); }
  }

  return <main className="page">
    <header><div className="wordmark">DOOMSDAY <span>READY</span></div><p>A little prep goes a long way.</p></header>
    <nav aria-label="Views">{['Movies', 'Rewatch Plan', 'Booking'].map((item) => <button className={view === item ? 'active' : ''} key={item} onClick={() => { setView(item); setError(''); }}>{item}</button>)}</nav>
    {error && <p className="error" role="alert">{error}</p>}
    {busy ? <p className="quiet">Getting things ready…</p> : <>
      {view === 'Movies' && <section>
        <h1>The story so far.</h1><p className="intro">Your collection, in your order.</p>
        <form className="add-form" onSubmit={addMovie}>
          <label>Title<input name="title" placeholder="Movie title" required /></label>
          <label>Year<input name="year" type="number" required /></label>
          <label>Runtime (minutes)<input name="runtime" type="number" min="1" max="300" required /></label>
          <label>Watch these first<select name="prerequisites" multiple size="2">{movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select></label>
          <button className="solid">Add movie</button>
        </form>
        <div className="movie-list">{movies.map((movie) => <article className="movie" key={movie.id}>
          <button className={`tick ${movie.watched ? 'checked' : ''}`} aria-label={`Mark ${movie.title} ${movie.watched ? 'unwatched' : 'watched'}`} onClick={() => toggleWatched(movie)}>{movie.watched ? '✓' : ''}</button>
          <div><h2>{movie.title}</h2><p>{movie.releaseYear} · {duration(movie.runtime)}{movie.prerequisites.length ? ` · after ${movie.prerequisites.map((id) => movies.find((item) => item.id === id)?.title).filter(Boolean).join(', ')}` : ''}</p></div>
          <span className="watched">{movie.watched ? 'Watched' : 'To watch'}</span>
        </article>)}</div>
      </section>}
      {view === 'Rewatch Plan' && <section>
        <h1>Know what comes first.</h1><p className="intro">A prerequisite-first path to your pick.</p>
        <label className="target">Destination<select value={targetId} onChange={(event) => setTargetId(event.target.value)}>{movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select></label>
        {plan && <><div className="progress-copy">{plan.watchedCount} of {plan.totalCount} watched <span>{duration(plan.unwatchedRuntime)} left</span></div><div className="progress"><span style={{ width: `${plan.totalCount ? plan.watchedCount / plan.totalCount * 100 : 0}%` }} /></div>
          <div className="movie-list">{plan.movies.map((movie) => <article className="movie" key={movie.id}><button className={`tick ${movie.watched ? 'checked' : ''}`} onClick={() => toggleWatched(movie)} aria-label={`Mark ${movie.title} ${movie.watched ? 'unwatched' : 'watched'}`}>{movie.watched ? '✓' : ''}</button><div><h2>{movie.title}</h2><p>{movie.releaseYear} · {duration(movie.runtime)}</p></div><span className="watched">{movie.watched ? 'Watched' : 'To watch'}</span></article>)}</div>
          <p className="destination">Then: <b>{plan.target.title}</b></p></>}
        {!movies.length && <p className="quiet">Add a movie to make a rewatch plan.</p>}
      </section>}
      {view === 'Booking' && <section>
        <h1>Save a seat for everyone.</h1><p className="intro">Find an exact fit for the group.</p>
        <div className="booking-grid"><form className="add-form" onSubmit={addCinema}><h2>Add a cinema</h2><label>Name<input name="name" required /></label><label>Bundle sizes<input name="sizes" placeholder="2, 4, 6" required /></label><button className="solid">Add cinema</button></form>
          <form className="add-form" onSubmit={getQuote}><h2>Find your bundles</h2><label>Cinema<select value={cinemaId} onChange={(event) => { setCinemaId(event.target.value); setQuote(null); }} required><option value="" disabled>Choose a cinema</option>{cinemas.map((cinema) => <option value={cinema.id} key={cinema.id}>{cinema.name} · {cinema.bundleSizes.join(', ')}</option>)}</select></label><label>Group size<input type="number" min="1" max="10000" value={groupSize} onChange={(event) => setGroupSize(event.target.value)} required /></label><button className="solid" disabled={!cinemas.length}>Find bundles</button></form></div>
        {quote && <div className="result"><h2>{quote.possible ? `${quote.bundleCount} bundles` : 'No exact match'}</h2>{quote.possible ? quote.bundles.map((bundle) => <p key={bundle.size}>{bundle.count} × bundle of {bundle.size}</p>) : <p>Try another group size or cinema.</p>}</div>}
      </section>}
    </>}
    <footer>YOUR REWATCH, ON YOUR TERMS.</footer>
  </main>;
}
