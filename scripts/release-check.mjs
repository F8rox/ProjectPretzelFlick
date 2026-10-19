// Blocks `npm run launch` (publish) while dev-only settings are still on. `deploy` (private upload) is not blocked.
// Usage: node scripts/release-check.mjs [path to config.ts]
import { readFileSync } from 'node:fs';

const configPath = process.argv[2] ?? 'src/server/core/config.ts';
const config = readFileSync(configPath, 'utf8');
const problems = [];

if (/fixtureOnDevSubreddit:\s*true/.test(config)) {
  problems.push('config.fixtureOnDevSubreddit is true: the app would still use fake AniList data on the dev subreddit.');
}

if (problems.length) {
  console.error(`Release check failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('Release check passed.');
