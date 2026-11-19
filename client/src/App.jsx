import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const posters = {
  'Iron Man': 'iron-man.webp',
  'Captain America: The First Avenger': 'captain-america-the-first-avenger.webp',
  'The Avengers': 'the-avengers.webp',
  'Captain America: Civil War': 'captain-america-civil-war.webp',
  'Thor: Ragnarok': 'thor-ragnarok.webp',
  'Avengers: Infinity War': 'avengers-infinity-war.webp',
  'Avengers: Endgame': 'avengers-endgame.webp',
  'Avengers: Doomsday': 'avengers-doomsday.webp',
};

const posterUrl = (movie) => {
  const file = posters[movie?.title];
  return file ? `/posters/${file}` : '';
};
const duration = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const pageLinks = [
  { title: 'Movies', href: '/' },
  { title: 'Rewatch Plan', href: '/rewatch.html' },
  { title: 'Booking', href: '/booking.html' },
];

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    throw new Error('The API did not return JSON. Restart the server and refresh this page.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export default function App({ initialView = 'Movies' }) {
  const view = initialView;
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [targetId, setTargetId] = useState('');
  const [plan, setPlan] = useState(null);
  const [cinemaId, setCinemaId] = useState('');
  const [groupSize, setGroupSize] = useState('6');
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draftPrerequisites, setDraftPrerequisites] = useState([]);
  const [slide, setSlide] = useState(2);
  const viewRef = useRef(null);

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
  useEffect(() => {
    const scope = viewRef.current;
    if (!scope) return undefined;
    let context;
    try {
      context = gsap.context(() => {
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        gsap.fromTo(scope.querySelectorAll('[data-enter]'),
          { y: reduceMotion ? 0 : 10, opacity: 0 },
          { y: 0, opacity: 1, duration: reduceMotion ? 0 : 0.35, stagger: 0.045, ease: 'power2.out', clearProps: 'transform' },
        );
      }, scope);
    } catch { return undefined; }
    return () => context.revert();
  }, [view, busy, movies, plan, quote, editingId, slide]);

  const heroMovies = movies.slice(-3);
  const heroMovie = heroMovies[slide % Math.max(heroMovies.length, 1)];
  const shiftSlide = (next) => setSlide((current) => (current + next + Math.max(heroMovies.length, 1)) % Math.max(heroMovies.length, 1));

  async function save(path, options) { await api(path, options); await refresh(); }
  async function addMovie(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    try {
      await save('/movies', { method: 'POST', body: JSON.stringify({
        title: form.get('title'), releaseYear: Number(form.get('year')), runtime: Number(form.get('runtime')),
        prerequisites: form.getAll('prerequisites').map(Number),
      }) });
      element.reset();
    } catch (problem) { setError(problem.message); }
  }
  async function addCinema(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    try {
      await save('/cinemas', { method: 'POST', body: JSON.stringify({
        name: form.get('name'), bundleSizes: form.get('sizes').split(',').map((size) => Number(size.trim())),
      }) });
      element.reset();
    } catch (problem) { setError(problem.message); }
  }
  async function toggleWatched(movie) {
    try { await save(`/movies/${movie.id}`, { method: 'PATCH', body: JSON.stringify({ watched: !movie.watched }) }); }
    catch (problem) { setError(problem.message); }
  }
  async function savePrerequisites(event, movieId) {
    event.preventDefault();
    try {
      await save(`/movies/${movieId}`, { method: 'PATCH', body: JSON.stringify({ prerequisites: draftPrerequisites }) });
      setEditingId(null);
    } catch (problem) { setError(problem.message); }
  }
  async function getQuote(event) {
    event.preventDefault(); setQuote(null);
    try { setQuote(await api(`/cinemas/${cinemaId}/booking?groupSize=${groupSize}`)); }
    catch (problem) { setError(problem.message); }
  }
  function tap(event) {
    gsap.fromTo(event.currentTarget, { scale: 0.97 }, { scale: 1, duration: 0.24, ease: 'power2.out' });
  }

  return <div className="app-shell min-h-screen">
    <header className="site-header">
      <a className="brand" href="/" aria-label="Doomsday Ready home"><span className="brand-icon">D</span><span className="brand-copy"><b>DOOMSDAY</b><span>READY</span></span></a>
      <nav className="site-nav" aria-label="Main navigation">{pageLinks.map((link) => <a key={link.href} href={link.href} className={link.title === view ? 'active' : ''} aria-current={link.title === view ? 'page' : undefined}>{link.title}</a>)}</nav>
    </header>

    <main className="site-main mx-auto w-full">
      {error && <p className="error-note" role="alert">{error}</p>}
      {busy ? <p className="loading-note">Loading your movies…</p> : <div ref={viewRef} key={view}>
        {view === 'Movies' && <section aria-labelledby="movies-title">
          <div className="hero-wrap" data-enter>
            {heroMovies.length > 1 && <><div className="hero-side left" style={posterUrl(heroMovies[(slide + heroMovies.length - 1) % heroMovies.length]) ? { backgroundImage: `url(${posterUrl(heroMovies[(slide + heroMovies.length - 1) % heroMovies.length])})` } : undefined} /><div className="hero-side right" style={posterUrl(heroMovies[(slide + 1) % heroMovies.length]) ? { backgroundImage: `url(${posterUrl(heroMovies[(slide + 1) % heroMovies.length])})` } : undefined} /></>}
            <div className="hero-carousel">
              <div className={`hero-image ${heroMovie && !posterUrl(heroMovie) ? 'poster-missing' : ''}`} style={posterUrl(heroMovie) ? { backgroundImage: `url(${posterUrl(heroMovie)})` } : undefined} />
              <div className="hero-shade" />
              <div className="hero-copy"><span className="eyebrow">DOOMSDAY READY</span><p>Make a night of it.</p><h1 id="movies-title">{heroMovie?.title || 'Your next movie night starts here'}</h1><a className="light-button" href="/rewatch.html">Build your rewatch plan</a></div>
              {heroMovies.length > 1 && <div className="hero-controls"><button aria-label="Previous featured movie" onClick={() => shiftSlide(-1)}>‹</button>{heroMovies.map((movie, index) => <button key={movie.id} className={`hero-dot ${slide === index ? 'selected' : ''}`} aria-label={`Show ${movie.title}`} onClick={() => setSlide(index)} />)}<button aria-label="Next featured movie" onClick={() => shiftSlide(1)}>›</button></div>}
            </div>
          </div>

          <div className="section-heading" data-enter><h2>Your movies</h2><span>{movies.length} in your collection</span></div>
          <details className="add-movie" data-enter><summary>Add a movie</summary><form className="movie-form" onSubmit={addMovie}>
            <label>Title<input name="title" placeholder="Movie title" required /></label><label>Release year<input name="year" type="number" placeholder="2014" required /></label><label>Runtime (minutes)<input name="runtime" type="number" min="1" max="300" placeholder="121" required /></label><fieldset className="movie-prerequisite-field"><legend>Watch these first</legend><div className="movie-prerequisite-options">{movies.map((movie) => <label key={movie.id}><input type="checkbox" name="prerequisites" value={movie.id} />{movie.title}</label>)}</div></fieldset><button className="red-button" onClick={tap}>Save movie</button>
          </form></details>

          {movies.length ? <div className="poster-grid">{movies.map((movie) => <article className="poster-card" key={movie.id} data-enter>
            <div className="poster-image">{posterUrl(movie) && <img src={posterUrl(movie)} alt={`${movie.title} poster`} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}<span className="poster-fallback">{movie.title}</span><button className={`poster-check ${movie.watched ? 'checked' : ''}`} aria-label={`Mark ${movie.title} ${movie.watched ? 'unwatched' : 'watched'}`} onClick={() => toggleWatched(movie)}>{movie.watched ? '✓' : ''}</button></div>
            <h3>{movie.title}</h3><p className="poster-meta">{movie.releaseYear} <i /> {duration(movie.runtime)}</p>
            <details className="prerequisite-details" open={editingId === movie.id} onToggle={(event) => { if (event.currentTarget.open && editingId !== movie.id) { setEditingId(movie.id); setDraftPrerequisites(movie.prerequisites); } else if (!event.currentTarget.open && editingId === movie.id) setEditingId(null); }}><summary>Edit prerequisites</summary><form onSubmit={(event) => savePrerequisites(event, movie.id)}><div className="prerequisite-options">{movies.filter((candidate) => candidate.id !== movie.id).map((candidate) => <label key={candidate.id}><input type="checkbox" checked={draftPrerequisites.includes(candidate.id)} onChange={(event) => setDraftPrerequisites((current) => event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} />{candidate.title}</label>)}</div><button className="red-button">Save</button></form></details>
          </article>)}</div> : !busy && <p className="empty-state">No movies yet. Add one to get started.</p>}
        </section>}

        {view === 'Rewatch Plan' && <section className="inner-page" aria-labelledby="plan-title" data-enter>
          <p className="eyebrow">YOUR WATCH ORDER</p><h1 id="plan-title">Rewatch plan</h1><p className="page-lead">Pick a movie. We’ll line up the chapters that come before it.</p><p className="page-note">These example links are for the challenge, not an official MCU watch guide.</p>
          <label className="field-row">Target movie<select value={targetId} onChange={(event) => setTargetId(event.target.value)}>{movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select></label>
          {!movies.length && <p className="empty-state">Add movies to your collection to make a plan.</p>}
          {plan && <><div className="plan-summary"><div className="plan-numbers"><div><span>WATCHED</span><strong>{plan.watchedCount} of {plan.totalCount}</strong></div><div><span>TIME LEFT</span><strong>{duration(plan.unwatchedRuntime)}</strong></div></div><div className="progress-track" role="progressbar" aria-label="Rewatch progress" aria-valuemin="0" aria-valuemax={Math.max(plan.totalCount, 1)} aria-valuenow={plan.watchedCount}><span style={{ width: `${plan.totalCount ? plan.watchedCount / plan.totalCount * 100 : 0}%` }} /></div></div>
            {plan.movies.length ? <ol className="rewatch-list">{plan.movies.map((movie) => <li key={movie.id}><button className={`watched-check ${movie.watched ? 'checked' : ''}`} aria-label={`Mark ${movie.title} ${movie.watched ? 'unwatched' : 'watched'}`} onClick={() => toggleWatched(movie)}>{movie.watched ? '✓' : ''}</button><div><h2>{movie.title}</h2><p>{movie.releaseYear} · {duration(movie.runtime)}</p></div><span>{movie.watched ? 'WATCHED' : 'TO WATCH'}</span></li>)}</ol> : <p className="empty-state">No earlier movies in this plan.</p>}
            <p className="plan-target">Then: <strong>{plan.target.title}</strong></p>
          </>}
        </section>}

        {view === 'Booking' && <section className="inner-page" aria-labelledby="booking-title" data-enter>
          <p className="eyebrow">OPENING NIGHT</p><h1 id="booking-title">Plan your group booking</h1><p className="page-lead">Add a cinema’s bundles, then check the exact fit for your group.</p>
          <div className="booking-layout"><form className="booking-card" onSubmit={addCinema}><h2>Add a cinema</h2><label>Cinema name<input name="name" placeholder="Cinema name" required /></label><label>Bundle sizes<input name="sizes" placeholder="2, 4, 6" required /></label><button className="red-button" onClick={tap}>Save cinema</button></form>
            <form className="booking-card" onSubmit={getQuote}><h2>Find bundles</h2><label>Cinema<select value={cinemaId} onChange={(event) => { setCinemaId(event.target.value); setQuote(null); }} required><option value="" disabled>Choose a cinema</option>{cinemas.map((cinema) => <option value={cinema.id} key={cinema.id}>{cinema.name} · {cinema.bundleSizes.join(', ')}</option>)}</select></label><label>Group size<input type="number" min="1" max="10000" value={groupSize} onChange={(event) => setGroupSize(event.target.value)} required /></label><button className="red-button" disabled={!cinemas.length} onClick={tap}>Get quote</button></form></div>
          {quote && <div className="quote-result"><h2>{quote.possible ? `${quote.bundleCount} bundles` : 'Not possible'}</h2>{quote.possible ? quote.bundles.map((bundle) => <p key={bundle.size}>{bundle.size} seats <strong>× {bundle.count}</strong></p>) : <p>Those bundles don’t add up to exactly {groupSize} seats.</p>}</div>}
        </section>}
      </div>}
    </main>
    <footer className="site-footer"><span>DOOMSDAY READY</span><span>Movies · Rewatch plan · Booking</span></footer>
  </div>;
}
