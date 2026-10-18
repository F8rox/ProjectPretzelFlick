# Design

PretzelFlick has almost no UI of its own in Phase 1. Its main output is a Reddit text post, so "design" is mostly the thread format. Phase 2 adds one web view, the Season Hub.

## Thread Format (Phase 1)

Threads are plain Reddit markdown text posts, so they work on old Reddit, new Reddit, and third-party apps. The format is one template per content type, never freeform generation.

**Title:** `{Show title} - Episode {N} discussion`. English title if AniList has one, otherwise romaji. The title never contains plot, character names beyond the show title, or the episode's own title.

**Body, in this order:**

1. `*{Show title}, episode {N}*`
2. Air time in UTC and the local-time note: "Aired at {UTC time}."
3. Reminder: "Please do not discuss plot points not yet seen or skipped in the show. Use Reddit's spoiler formatting in comments for anything beyond this episode."
4. `**Streams**`: the official links AniList gives (series-level). If none: `*None listed.*`
5. `**Show information**`: AniList link and any other official links AniList lists.
6. `**Previous discussion threads**`: a markdown table `Episode | Link` for the 50-link window. If there are none: `*None yet.*`
7. After the next episode posts, one line is added at the top: `**Next episode:** [Episode {N+1}]({permalink})`.

Rules:

- Official links only. Never link or embed unauthorized media.
- Every link comes from AniList data. Nothing is invented.
- Times use UTC with a plain statement. Never claim precision beyond AniList's `airingAt`.
- Skipped weeks are explained in the activity history, not by posting filler threads.

## Season Hub (Phase 2)

An interactive web view post, one per show per season.

- Layout: header with show and season, a countdown to the next episode, a list of episodes with air time and a link to each thread, a one-tap rating (1 to 5) per aired episode, and a season score chart.
- The chart shows only aired episodes, with the vote count beside each point. The average is hidden below the minimum vote count.
- Theme follows Reddit's light and dark mode through Tailwind tokens. No hardcoded colors.

### Tokens

Defined as CSS variables in `src/client/index.css` and mapped through Tailwind. Components use token classes only.

| Role            | CSS Variable        | Note                         |
| --------------- | ------------------- | ---------------------------- |
| Background      | `--bg-base`         | follows Reddit theme         |
| Surface         | `--bg-surface`      | cards and chart area         |
| Border          | `--border-default`  |                              |
| Primary text    | `--text-primary`    |                              |
| Muted text      | `--text-muted`      | air times and vote counts    |
| Accent          | `--accent-primary`  | rating buttons, chart line   |
| Error           | `--state-error`     | failures                     |

### Components

- `StatusBadge`: one component for every status (aired, upcoming, delayed).
- `EpisodeRow`, `RatingBar`, `SeasonChart` (hand-rolled SVG, no chart library), `EmptyState`.

### Accessibility

- Every rating button has an `aria-label` ("Rate episode 3: 4 out of 5") and works from the keyboard.
- The chart has a text table alternative with the same numbers.
- Color is never the only signal.

### Performance

- The hub is a custom post. Keep the first load small: no heavy dependencies, SVG only.
- The plain text threads are the source of truth. If the hub is broken or unavailable, nothing in Phase 1 depends on it.
