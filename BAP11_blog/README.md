# BAP Team 11 × ARCHITECT@WORK

The complete overview of our bachelor project for the teachers: research, process, feedback, team roles, time tracking, planning and AI guidance.

| Requirement | Where to find it |
| --- | --- |
| Research documentation (text & visual) | Logbook · Research tag |
| Process of the result | Logbook · Process tag |
| Feedback reports | Logbook · Feedback & experts |
| Team roles: who does what | Team |
| Time tracking | Time tracking |
| Detailed planning | Planning |
| Guidance from AI | Logbook · AI tag |

## Live from Notion

The logbook, time log, planning and team come straight from our Notion databases (*BAP → Behind the scenes → Databases*). The site reads Notion **when someone opens a page**, so whatever the team changes in Notion shows up on the site without a rebuild:

- **With the webhook** (recommended): within a few seconds.
- **Without it:** within about a minute, when the cached page expires.

Each database switches to Notion as soon as it is set in `.env` (locally) or in the Vercel settings; anything left empty keeps using the local files below. The week overview and the client contacts always come from the local files.

### Connect

1. **Create an integration.** Amber (as workspace owner; guests can't): *notion.so/profile/integrations → New integration*, internal, *Read content* only. Copy the *Internal Integration Secret*.
2. **Give it access.** On the BAP page: `•••` → *Connections* → add the integration. It can then read every database below that page.
3. **Fill in `.env`.** Copy `.env.example` to `.env`, paste the secret and the link of each database (the link from the browser works, so does the 32-character id). `.env` is never committed.
4. **Check the mapping.** `npm run notion:inspect` lists every property per database, shows which ones the site uses and flags values it doesn't know. Fix anything yellow in `src/notion/config.ts`.
5. **Run it.** `npm run dev` now shows the Notion content; edit something in Notion and reload.

### Put it online (Vercel)

1. On [vercel.com](https://vercel.com), *Add New → Project* and import `ArnoBoriau/BAP_A-W_Team11`.
2. Set **Root Directory** to `BAP11_blog`. Vercel detects Astro; keep the other defaults.
3. Under *Environment Variables*, add `NOTION_TOKEN` and the four `NOTION_*_DB` values from your `.env`.
4. Deploy. Every push to `main` deploys again; Notion changes need no deploy.
5. Set `site` in `astro.config.mjs` to the Vercel URL.

### Instant updates (webhook)

1. In the integration settings, open *Webhooks* and subscribe `https://<your-site>/api/notion-webhook` to page and database events (created, content updated, properties updated, deleted).
2. Notion sends a verification token once. Find it in Vercel under *Logs* ("Notion webhook verification token: …"), paste it back in Notion to verify.
3. Add the same token as `NOTION_WEBHOOK_SECRET` in Vercel and redeploy. From then on, every change in Notion clears the cached pages right away. Calls without a valid signature are refused.

### How Notion maps onto the site

| Setting | Notion database | Properties the site reads |
| --- | --- | --- |
| `NOTION_LOGBOOK_DB` | Logbook, one page per post | *Title*, *Author*, *Cover*, *Date* (start of a range), *Pillar*, *Summary*, *Tags*, and the page content |
| `NOTION_TIME_DB` | Time log, one row per session | *What did you do*, *Hours*, *Date* (falls back to *Logged on*), *Person*, *Pillar* |
| `NOTION_PLANNING_DB` | Planning | *Task*, *Due*, *Group*, *Owner*, *Phase*, *Notes*, *Pillar* |
| `NOTION_TEAM_DB` | Team | *Name*, *Role*, *Main pillar*, *Responsibilities* (comma separated), *Kind of person* |

- **Planning is split by Group.** Rows in *Deadlines* become deadlines and rows in *Meetings* become events on the Planning page (a time on *Due* shows as the hour). A row with the 🏆 icon or "jury" in its name is the jury. Every other row is a task: *Not started* → not started, *In progress* and *To review* → in progress, *Done* → done.
- **Inline databases** inside a logbook page, like *AI uses* on the AI log, appear as a table in the post. Linked views of a database elsewhere can't be read through the API and show a short note instead.
- **Post links** end with a piece of the Notion page id, so a post keeps working after it's renamed; the old link redirects to the new one.
- **People** are matched to team members by full or first name (Arno Boriau → `arno`).
- **Pillars, tags, groups** are matched by name through the alias tables in `src/notion/config.ts`. Unknown values are left out and logged.
- **Images and files** uploaded to Notion are shown through `/notion/file/…`, which fetches a fresh link from Notion each time (Notion's own links expire after an hour).
- **Team order:** without an *Order* number property in Notion, team members are sorted by name, which also decides their colour in the charts.
- **Supported blocks:** text with formatting and links, headings, bulleted, numbered and to-do lists, quotes, callouts, toggles, code, tables, inline databases, images, files, bookmarks, dividers and columns.
- **If Notion is down**, the site keeps showing the last version it fetched.

### Who can edit

Once a database comes from Notion, whoever can edit it in Notion can change the site. The `/admin` editor and the local files are then ignored for that part.

## Local content and the `/admin` editor

Everything that doesn't come from Notion lives in the repository. Only people with **write access to the GitHub repository** can change content. Everyone else can only read the site.

### Option 1 — the editor at `/admin`

1. Open `https://<your-site>/admin/` (or `http://localhost:4321/admin/` locally).
2. Sign in with GitHub. Without an OAuth app, choose **Sign in with token** and paste a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) for `ArnoBoriau/BAP_A-W_Team11` with *Contents: read and write*.
3. Add, edit or delete logbook posts, team members, time sessions and planning (weeks, dates and tasks). Every save is a commit on `main`.

The editor is [Sveltia CMS](https://github.com/sveltia/sveltia-cms), configured in `public/admin/config.yml`.

To control who can edit, manage the collaborators of the repository on GitHub.

### Option 2 — edit the files directly

| Content | File(s) |
| --- | --- |
| Logbook posts | `src/content/logbook/*.md` |
| Team members | `src/content/team/*.md` |
| Time sessions | `src/data/time.json` |
| Planning (weeks, dates & tasks) | `src/data/planning.json` |
| Images | `src/assets/logbook/`, `src/assets/team/` |

A logbook entry looks like this:

```md
---
title: Client feedback on the concept
description: One or two sentences for the overview.
date: 2026-11-04
pillar: ux                # ux | design | dev | general
tags: [feedback-client]   # process | research | planning | feedback-client | expert-talk | ai
authors: [arno]           # file names in src/content/team: arno, amber, emelie
cover: ../../assets/logbook/my-image.jpg   # optional
draft: false              # true hides it on the live site
---

Markdown content…
```

The pillars, tags and other option lists are defined in `src/consts.ts` (keep `public/admin/config.yml` in sync when you change them).

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Build the site for Vercel |
| `npm run notion:inspect` | Show the Notion databases and how they map onto the site |
