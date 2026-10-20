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

// Same sections, in the same order, as the plain-text thread (see renderBody in core/post.ts). Voting comes last.
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
      {view.next && (
        <p>
          <strong>Next episode:</strong> <Link url={view.next.permalink}>{`Episode ${view.next.episode}`}</Link>
        </p>
      )}
      <p>
        <em>{view.title}</em>, episode {view.episode}
      </p>
      <p>Aired at {new Date(view.airingAt * 1000).toUTCString()}.</p>
      <p>
        <strong>Reminder:</strong> Please do not discuss plot points not yet seen or skipped in the show. Use Reddit&apos;s spoiler formatting in comments for anything beyond this episode.
      </p>
      <hr />
      <h3>Streams</h3>
      {view.streams.length ? (
        <ul>
          {view.streams.map((s) => (
            <li key={s.url}>
              <Link url={s.url}>{s.site}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          <em>None listed.</em>
        </p>
      )}
      <h3>Show information</h3>
      <ul>
        <li>
          <Link url={view.showUrl}>AniList</Link>
        </li>
      </ul>
      <h3>Previous discussion threads</h3>
      {view.earlier.length ? (
        <table>
          <thead>
            <tr>
              <th>Episode</th>
              <th>Link</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {view.earlier.map((e) => (
              <tr key={e.episode}>
                <td>{e.episode}</td>
                <td>
                  <Link url={e.permalink}>Link</Link>
                </td>
                <td>{e.average === null ? '-' : e.average.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>
          <em>None yet.</em>
        </p>
      )}
      <hr />
      <h3>Rate this episode</h3>
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
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </main>
  );
};

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><Thread /></StrictMode>);
