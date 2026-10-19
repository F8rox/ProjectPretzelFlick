export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Parses JSON that came out of Redis or the scheduler. Anything that is not an object is rejected. */
export const parseJsonRecord = (text: string): Record<string, unknown> | undefined => {
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Accepts https links only and normalizes them through URL, so spaces, parentheses, and angle brackets
 * in third-party data cannot break out of a markdown link.
 */
export const safeHttpsUrl = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.href.replace(/\(/g, '%28').replace(/\)/g, '%29') : undefined;
  } catch {
    return undefined;
  }
};
