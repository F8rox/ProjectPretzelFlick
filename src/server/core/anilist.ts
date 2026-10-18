const QUERY = `query {
  Page(perPage: 5) {
    airingSchedules(notYetAired: true, sort: TIME) {
      airingAt
      episode
      media { id title { romaji english } }
    }
  }
}`;

export type Airing = {
  airingAt: number;
  episode: number;
  media: { id: number; title: { romaji: string; english: string | null } };
};

// shortcut: fixture stands in while graphql.anilist.co awaits Devvit domain approval; set false once approved.
const USE_FIXTURE = true;

const FIXTURE: Airing[] = [
  {
    airingAt: Math.floor(Date.now() / 1000) + 3600,
    episode: 3,
    media: { id: 0, title: { romaji: 'Test Show', english: 'Test Show' } },
  },
];

export const nextAiring = async (): Promise<Airing[]> => {
  if (USE_FIXTURE) return FIXTURE;
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = (await res.json()) as { data: { Page: { airingSchedules: Airing[] } } };
  return json.data.Page.airingSchedules;
};
