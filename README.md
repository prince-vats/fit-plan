# Hostel Fit Plan

A personal, mobile-first diet + workout plan and long-term progress log, built around the IITGN hostel mess menu.
Pure veg, no rice, no tea/coffee, plant protein, no-cook extras. Pitch-black UI.

Live: https://prince-vats.github.io/fit-plan/

- **Plan**: any date, week by week. Each day has a **Food** tab (meals with tick boxes, kcal/protein meters, daily check-in) and a **Workout** tab (exercise photos, sets to tick, kg log with "last time", auto rest timer, step-by-step form guide).
- **Daily check-in**: weight, waist (Mondays), steps, sleep, water, energy, hunger, off-plan food, notes.
- **Progress**: 7-day average weight, trend chart, week-by-week and month-by-month tables, strength progress, automatic weekly adjust rule, month-end review.
- **Shopping**: monthly stock + weekly fresh list (ticks reset automatically) + no-cook recipes.
- **Guide**: targets (recalculated from current weight), the mess-plate rule, the adjust rule, hair-fall notes.

All records are saved in the browser's `localStorage`, and each day stores a frozen snapshot so later plan changes never rewrite history.

## Sync across devices (free, private)

Optional: Progress → **Sync across devices** saves the data as `fit-plan-data.json` in a **private** GitHub repo (e.g. `prince-vats/fit-data`) through the GitHub API. No server needed.

1. Create a private repo `fit-data` (tick "Add a README file").
2. Create a [fine-grained token](https://github.com/settings/personal-access-tokens/new): *Only select repositories → fit-data*, *Repository permissions → Contents: Read and write*.
3. Paste the token in the app on each device and tap Connect.

The app pulls when opened, pushes ~15 s after changes (at most about once a minute) and immediately when you leave the app. If two devices edit at once, the copies are merged without losing entries. Every sync is a commit, so the repo history is a full version history. The token stays on the device and is never exported; the app refuses to sync into a public repo.

## Monthly routine

1. **Last date of the month**: Progress → *Month-end review* → fill measurements, tick photos, write a few lines → **Export review file**.
2. Send the exported `fit-plan-backup-YYYY-MM-DD.json` **and the new month's mess menu** to Claude.
3. Claude reviews the month and adds `assets/plans/YYYY-MM.js` (a Mon–Sun template, since the mess menu repeats weekly), adds its `<script>` tag in `index.html`, and updates `TARGETS` / `PROFILE` in `assets/data.js` if needed.
4. Push, and the phone picks up the new plan automatically.

Until a new month's plan is added, the latest plan keeps running and the app shows a reminder.

## Files

| Path | What |
| --- | --- |
| `assets/data.js` | Exercise library, workout blocks, shopping list, recipes, `TARGETS`, `PROFILE` |
| `assets/plans/YYYY-MM.js` | One monthly Mon–Sun meal + workout template (`PLANS.push({...})`). Never reorder items in a past plan: ticks are saved by position |
| `assets/app.js` | The app (routing, rendering, saving, progress maths, export/import) |
| `assets/styles.css` | Pitch-black theme, orange accent |
| `sw.js` | Network-first service worker (offline in the gym). Bump `CACHE` when shipping changes |

## Publish changes

```bash
git add .
git commit -m "Plan for <month>"
git push
```

GitHub Pages redeploys in about a minute.

## Credits

Exercise photos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain / Unlicense).
