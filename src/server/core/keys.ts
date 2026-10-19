export const keys = {
  config: 'config',
  tracked: 'tracked',
  history: 'history',
  posted: (mediaId: number, episode: number) => `posted:${mediaId}:${episode}`,
  episodes: (mediaId: number) => `episodes:${mediaId}`,
  schedule: 'schedule',
  scheduleField: (mediaId: number, episode: number) => `${mediaId}:${episode}`,
  rating: (mediaId: number, episode: number) => `rating:${mediaId}:${episode}`,
};
