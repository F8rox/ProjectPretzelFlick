import { config } from './config.ts';
import type { Stream } from './anilist.ts';

const isBlockedHost = (url: string) => {
  const host = new URL(url).hostname;
  return config.blockedStreamHosts.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
};

/** The streaming links a thread shows: official sources only, so YouTube is dropped. */
export const visibleStreams = (streams: Stream[]): Stream[] => streams.filter((s) => !isBlockedHost(s.url));
