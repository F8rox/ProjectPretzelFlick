export const keys = {
  config: 'config',
  tracked: 'tracked',
  history: 'history',
  posted: (mediaId: number, episode: number) => `posted:${mediaId}:${episode}`,
  season: (mediaId: number, season: number) => `series:${mediaId}:season:${season}:episodes`,
  schedule: (mediaId: number, episode: number) => `schedule:${mediaId}:${episode}`,
  rating: (mediaId: number, episode: number) => `rating:${mediaId}:${episode}`,
};
