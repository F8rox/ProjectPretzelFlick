import type { Stream } from './anilist.ts';

export type PostedThread = { id: string; permalink: string };

export type PostJobData = { mediaId: number; episode: number; airingAt: number; title: string; streams: Stream[] };

export type EarlierLink = { episode: number; permalink: string };

/** Everything the core needs from Reddit. The Devvit-backed version is in `routes/poster.ts`. */
export type Poster = {
  submit(title: string, text: string): Promise<PostedThread>;
  /** An interactive post whose `fallbackText` is what old Reddit and third-party apps show. */
  submitInteractive(title: string, fallbackText: string): Promise<PostedThread>;
  findByTitle(title: string): Promise<PostedThread | undefined>;
  getBody(postId: string): Promise<string>;
  editBody(postId: string, text: string): Promise<void>;
};
