// SPIKE (Unit 08): throwaway page to learn what a custom post can do. Deleted or rewritten in Unit 09.
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

type State = { count: number; average: number | null; myScore: number | null; seesUser: boolean };

const call = async (path: string, init?: RequestInit): Promise<State> => {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const Spike = () => {
  const [state, setState] = useState<State>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    call('/api/spike/state').then(setState, (e: unknown) => setError(String(e)));
  }, []);

  const rate = (score: number) =>
    call('/api/spike/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score }) }).then(setState, (e: unknown) =>
      setError(String(e)),
    );

  return (
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h3>Rate this episode (spike)</h3>
      <div>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} aria-label={`Rate ${n} out of 5`} onClick={() => void rate(n)} style={{ marginRight: 8, fontSize: 18 }}>
            {n}
          </button>
        ))}
      </div>
      {state && (
        <p>
          Votes: {state.count}. Average: {state.average?.toFixed(2) ?? 'none yet'}. Your vote: {state.myScore ?? 'none'}. Server sees a logged-in user: {String(state.seesUser)}.
        </p>
      )}
      {error && <p role="alert">Error: {error}</p>}
    </div>
  );
};

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><Spike /></StrictMode>);
