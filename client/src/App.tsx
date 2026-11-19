import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Armchair, ArrowDownRight, ArrowRight, Check, ChevronDown, Clapperboard, Film, Pencil, Plus, Popcorn, RotateCcw, Ticket, X } from './icons';

type Movie = { id: number; title: string; releaseYear: number; runtime: number; watched: boolean; prerequisites: number[] };
type Cinema = { id: number; name: string; bundleSizes: number[] };
type Rewatch = { target: { id: number; title: string }; movies: Movie[]; watchedCount: number; totalCount: number; unwatchedRuntime: number };
type Quote = { possible: boolean; groupSize: number; bundleCount?: number; bundles?: Record<string, number> };
type View = 'movies' | 'plan' | 'booking';
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'Something went wrong. Try again.');
  return data as T;
}
const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export default function App() {
  const [view, setView] = useState<View>('movies');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [targetId, setTargetId] = useState('');
  const [plan, setPlan] = useState<Rewatch | null>(null);
  const [cinemaId, setCinemaId] = useState('');
  const [groupSize, setGroupSize] = useState('6');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMovieForm, setShowMovieForm] = useState(false);
  const [showCinemaForm, setShowCinemaForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [movieData, cinemaData] = await Promise.all([request<Movie[]>('/movies'), request<Cinema[]>('/cinemas')]);
      setMovies(movieData);
      setCinemas(cinemaData);
      if (!targetId && movieData.length) setTargetId(String(movieData[movieData.length - 1].id));
      if (!cinemaId && cinemaData.length) setCinemaId(String(cinemaData[0].id));
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not reach the API.'); }
    finally { setLoading(false); }
  }, [targetId, cinemaId]);

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (view !== 'plan' || !targetId) { setPlan(null); return; }
    request<Rewatch>(`/movies/${targetId}/rewatch-order`).then(setPlan).catch((err) => setError(err.message));
  }, [view, targetId, movies]);

  const activeView = useMemo(() => ({ movies: 'The collection', plan: 'Your rewatch plan', booking: 'Opening night' }[view]), [view]);
  const markWatched = async (movie: Movie) => {
    try { await request(`/movies/${movie.id}`, { method: 'PATCH', body: JSON.stringify({ watched: !movie.watched }) }); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update movie.'); }
  };
  const addMovie = async (data: { title: string; releaseYear: number; runtime: number; prerequisites: number[] }) => {
    await request('/movies', { method: 'POST', body: JSON.stringify(data) });
    await refresh(); setShowMovieForm(false);
  };
  const addCinema = async (data: { name: string; bundleSizes: number[] }) => {
    await request('/cinemas', { method: 'POST', body: JSON.stringify(data) });
    await refresh(); setShowCinemaForm(false);
  };
  const savePrerequisites = async (movie: Movie, prerequisites: number[]) => {
    await request(`/movies/${movie.id}`, { method: 'PATCH', body: JSON.stringify({ prerequisites }) });
    await refresh(); setEditingMovie(null);
  };
  const getQuote = async (event: FormEvent) => {
    event.preventDefault(); setQuote(null); setError('');
    try { setQuote(await request<Quote>(`/cinemas/${cinemaId}/booking?groupSize=${groupSize}`)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not find a booking.'); }
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Clapperboard size={19} strokeWidth={1.8} /></div><span>DOOMSDAY<br /><b>READY</b></span><span className="edition">FIELD GUIDE / 01</span></div>
      <div className="nav-label">GETTING READY</div>
      <nav>{([
        ['movies', Film, 'Movies', '01'], ['plan', RotateCcw, 'Rewatch plan', '02'], ['booking', Ticket, 'Opening night', '03'],
      ] as const).map(([key, Icon, label, number]) => <button key={key} className={`nav-item ${view === key ? 'selected' : ''}`} onClick={() => { setView(key); setError(''); }}><Icon size={17} /><span>{label}</span><small>{number}</small></button>)}</nav>
      <div className="sidebar-bottom"><div className="signal"><span className="signal-dot" /><span>ALL SYSTEMS NOMINAL</span></div><p>One big night.<br />A little prep goes a long way.</p><span className="sidebar-credit">BLINTO TALENT ACCELERATOR · 2027</span></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>DOOMSDAY READY</span><ArrowRight size={13} /><b>{activeView.toUpperCase()}</b></div><div className="top-status"><span className="status-pip" /> REWATCH STATUS <span className="top-count">{movies.filter(m => m.watched).length} / {movies.length}</span></div></header>
      <div className="content-wrap">
        <div className="eyebrow"><span className="eyebrow-line" /> PREPARE FOR THE PREMIERE <span className="eyebrow-line short" /></div>
        <div className="page-heading"><div><h1>{view === 'movies' ? <>The long<br /><em>story so far.</em></> : view === 'plan' ? <>Know what<br /><em>comes first.</em></> : <>Save a seat<br /><em>for everyone.</em></>}</h1><p>{view === 'movies' ? 'Build your own little corner of the MCU.' : view === 'plan' ? 'Trace the story back. Leave no loose threads.' : 'Find a bundle that gets your whole crew in.'}</p></div><div className="heading-stamp"><span>AVENGERS</span><b>DOOMSDAY</b><small>THE COUNTDOWN IS ON</small><ArrowDownRight size={15} /></div></div>

        {error && <div className="notice"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}
        {loading ? <div className="loading-state"><span className="spinner" /> Getting things ready…</div> : <>
          {view === 'movies' && <section className="section-block">
            <div className="section-head"><div><span className="section-kicker">01 / THE ARCHIVE</span><h2>Movie collection <span className="count-badge">{movies.length.toString().padStart(2, '0')}</span></h2></div><button className="button-dark" onClick={() => setShowMovieForm(true)}><Plus size={16} /> Add a movie</button></div>
            {movies.length === 0 ? <EmptyState icon={<Film />} title="Your collection starts here." copy="Add a movie, then build the story around it." action={<button className="button-dark" onClick={() => setShowMovieForm(true)}><Plus size={16} /> Add your first movie</button>} /> : <div className="movie-list">{movies.map((movie, index) => <MovieRow key={movie.id} movie={movie} index={index} allMovies={movies} onToggle={() => void markWatched(movie)} onEdit={() => setEditingMovie(movie)} />)}</div>}
          </section>}

          {view === 'plan' && <section className="section-block">
            <div className="section-head"><div><span className="section-kicker">02 / THE ROAD BACK</span><h2>Pick your destination</h2></div><label className="select-wrap"><span className="sr-only">Target movie</span><select value={targetId} onChange={e => setTargetId(e.target.value)}>{movies.map(movie => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select><ChevronDown size={15} /></label></div>
            {!movies.length ? <EmptyState icon={<RotateCcw />} title="Add a movie to get started." copy="Once you have a destination, we’ll map the story that leads there." action={<button className="button-dark" onClick={() => { setView('movies'); setShowMovieForm(true); }}><Plus size={16} /> Add a movie</button>} /> : plan && <>
              <div className="plan-summary"><div className="plan-stat"><span>STORY SO FAR</span><b>{plan.totalCount} <small>movies</small></b></div><div className="plan-divider" /><div className="plan-stat"><span>ALREADY WATCHED</span><b>{plan.watchedCount}<small> / {plan.totalCount}</small></b></div><div className="plan-divider" /><div className="plan-stat"><span>STILL AHEAD</span><b>{formatDuration(plan.unwatchedRuntime)}</b></div><div className="plan-progress"><div style={{ width: `${plan.totalCount ? Math.round(plan.watchedCount / plan.totalCount * 100) : 0}%` }} /></div></div>
              {plan.movies.length ? <div className="timeline">{plan.movies.map((movie, index) => <MovieRow key={movie.id} movie={movie} index={index} allMovies={movies} onToggle={() => void markWatched(movie)} compact />)}<div className="timeline-target"><div className="timeline-dot target-dot"><Popcorn size={15} /></div><div className="target-card"><span>THE DESTINATION</span><h3>{plan.target.title}</h3></div><div className="target-end">FINALE <ArrowRight size={14} /></div></div></div> : <EmptyState icon={<Check />} title="No homework before this one." copy={`${plan.target.title} is a fine place to jump in.`} />}
            </>}
          </section>}

          {view === 'booking' && <section className="section-block">
            <div className="section-head"><div><span className="section-kicker">03 / THE GROUP PLAN</span><h2>Make room for the crew</h2></div><button className="button-outline" onClick={() => setShowCinemaForm(true)}><Plus size={16} /> Add a cinema</button></div>
            <div className="booking-layout"><form className="booking-form" onSubmit={getQuote}><div className="form-intro"><div className="form-icon"><Armchair size={21} /></div><div><span>OPENING NIGHT / SEAT PLANNER</span><p>Bundles only. Nobody gets left in the lobby.</p></div></div><label className="field-label">YOUR CINEMA</label><div className="select-field"><select value={cinemaId} onChange={e => { setCinemaId(e.target.value); setQuote(null); }} required><option value="" disabled>Choose a cinema</option>{cinemas.map(cinema => <option key={cinema.id} value={cinema.id}>{cinema.name} · bundles of {cinema.bundleSizes.join(', ')}</option>)}</select><ChevronDown size={17} /></div><label className="field-label group-label">HOW MANY IN YOUR CREW?</label><div className="number-field"><input aria-label="Group size" type="number" min="1" max="10000" value={groupSize} onChange={e => setGroupSize(e.target.value)} required /><span>PEOPLE</span></div><button className="button-coral" disabled={!cinemas.length}><Ticket size={17} /> Find my bundles <ArrowRight size={16} /></button>{!cinemas.length && <p className="helper-copy">Add a cinema first so we know what bundles it sells.</p>}</form>
              <div className="quote-panel">{quote ? quote.possible ? <><span className="section-kicker">YOUR SEAT MATH</span><div className="quote-number">{quote.bundleCount}<small> bundles</small></div><p className="quote-caption">Exactly {groupSize} seats. Not one spare.</p><div className="bundle-list">{Object.entries(quote.bundles ?? {}).sort((a,b) => Number(b[0])-Number(a[0])).map(([size,count]) => <div className="bundle-row" key={size}><span className="seat-token"><Armchair size={15} /> {size}</span><span className="bundle-times">× {count}</span><span className="bundle-sum">{Number(size)*count} seats</span></div>)}</div></> : <div className="impossible"><div className="impossible-icon"><X size={19} /></div><span className="section-kicker">NO EXACT MATCH</span><h3>Those seats don’t<br />add up just yet.</h3><p>{cinemas.find(c => String(c.id) === cinemaId)?.name ?? 'This cinema'} doesn’t have a bundle combination for {groupSize} people. Try a different group size or cinema.</p></div> : <div className="quote-empty"><div className="orbit"><div className="orbit-center"><Ticket size={23} /></div><span className="orbit-dot one" /><span className="orbit-dot two" /><span className="orbit-dot three" /></div><span className="section-kicker">YOUR SEATS, SORTED</span><h3>The right bundle<br />is out there.</h3><p>Tell us your crew size and we’ll find the neatest fit.</p><div className="quote-footer">OPENING NIGHT <span>✳</span> DOOMSDAY</div></div>}</div>
            </div>
          </section>}
        </>}
      </div>
      <footer className="page-footer"><span>YOUR MARVEL REWATCH, ON YOUR TERMS.</span><span>MADE FOR THE NIGHT THAT MATTERS <span className="footer-star">✳</span></span></footer>
    </main>

    {showMovieForm && <Dialog title="Add to the collection" onClose={() => setShowMovieForm(false)}><MovieForm movies={movies} onSave={addMovie} onCancel={() => setShowMovieForm(false)} /></Dialog>}
    {editingMovie && <Dialog title="Edit what comes first" onClose={() => setEditingMovie(null)}><PrerequisiteForm movie={editingMovie} movies={movies} onSave={savePrerequisites} onCancel={() => setEditingMovie(null)} /></Dialog>}
    {showCinemaForm && <Dialog title="Add a cinema" onClose={() => setShowCinemaForm(false)}><CinemaForm onSave={addCinema} onCancel={() => setShowCinemaForm(false)} /></Dialog>}
  </div>;
}

function MovieRow({ movie, index, allMovies, onToggle, onEdit, compact = false }: { movie: Movie; index: number; allMovies: Movie[]; onToggle: () => void; onEdit?: () => void; compact?: boolean }) {
  const prereqs = movie.prerequisites.map(id => allMovies.find(item => item.id === Number(id))?.title).filter(Boolean);
  return <article className={`movie-row ${compact ? 'compact' : ''} ${movie.watched ? 'is-watched' : ''}`}><span className="row-index">{String(index + 1).padStart(2, '0')}</span><div className="movie-poster"><Film size={17} strokeWidth={1.6} /><span>{String(movie.releaseYear).slice(-2)}</span></div><div className="movie-info"><h3>{movie.title}</h3><div className="movie-meta"><span>{movie.releaseYear}</span><i /> <span>{formatDuration(movie.runtime)}</span>{prereqs.length > 0 && <><i /><span className="prereq-text">AFTER {prereqs.join(' · ')}</span></>}</div></div>{onEdit && <button className="edit-movie-button" onClick={onEdit} aria-label={`Edit prerequisites for ${movie.title}`} title="Edit prerequisites"><Pencil size={13} /></button>}<button className={`watched-button ${movie.watched ? 'checked' : ''}`} onClick={onToggle} aria-label={movie.watched ? `Mark ${movie.title} unwatched` : `Mark ${movie.title} watched`} title={movie.watched ? 'Watched — click to undo' : 'Mark as watched'}>{movie.watched ? <Check size={14} /> : null}</button><span className="watched-label">{movie.watched ? 'WATCHED' : 'TO WATCH'}</span></article>;
}

function EmptyState({ icon, title, copy, action }: { icon: ReactNode; title: string; copy: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{copy}</p>{action}</div>; }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><span className="section-kicker">A QUICK ADDITION</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>{children}</section></div>; }
function MovieForm({ movies, onSave, onCancel }: { movies: Movie[]; onSave: (data: { title: string; releaseYear: number; runtime: number; prerequisites: number[] }) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(''); const [year, setYear] = useState(''); const [runtime, setRuntime] = useState(''); const [prerequisites, setPrerequisites] = useState<number[]>([]); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setSaving(true); setError(''); try { await onSave({ title, releaseYear: Number(year), runtime: Number(runtime), prerequisites }); } catch (err) { setError(err instanceof Error ? err.message : 'Could not save movie.'); } finally { setSaving(false); } };
  return <form className="modal-form" onSubmit={submit}><label>Movie title<input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Guardians of the Galaxy" required maxLength={180} /></label><div className="form-pair"><label>Release year<input type="number" min="1888" max="3000" value={year} onChange={e => setYear(e.target.value)} placeholder="2014" required /></label><label>Runtime <small>MIN</small><input type="number" min="1" max="300" value={runtime} onChange={e => setRuntime(e.target.value)} placeholder="121" required /></label></div><label>Watch these first <small>OPTIONAL</small><div className="prereq-picker">{movies.length ? movies.map(movie => <button type="button" key={movie.id} className={prerequisites.includes(movie.id) ? 'picked' : ''} onClick={() => setPrerequisites(items => items.includes(movie.id) ? items.filter(id => id !== movie.id) : [...items, movie.id])}><span className="picker-check">{prerequisites.includes(movie.id) ? <Check size={12} /> : null}</span>{movie.title}</button>) : <span className="muted-copy">Your first movie has no prerequisites.</span>}</div></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="button-outline" onClick={onCancel}>Cancel</button><button className="button-dark" disabled={saving}>{saving ? 'Saving…' : 'Add movie'} <ArrowRight size={15} /></button></div></form>;
}
function CinemaForm({ onSave, onCancel }: { onSave: (data: { name: string; bundleSizes: number[] }) => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(''); const [sizes, setSizes] = useState('2, 4'); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); const bundleSizes = sizes.split(',').map(value => Number(value.trim())); if (bundleSizes.some(value => !Number.isInteger(value))) { setError('Enter bundle sizes separated by commas, like 2, 4, 6.'); return; } setSaving(true); setError(''); try { await onSave({ name, bundleSizes }); } catch (err) { setError(err instanceof Error ? err.message : 'Could not save cinema.'); } finally { setSaving(false); } };
  return <form className="modal-form" onSubmit={submit}><label>Cinema name<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The Grand, Hall 4" required maxLength={120} /></label><label>Bundle sizes <small>SEPARATE WITH COMMAS · 1–500</small><input value={sizes} onChange={e => setSizes(e.target.value)} placeholder="2, 4, 6" required /></label><p className="helper-copy">Add between one and ten different seat bundle sizes.</p>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="button-outline" onClick={onCancel}>Cancel</button><button className="button-dark" disabled={saving}>{saving ? 'Saving…' : 'Add cinema'} <ArrowRight size={15} /></button></div></form>;
}

function PrerequisiteForm({ movie, movies, onSave, onCancel }: { movie: Movie; movies: Movie[]; onSave: (movie: Movie, prerequisites: number[]) => Promise<void>; onCancel: () => void }) {
  const [prerequisites, setPrerequisites] = useState<number[]>(movie.prerequisites.map(Number)); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(''); try { await onSave(movie, prerequisites); } catch (err) { setError(err instanceof Error ? err.message : 'Could not update prerequisites.'); } finally { setSaving(false); } };
  return <form className="modal-form" onSubmit={submit}><p className="edit-context">Set the movies that should come before <b>{movie.title}</b>.</p><label>Watch these first <small>OPTIONAL</small><div className="prereq-picker">{movies.filter(item => item.id !== movie.id).map(item => <button type="button" key={item.id} className={prerequisites.includes(item.id) ? 'picked' : ''} onClick={() => setPrerequisites(items => items.includes(item.id) ? items.filter(id => id !== item.id) : [...items, item.id])}><span className="picker-check">{prerequisites.includes(item.id) ? <Check size={12} /> : null}</span>{item.title}</button>)}</div></label>{error && <p className="form-error">{error}</p>}<div className="modal-actions"><button type="button" className="button-outline" onClick={onCancel}>Cancel</button><button className="button-dark" disabled={saving}>{saving ? 'Saving…' : 'Save prerequisites'} <ArrowRight size={15} /></button></div></form>;
}
