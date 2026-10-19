import { context, reddit } from '@devvit/web/server';
import { config } from '../core/config';
import type { Poster } from '../core/post';

const fullUrl = (permalink: string) => `https://www.reddit.com${permalink}`;

/** The Devvit-backed Poster. Posts as the app account in the subreddit this install belongs to. */
export const poster: Poster = {
  submit: async (title, text) => {
    const post = await reddit.submitPost({ subredditName: context.subredditName, title, text });
    return { id: post.id, permalink: fullUrl(post.permalink) };
  },
  // Only the app's own posts count, so another user's identical title cannot block an episode.
  findByTitle: async (title) => {
    const app = await reddit.getAppUser();
    const recent = await reddit
      .getNewPosts({ subredditName: context.subredditName, limit: config.recoveryScanLimit })
      .get(config.recoveryScanLimit);
    const post = recent.find((p) => p.title === title && p.authorName === app?.username);
    return post && { id: post.id, permalink: fullUrl(post.permalink) };
  },
};
