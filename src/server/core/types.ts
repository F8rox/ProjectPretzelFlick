export type PostedThread = { id: string; permalink: string };

export type EarlierLink = { episode: number; permalink: string };

/** Everything the core needs from Reddit. The Devvit-backed version is in `routes/poster.ts`. */
export type Poster = {
  submit(title: string, text: string): Promise<PostedThread>;
  findByTitle(title: string): Promise<PostedThread | undefined>;
  getBody(postId: string): Promise<string>;
  editBody(postId: string, text: string): Promise<void>;
};
