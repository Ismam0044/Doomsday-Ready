import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const api = (path, options = {}) => fetch(`/api${path}`, {
  ...options,
  headers: { 'Content-Type': 'application/json', ...options.headers },
}).then(async (response) => {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
});

const duration = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const views = ['Movies', 'Rewatch Plan', 'Booking'];

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
    if (!viewRef.current) return undefined;
    const context = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.fromTo('[data-enter]',
        { y: reduceMotion ? 0 : 14, opacity: 0 },
        { y: 0, opacity: 1, duration: reduceMotion ? 0 : 0.48, stagger: 0.07, ease: 'power2.out', clearProps: 'transform' },
      );
    }, viewRef);
    return () => context.revert();
  }, [view, busy, movies, plan, quote, editingId]);

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
    const target = event.currentTarget;
    gsap.fromTo(target, { scale: 0.96 }, { scale: 1, duration: 0.32, ease: 'back.out(2)' });
  }

  return <div className="app-shell min-h-screen">
    <div className="filmstrip" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
    <header className="masthead flex items-center justify-between">
      <a className="brand" href="#home" aria-label="Doomsday Ready home"><span className="brand-mark">DR</span><span className="brand-name">DOOMSDAY <b>READY</b></span></a>
      <p className="masthead-note">A rewatch guide for the big screen.</p>
      <span className="masthead-edition">HOLLYWOOD · EST. 1927</span>
    </header>
    <nav className="main-nav flex items-center" aria-label="Views">
      <span className="nav-overline">YOUR NIGHT</span>
      {views.map((item, index) => <a className={`nav-link ${view === item ? 'is-active' : ''}`} key={item} href={item === 'Movies' ? '/' : item === 'Rewatch Plan' ? '/rewatch.html' : '/booking.html'} aria-current={view === item ? 'page' : undefined}><span>{item}</span><small>0{index + 1}</small></a>)}
      <span className="nav-status"><i /> THE COUNTDOWN IS ON</span>
    </nav>

    <main className="content-shell">
      {error && <p className="error-note" role="alert">{error}</p>}
      {busy ? <div className="loading-note"><span className="loading-star">✳</span> Pulling the house lights down…</div> : <div ref={viewRef} key={view}>
        {view === 'Movies' && <section aria-labelledby="movies-title">
          <div className="view-kicker" data-enter><span>01 / THE ARCHIVE</span><i /></div>
          <div className="hero-grid">
            <div className="hero-copy" data-enter><p className="tiny-label">THE MARVEL REWATCH, YOUR WAY</p><h1 id="movies-title">Before the<br /><em>curtain rises.</em></h1><p>Set the scene. Mark what you’ve seen. We’ll keep the story straight.</p></div>
            <div className="hero-poster" aria-label="Doomsday Ready feature card" data-enter><div className="poster-rule"><span>ONE NIGHT</span><span>ONE BIG STORY</span></div><div className="poster-art"><div className="poster-sun" /><div className="poster-spire" /><div className="poster-spire second" /><div className="poster-horizon" /></div><div className="poster-title"><small>THE ROAD TO</small><strong>DOOMSDAY</strong><span>THE STORY SO FAR</span></div><span className="poster-number">№ 01</span></div>
          </div>
          <div className="section-title" data-enter><div><span className="tiny-label">YOUR COLLECTION</span><h2>The films <sup>{String(movies.length).padStart(2, '0')}</sup></h2></div><span className="section-aside">A few chapters at a time.</span></div>
          <form className="add-form" onSubmit={addMovie} data-enter>
            <label>Movie title<input name="title" placeholder="Add a film to the list" required /></label>
            <label>Release year<input name="year" type="number" placeholder="2014" required /></label>
            <label>Runtime<input name="runtime" type="number" min="1" max="300" placeholder="121 min" required /></label>
            <label>Watch these first<select name="prerequisites" multiple size="2">{movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select></label>
            <button className="gold-button" onClick={tap}>Add to the list <span>↗</span></button>
          </form>
          {movies.length ? <div className="movie-list">{movies.map((movie, index) => <div className="movie-group" key={movie.id} data-enter>
            <article className="movie-row">
              <span className="movie-index">{String(index + 1).padStart(2, '0')}</span>
              <button className={`watched-check ${movie.watched ? 'checked' : ''}`} aria-label={`Mark ${movie.title} ${movie.watched ? 'unwatched' : 'watched'}`} onClick={(event) => { tap(event); toggleWatched(movie); }}>{movie.watched ? '✓' : ''}</button>
              <div className="movie-info"><h3>{movie.title}</h3><p>{movie.releaseYear} <i /> {duration(movie.runtime)}{movie.prerequisites.length ? <><i /> AFTER {movie.prerequisites.map((id) => movies.find((item) => item.id === id)?.title).filter(Boolean).join(' · ')}</> : null}</p></div>
              <button className="edit-link" onClick={() => { setEditingId(movie.id); setDraftPrerequisites(movie.prerequisites); }}>{editingId === movie.id ? 'Editing' : 'Edit order'}</button>
              <span className="watch-label">{movie.watched ? 'SEEN' : 'TO SEE'}</span>
            </article>
            {editingId === movie.id && <form className="prerequisite-edit" onSubmit={(event) => savePrerequisites(event, movie.id)}><fieldset><legend>What belongs before {movie.title}?</legend>{movies.filter((candidate) => candidate.id !== movie.id).map((candidate) => <label key={candidate.id}><input type="checkbox" checked={draftPrerequisites.includes(candidate.id)} onChange={(event) => setDraftPrerequisites((current) => event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} />{candidate.title}</label>)}</fieldset><button className="gold-button">Save order <span>↗</span></button><button type="button" className="cancel-link" onClick={() => setEditingId(null)}>Keep as is</button></form>}
          </div>)}</div> : <div className="empty-slate" data-enter><p>No films in the lobby yet.</p><span>Start with one you already love.</span></div>}
        </section>}

        {view === 'Rewatch Plan' && <section aria-labelledby="plan-title">
          <div className="view-kicker" data-enter><span>02 / THE ROAD BACK</span><i /></div><div className="page-intro" data-enter><p className="tiny-label">A GOOD STORY HAS A RIGHT ORDER</p><h1 id="plan-title">The path to<br /><em>the premiere.</em></h1><p>Pick a destination. We’ll gather the chapters that lead there.</p></div>
          <label className="target-select" data-enter><span>DESTINATION</span><select value={targetId} onChange={(event) => setTargetId(event.target.value)}>{movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select><span className="select-arrow">⌄</span></label>
          {!movies.length && <div className="empty-slate" data-enter><p>Nothing on the marquee yet.</p><span>Add a movie on the Movies view and come back.</span></div>}
          {plan && <><div className="plan-card" data-enter><div className="plan-stats"><div><span>YOUR REWATCH</span><strong>{plan.totalCount}<small> films</small></strong></div><div><span>ALREADY SEEN</span><strong>{plan.watchedCount}<small> / {plan.totalCount}</small></strong></div><div><span>STILL AHEAD</span><strong>{duration(plan.unwatchedRuntime)}</strong></div></div><div className="progress-track"><span style={{ width: `${plan.totalCount ? plan.watchedCount / plan.totalCount * 100 : 0}%` }} /></div><p className="progress-caption">{plan.watchedCount} of {plan.totalCount} watched</p></div>
            {plan.movies.length ? <div className="movie-list plan-list">{plan.movies.map((movie, index) => <article className="movie-row" key={movie.id} data-enter><span className="movie-index">{String(index + 1).padStart(2, '0')}</span><button className={`watched-check ${movie.watched ? 'checked' : ''}`} aria-label={`Mark ${movie.title} ${movie.watched ? 'unwatched' : 'watched'}`} onClick={(event) => { tap(event); toggleWatched(movie); }}>{movie.watched ? '✓' : ''}</button><div className="movie-info"><h3>{movie.title}</h3><p>{movie.releaseYear} <i /> {duration(movie.runtime)}</p></div><span className="watch-label">{movie.watched ? 'SEEN' : 'TO SEE'}</span></article>)}</div> : <div className="empty-slate" data-enter><p>You can start here.</p><span>{plan.target.title} has no earlier chapters in your collection.</span></div>}
            <div className="finale-card" data-enter><span>AND THEN, THE MAIN EVENT</span><strong>{plan.target.title}</strong><small>{plan.target.releaseYear} <i /> {duration(plan.target.runtime)}</small></div>
          </>}
        </section>}

        {view === 'Booking' && <section aria-labelledby="booking-title">
          <div className="view-kicker" data-enter><span>03 / OPENING NIGHT</span><i /></div><div className="page-intro" data-enter><p className="tiny-label">SAME SCREEN. SAME STORY.</p><h1 id="booking-title">Bring your<br /><em>whole crew.</em></h1><p>Choose a cinema, tell us how many, and we’ll make the seats add up.</p></div>
          <div className="booking-grid"><form className="paper-form" onSubmit={addCinema} data-enter><span className="form-index">A / CINEMA</span><h2>Add your theatre</h2><p>We’ll remember the bundles it sells.</p><label>CINEMA NAME<input name="name" placeholder="e.g. The Grand" required /></label><label>BUNDLE SIZES<input name="sizes" placeholder="2, 4, 6" required /></label><button className="gold-button" onClick={tap}>Save cinema <span>↗</span></button></form>
            <form className="paper-form quote-form" onSubmit={getQuote} data-enter><span className="form-index">B / SEAT PLAN</span><h2>Find your fit</h2><p>No empty seats. No one left outside.</p><label>CINEMA<select value={cinemaId} onChange={(event) => { setCinemaId(event.target.value); setQuote(null); }} required><option value="" disabled>Choose a cinema</option>{cinemas.map((cinema) => <option value={cinema.id} key={cinema.id}>{cinema.name} · {cinema.bundleSizes.join(', ')}</option>)}</select></label><label>PEOPLE IN YOUR GROUP<input type="number" min="1" max="10000" value={groupSize} onChange={(event) => setGroupSize(event.target.value)} required /></label><button className="gold-button" disabled={!cinemas.length} onClick={tap}>Show seat plan <span>↗</span></button></form></div>
          {quote && <div className="quote-result" data-enter><div><span className="tiny-label">YOUR SEAT MATH</span><h2>{quote.possible ? `${quote.bundleCount} bundles` : 'No exact fit this time.'}</h2></div>{quote.possible ? <div className="bundle-list">{quote.bundles.map((bundle) => <p key={bundle.size}><span>{bundle.size} seats</span><strong>× {bundle.count}</strong></p>)}</div> : <p>Try a different group size or cinema. We’ll find the right combination.</p>}</div>}
        </section>}
      </div>}
    </main>
    <footer className="site-footer"><span>DOOMSDAY READY</span><span>MAKE THE NIGHT COUNT <i>✳</i></span></footer>
  </div>;
}
