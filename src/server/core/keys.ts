export const keys = {
  config: 'config',
  tracked: 'tracked',
  history: 'history',
  posted: (mediaId: number, episode: number) => `posted:${mediaId}:${episode}`,
  episodes: (mediaId: number) => `episodes:${mediaId}`,
  thread: (postId: string) => `thread:${postId}`,
  ratings: (postId: string) => `ratings:${postId}`,
  ratingStats: (postId: string) => `ratingstats:${postId}`,
  schedule: 'schedule',
  scheduleField: (mediaId: number, episode: number) => `${mediaId}:${episode}`,
};
