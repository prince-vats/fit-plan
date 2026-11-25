# Hostel Fit Plan

A personal, mobile-first diet + workout plan and long-term progress log, built around the IITGN hostel mess menu.
Pure veg, no rice, no tea/coffee, plant protein, no-cook extras. Pitch-black UI.

Live: https://prince-vats.github.io/fit-plan/

- **Plan**: any date, week by week. Each day has a **Food** tab (meals with tick boxes, kcal/protein meters, daily check-in) and a **Workout** tab (exercise photos, sets to tick, kg log with "last time", auto rest timer, step-by-step form guide).
- **Daily check-in**: weight, waist (Mondays), steps, sleep, water, energy, hunger, off-plan food, notes.
- **Progress**: 7-day average weight, trend chart, week-by-week and month-by-month tables, strength progress, automatic weekly adjust rule, month-end review.
- **Shopping**: monthly stock + weekly fresh list (ticks reset automatically) + no-cook recipes.
- **Guide**: targets (recalculated from current weight), the mess-plate rule, the adjust rule, hair-fall notes.

All records are saved in the browser's `localStorage` on the phone. No server, no account.
Each day also stores a frozen snapshot, so later plan changes never rewrite history.

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
