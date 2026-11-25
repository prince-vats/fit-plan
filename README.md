# Hostel Fit Plan

A personal, mobile-first diet + workout plan (25–30 Nov 2026) built around the hostel mess menu.
Pure veg, no rice, no tea/coffee, plant protein, no-cook extras. Pitch-black UI.

- **Plan**: each day has a **Food** tab (meals with tick boxes, kcal/protein meters, water + weight check-in) and a **Workout** tab (exercise photos, sets to tick, kg log, auto rest timer, step-by-step form guide).
- **Shopping**: one-trip list + no-cook recipes.
- **Guide**: targets, the mess-plate rule, the weekly adjust rule, hair-fall notes.
- **Progress**: weight/waist trend, day-by-day table, backup export/import.

Ticks and logs are saved in the browser's `localStorage`. No server, no account, private to the device.

## Host on GitHub Pages

```bash
git init
git add .
git commit -m "Hostel Fit Plan"
git branch -M main
git remote add origin https://github.com/prince-vats/fit-plan.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save**.
After ~1 minute the site is live at `https://prince-vats.github.io/fit-plan/`.

On your phone, open it in Chrome → ⋮ menu → **Add to Home screen** so it opens like an app, and works offline in the gym.

## Edit the plan

Everything (meals, exercises, shopping) lives in [`assets/data.js`](assets/data.js).

## Credits

Exercise photos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain / Unlicense).
