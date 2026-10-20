import './thread.css';
import { navigateTo } from '@devvit/web/client';
import { StrictMode, useEffect, useState, type MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import type { RatingSummary, ThreadView } from '../shared/thread-view';

const SCORES = [1, 2, 3, 4, 5];

const request = async (path: string, init?: RequestInit) => {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => undefined); // our own server's JSON, so it is trusted as typed
  if (!res.ok) {
    const message = typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : undefined;
    throw new Error(typeof message === 'string' ? message : `Request failed (${res.status})`);
  }
  return body;
};

const Link = ({ url, children }: { url: string; children: string }) => (
  <a
    href={url}
    onClick={(e: MouseEvent) => {
      e.preventDefault();
      navigateTo(url);
    }}
  >
    {children}
  </a>
);

const scoreText = (r: RatingSummary) => {
  if (r.count === 0) return 'No votes yet';
  const votes = `${r.count} vote${r.count === 1 ? '' : 's'}`;
  return r.average === null ? `${votes} (average shows after ${r.minVotes})` : `${r.average.toFixed(1)} / 5 from ${votes}`;
};

const Thread = () => {
  const [view, setView] = useState<ThreadView>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    request('/api/thread').then(
      (body) => setView(body),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    );
  }, []);

  const vote = (score: number) =>
    request('/api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score }) }).then(
      (rating) => view && setView({ ...view, rating }),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    );

  if (!view) return <p className="card muted">{error ?? 'Loading...'}</p>;
  const { rating } = view;
  return (
    <main className="card">
      <p className="meta">
        Episode {view.episode} · Aired {new Date(view.airingAt * 1000).toLocaleString()}
      </p>
      <p className="reminder">Please do not discuss plot points not yet seen or skipped in the show. Use spoiler formatting in comments for anything beyond this episode.</p>
      <div className="rate" role="group" aria-label="Rate this episode">
        {SCORES.map((n) => (
          <button key={n} aria-label={`Rate ${n} out of 5`} aria-pressed={rating.myScore === n} onClick={() => void vote(n)}>
            {n}
          </button>
        ))}
        <span className="muted" aria-live="polite">
          {scoreText(rating)}
        </span>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="links">
        {view.streams.map((s) => (
          <Link key={s.url} url={s.url}>{s.site}</Link>
        ))}
        <Link url={view.showUrl}>AniList</Link>
        {view.next && <Link url={view.next.permalink}>{`Next: episode ${view.next.episode}`}</Link>}
      </div>
      {view.earlier.length > 0 && (
        <details>
          <summary>Previous episodes</summary>
          <ul>
            {view.earlier.map((e) => (
              <li key={e.episode}>
                <Link url={e.permalink}>{`Episode ${e.episode}`}</Link>
                {e.average !== null && <span className="muted">{` · ${e.average.toFixed(1)}`}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
};

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><Thread /></StrictMode>);
