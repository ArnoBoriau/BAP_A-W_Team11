# Notion → website: everything Claude Code needs

Goal: the Astro site pulls its content from the team's Notion databases at build time
(custom content loaders in `src/content.config.ts`), so the team keeps working in Notion
and the website updates itself. Keep the current pages and design; only the data source changes.

All databases live under **BAP → Behind the scenes → Databases** in Amber's workspace.

## Databases and their properties (read from Notion on 30 Oct 2026)

### 1. Logbook → `logbook` collection
| Notion property | Type | Site field |
| --- | --- | --- |
| Title | title | `title` |
| Author | person (multiple) | `authors` (map Notion users to `arno`, `amber`, `emelie`) |
| Cover | URL / file | `cover` (download at build time, Notion file URLs expire after 1 h) |
| Date | date (can be a range, e.g. AI log 27 Oct → 17 Dec) | `date` = start |
| Pillar | select: UX, Design, Dev, General | `pillar` (lowercase) |
| Summary | text | `description` |
| Tags | multi-select: Research, Process, Feedback client, Expert talk, AI, Decision, Result, Planning | `tags` (kebab-case) |
| page body | blocks | Markdown body (images, callouts, toggles, tables, inline databases) |

Views in Notion: Default, Design, UX, Dev, Feedback & experts, AI log. The site already has the same filters.
The page icon (emoji) is shown before the title in Notion; optional on the site.

### 2. AI uses (inline database inside the "AI log" logbook page)
| Notion property | Type |
| --- | --- |
| Used for | title |
| Date | date |
| Who | person |
| Tool | select (ChatGPT, Claude, …) |
| Pillar | select |

Today this is a Markdown table in `src/content/logbook/2026-10-27-ai-log.md`. With Notion it should be
its own collection rendered on the AI log post. Check the table for extra columns to the right.

### 3. Time log → `time` collection
| Notion property | Type | Site field |
| --- | --- | --- |
| What did you do | title | `task` |
| Hours | number | `hours` |
| Date | date (the day the work was done) | `date` |
| Logged on | created time | `date` when *Date* is empty |
| Person | person | `member` |
| Pillar | select: UX, Design, Dev, General | `pillar` |

### 4. Planning → `milestones` + `tasks` collections (one Notion database)
| Notion property | Type | Notes |
| --- | --- | --- |
| Task | title | |
| Done ✓ | formula | ignore |
| Due | date (sometimes with time, e.g. 10 Nov 22:30) | |
| Group | status. To-do: Not started, Deadlines, Meetings · In progress: In progress, To review · Complete: Done | `Deadlines` → milestone type `deadline`, `Meetings` → `event`; everything else is a task (todo / doing / done) |
| Notes | text | show under the task |
| Owner | person (multiple) | `owners` |
| Phase | select: Week 1 · Pitch deck, Vacation · Research, Weeks 2–3 · Concept, Weeks 4–5 · Prototype, Weeks 6–7 · Final, Ongoing | replaces the free-text `week` field |
| Pillar | select | add to tasks |

The site currently only has Arno's tasks (copied from the "Mine" view). The full database also has
Amber's and Emelie's tasks (Field visit, Scoping canvas, Ethics and inclusion check, Problem statements,
Tone of voice, Find the hook, Sketches of wall layout, …), so pulling from Notion fixes that.
The jury (17 Dec) has a 🏆 icon in Notion; keep it type `jury`.

### 5. Team → `team` collection
| Notion property | Type | Site field |
| --- | --- | --- |
| Name | title | `name` |
| Kind of person | select: Morning person, Evening person | `chronotype` |
| Main pillar | select | `pillar` |
| Responsibilities | text (comma separated) | `responsibilities` (split on commas) |
| Role | text | `role` |

### 6. Pillar covers
Small database with a cover image per pillar, used as default card covers in Notion. Optional.

### Not a database
The "Our 7 weeks" table and the client contacts on the BAP page are plain tables. Keep them in
`src/data/planning.json` and `src/consts.ts`.

## What the team still has to do (Claude can't do these)

1. **Create a Notion integration.** Arno is a *guest* in Amber's workspace, and guests can't create
   integrations, so **Amber** must do it: notion.so/profile/integrations → New integration (internal,
   read content only). Then on the BAP page: ••• → Connections → add the integration, so it can see
   all databases below it.
2. **Put the token in `.env`** (never commit it): `NOTION_TOKEN=secret_…`, plus the database IDs
   (the 32-character part of each database URL): `NOTION_LOGBOOK_DB`, `NOTION_TIME_DB`,
   `NOTION_PLANNING_DB`, `NOTION_TEAM_DB`, `NOTION_AI_DB`. Add the same values as secrets on the host.
3. **Pick a host** (Vercel, Netlify or GitHub Pages) and set up a scheduled rebuild (e.g. hourly)
   plus a deploy hook for publishing straight away.

## Suggestions for the implementation

- Use `@notionhq/client` with a custom Astro loader per database; convert page bodies with
  `notion-to-md` (or similar) and run them through Astro's Markdown pipeline.
- Download every Notion image (covers and images in page bodies) into the build output, because the
  signed URLs expire.
- Keep the current zod schemas so the pages don't need changes; map Notion values in the loader.
- Map Notion people to team slugs by name (Arno Boriau → `arno`, Amber → `amber`, Emelie → `emelie`).
- If `NOTION_TOKEN` is missing, fall back to the local Markdown/JSON files so `npm run dev` still works.
- `/admin` (Sveltia CMS) becomes unnecessary for anything that comes from Notion; remove it or
  limit it to what stays local.
