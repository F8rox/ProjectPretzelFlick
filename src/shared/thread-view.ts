/** `average` is null until the thread has enough votes. The count is always shown. */
export type RatingSummary = { count: number; average: number | null; myScore: number | null; minVotes: number };

/** Everything the interactive card shows, read live from Redis on each load. */
export type ThreadView = {
  title: string;
  episode: number;
  airingAt: number;
  showUrl: string;
  streams: { site: string; url: string }[];
  rating: RatingSummary;
  /** Earlier episodes in the link window, oldest first. `average` is only filled for the most recent few. */
  earlier: { episode: number; permalink: string; average: number | null }[];
  next: { episode: number; permalink: string } | null;
};
