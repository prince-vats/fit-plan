(function () {
  'use strict';

  /* ============================================================
     STATE — saved in this browser (localStorage), survives refresh
     ============================================================ */
  const KEY = 'hostelFitPlan:v2';
  const blank = () => ({ c: {}, s: {}, kg: {}, d: {}, ci: {}, shop: {}, ui: {} });
  let S = load();
  let storageOK = true;

  function load() {
    try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch (e) { return blank(); }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; }
    catch (e) { storageOK = false; }
  }

  /* ---------- backup file: only files exported by this site are accepted ---------- */
  const BACKUP_APP = 'hostel-fit-plan';
  const BACKUP_VER = 2;
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const KEY_RE = /^[\w|:.-]{1,80}$/;
  const num = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && isFinite(v) && +v >= 0 && +v < 100000;

  // Returns a clean state, or throws with a human-readable reason.
  function readBackup(txt) {
    let file;
    try { file = JSON.parse(txt); } catch (e) { throw new Error('This is not a JSON file.'); }
    if (!isObj(file) || file.app !== BACKUP_APP) throw new Error('This file was not exported from Hostel Fit Plan.');
    if (file.version !== BACKUP_VER) throw new Error(`This backup is from a different version of the site (v${String(file.version)}).`);
    const src = file.data;
    if (!isObj(src)) throw new Error('The backup file is damaged (no data inside).');
    for (const k of ['c', 's', 'kg', 'd', 'ci', 'shop', 'ui']) {
      if (src[k] !== undefined && !isObj(src[k])) throw new Error(`The backup file is damaged (bad "${k}" section).`);
    }
    const out = blank();
    const ticks = (from, to) => { for (const [k, v] of Object.entries(from || {})) if (KEY_RE.test(k) && v) to[k] = 1; };
    ticks(src.c, out.c); ticks(src.s, out.s); ticks(src.shop, out.shop);
    for (const [k, v] of Object.entries(src.kg || {})) if (KEY_RE.test(k) && num(v)) out.kg[k] = String(+v);
    for (const [k, v] of Object.entries(src.d || {})) if (dayById(k) && (v === 'A' || v === 'B')) out.d[k] = v;
    for (const [k, v] of Object.entries(src.ci || {})) {
      if (!dayById(k) || !isObj(v)) continue;
      const row = {};
      for (const f of ['weight', 'waist', 'steps', 'sleep', 'water']) if (num(v[f])) row[f] = +v[f];
      out.ci[k] = row;
    }
    const ui = src.ui || {};
    if (ui.sub === 'food' || ui.sub === 'workout') out.ui.sub = ui.sub;
    if (ui.seenHow) out.ui.seenHow = 1;
    if (ui.wantWake) out.ui.wantWake = true;
    return { state: out, exported: typeof file.exported === 'string' ? file.exported : '' };
  }

  function importBackup(f) {
    if (!/\.json$/i.test(f.name)) { alert('Please choose the .json backup file exported from this site.'); return; }
    if (f.size > 1024 * 1024) { alert('That file is too big to be a Hostel Fit Plan backup.'); return; }
    f.text().then((txt) => {
      let b;
      try { b = readBackup(txt); } catch (err) { alert('Import cancelled: ' + err.message); return; }
      const when = b.exported ? new Date(b.exported) : null;
      const label = when && !isNaN(when) ? when.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown date';
      const n = Object.keys(b.state.c).length + Object.keys(b.state.s).length;
      if (!confirm(`Restore backup from ${label}?\n(${n} ticks, ${Object.keys(b.state.ci).length} check-in days)\n\nThis replaces everything currently saved on this phone.`)) return;
      S = b.state; save(); route(); alert('Backup restored.');
    }).catch(() => alert('Could not read that file. Try choosing it again.'));
  }

  /* ============================================================
     HELPERS
     ============================================================ */
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const app = $('#app');
  const fmt = (n) => Math.round(n).toLocaleString('en-IN');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
  const dayById = (id) => DAYS.find((d) => d.id === id);

  function localISO(d = new Date()) {
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }
  const TODAY = localISO();
  function defaultDay() {
    if (dayById(TODAY)) return TODAY;
    return TODAY < DAYS[0].id ? DAYS[0].id : DAYS[DAYS.length - 1].id;
  }

  const I = {
    food: '<svg viewBox="0 0 24 24"><path d="M3 11h18a9 9 0 0 1-18 0Z"/><path d="M7 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M17 7c0-1.5 1-1.5 1-3"/></svg>',
    gym: '<svg viewBox="0 0 24 24"><path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/></svg>',
    walk: '<svg viewBox="0 0 24 24"><circle cx="13" cy="4" r="2"/><path d="m9 21 2.5-6.5L14 17v4M10.5 9 8 12l-3-1M10.5 9l3.5-1 2.5 3.5 3 1M10.5 9l1 5.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7Z"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7Z"/></svg>',
    noimg: '<svg viewBox="0 0 24 24"><path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/></svg>',
  };

  /* ---------------- food maths ---------------- */
  const dinnerChoice = (day) => S.d[day.id] || 'A';
  const mealItems = (day, meal) => (meal.dinner ? meal[dinnerChoice(day)].items : meal.items || []);
  const itemKey = (day, meal, i) => `${day.id}|${meal.id}${meal.dinner ? dinnerChoice(day) : ''}|${i}`;

  function foodTotals(day) {
    let pk = 0, pp = 0, ek = 0, ep = 0, n = 0, done = 0;
    day.meals.forEach((meal) => mealItems(day, meal).forEach((it, i) => {
      pk += it.k; pp += it.p; n++;
      if (S.c[itemKey(day, meal, i)]) { ek += it.k; ep += it.p; done++; }
    }));
    return { pk, pp, ek, ep, n, done };
  }

  /* ---------------- workout maths ---------------- */
  const setKey = (day, bi, ei, k) => `${day.id}|${bi}|${ei}|${k}`;
  const kgKey = (day, x) => `${day.id}|${x}`;

  function workoutTotals(day) {
    let total = 0, done = 0;
    day.workout.blocks.forEach((b, bi) => b.ex.forEach((e, ei) => {
      for (let k = 0; k < e.s; k++) { total++; if (S.s[setKey(day, bi, ei, k)]) done++; }
    }));
    return { total, done };
  }

  function lastKg(day, x) {
    const i = DAYS.indexOf(day);
    for (let j = i - 1; j >= 0; j--) {
      const v = S.kg[kgKey(DAYS[j], x)];
      if (v) return { v, d: DAYS[j] };
    }
    return null;
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  function parse() {
    const p = location.hash.replace(/^#\/?/, '').split('/');
    if (dayById(p[0])) return { view: 'day', id: p[0], sub: p[1] === 'workout' || p[1] === 'food' ? p[1] : S.ui.sub || 'food' };
    if (['shop', 'guide', 'progress'].includes(p[0])) return { view: p[0] };
    return { view: 'day', id: defaultDay(), sub: S.ui.sub || 'food' };
  }

  function route() {
    const r = parse();
    $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.tab === (r.view === 'day' ? 'plan' : r.view)));
    if (r.view === 'day') { S.ui.sub = r.sub; save(); renderDay(dayById(r.id), r.sub); }
    else if (r.view === 'shop') renderShop();
    else if (r.view === 'guide') renderGuide();
    else renderProgress();
  }
  window.addEventListener('hashchange', () => { route(); window.scrollTo({ top: 0 }); });

  function rerenderKeepScroll() { const y = window.scrollY; route(); window.scrollTo({ top: y }); }

  /* ============================================================
     DAY VIEW (shell)
     ============================================================ */
  const TYPE = { strength: 'Strength day', cardio: 'Cardio day', recovery: 'Recovery day' };

  function renderDay(day, sub) {
    const f = foodTotals(day);
    const isRec = day.type === 'recovery';
    app.innerHTML = `
      ${dayStrip(day)}
      <section class="hero t-${day.type}">
        <div class="hero-meta">
          <span class="pill">${TYPE[day.type]}</span>
          <span>${day.dow}, ${day.date}${day.id === TODAY ? ' · <b class="today-tag">Today</b>' : ''}</span>
        </div>
        <h1>${esc(day.title)}</h1>
        <p class="hero-sub">${esc(day.sub)}</p>
        <p class="hero-note">${esc(day.note)}</p>
      </section>

      <div class="subtabs" role="tablist">
        <a role="tab" href="#/${day.id}/food" class="${sub === 'food' ? 'on' : ''}" aria-selected="${sub === 'food'}">
          ${I.food}<span>Food<small>${fmt(f.pk)} kcal · ${f.pp} g protein</small></span>
        </a>
        <a role="tab" href="#/${day.id}/workout" class="${sub === 'workout' ? 'on' : ''}" aria-selected="${sub === 'workout'}">
          ${isRec ? I.walk : I.gym}<span>${isRec ? 'Activity' : 'Workout'}<small>${day.workout.mins} min · ${esc(day.workout.where)}</small></span>
        </a>
      </div>

      <div id="pane">${sub === 'workout' ? workoutPane(day) : foodPane(day)}</div>
      ${dayNav(day, sub)}`;
  }

  function dayStrip(active) {
    return `<nav class="daystrip" aria-label="Choose day">${DAYS.map((d) => {
      const f = foodTotals(d), w = workoutTotals(d);
      const p = pct(f.done + w.done, f.n + w.total);
      return `<a href="#/${d.id}" class="daychip ${d.id === active.id ? 'active' : ''} ${d.id === TODAY ? 'is-today' : ''}" aria-label="${d.dow} ${d.date}, ${p}% done">
        <span class="dc-dow">${d.dow}</span><span class="dc-date">${d.date.split(' ')[0]}</span>
        <span class="dc-bar"><i style="width:${p}%"></i></span></a>`;
    }).join('')}</nav>`;
  }

  function dayNav(day, sub) {
    const i = DAYS.indexOf(day), prev = DAYS[i - 1], next = DAYS[i + 1];
    return `<nav class="daynav">
      ${prev ? `<a href="#/${prev.id}/${sub}">← ${prev.dow} ${prev.date}</a>` : '<span></span>'}
      ${next ? `<a href="#/${next.id}/${sub}">${next.dow} ${next.date} →</a>` : '<span></span>'}
    </nav>`;
  }

  /* ============================================================
     FOOD PANE
     ============================================================ */
  function foodPane(day) {
    const rows = [];
    rows.push(staticRow('7:00 am', I.sun, '<b>Wake up</b> · drink 500 ml water first. Weigh yourself after the toilet, before eating.'));
    day.meals.forEach((m) => {
      if (m.id === 'q') rows.push(workoutLinkRow(day));
      rows.push(mealCard(day, m));
    });
    rows.push(staticRow('11:00 pm', I.moon, '<b>Lights off by 11:30</b> · 7–8 h sleep. Hungry late? Cucumber, water, or 200 ml soy milk.'));
    return `
      <section class="card summary" id="foodSummary">${foodSummary(day)}</section>
      ${checkinCard(day)}
      <section class="timeline">${rows.join('')}</section>`;
  }

  function foodSummary(day) {
    const t = foodTotals(day);
    return `
      <div class="meters">
        <div class="meter">
          <div class="m-label">Calories</div>
          <div class="m-val">${fmt(t.ek)}<small> / ${fmt(t.pk)} kcal</small></div>
          <div class="bar"><i style="width:${pct(t.ek, t.pk)}%"></i></div>
        </div>
        <div class="meter">
          <div class="m-label">Protein</div>
          <div class="m-val">${fmt(t.ep)}<small> / ${t.pp} g</small></div>
          <div class="bar b-protein"><i style="width:${pct(t.ep, t.pp)}%"></i></div>
        </div>
      </div>
      <p class="muted small">Tick each item as you eat it. Target every day: <b>${fmt(TARGETS.kcalLow)}–${fmt(TARGETS.kcalHigh)} kcal</b> and <b>${TARGETS.proteinLow}+ g protein</b>.</p>`;
  }

  function staticRow(time, icon, html) {
    return `<div class="tl-row"><div class="tl-time">${time}</div><div class="tl-dot">${icon}</div><div class="tl-card slim">${html}</div></div>`;
  }

  function workoutLinkRow(day) {
    const w = workoutTotals(day);
    const isRec = day.type === 'recovery';
    return `<div class="tl-row"><div class="tl-time">${esc(day.workout.time.split('–')[0].trim())}</div><div class="tl-dot accent">${isRec ? I.walk : I.gym}</div>
      <a class="tl-card slim link-card" href="#/${day.id}/workout">
        <span><b>${esc(day.workout.title)}</b> · ${day.workout.mins} min · ${esc(day.workout.where)}<br><span class="muted small">${pct(w.done, w.total)}% done · open the ${isRec ? 'activity' : 'workout'} tab</span></span>
        ${I.arrow}
      </a></div>`;
  }

  const SRC = { mess: 'Mess', own: 'Own', mix: 'Mess + own' };

  function mealCard(day, meal) {
    let items, skip, tip, toggle = '', note = '';
    if (meal.dinner) {
      const c = dinnerChoice(day), opt = meal[c];
      items = opt.items; skip = opt.skip; tip = opt.tip;
      toggle = `<div class="seg" role="radiogroup" aria-label="Dinner option">
        ${['A', 'B'].map((v) => `<button role="radio" aria-checked="${c === v}" data-act="dinner" data-day="${day.id}" data-v="${v}" class="${c === v ? 'on' : ''}">${v} · ${esc(meal[v].label)}</button>`).join('')}
      </div>`;
      if (opt.note) note = `<p class="opt-note">${esc(opt.note)}</p>`;
    } else { items = meal.items; skip = meal.skip; tip = meal.tip; }
    const mk = items.reduce((a, b) => a + b.k, 0), mp = items.reduce((a, b) => a + b.p, 0);
    return `
      <div class="tl-row"><div class="tl-time">${meal.time}</div><div class="tl-dot">${I.food}</div>
        <article class="tl-card">
          <header class="meal-head">
            <div><h3>${meal.slot}</h3><span class="where">${I.pin}${esc(meal.where)}</span></div>
            <div class="meal-mac"><b>${mk}</b> kcal<br><b>${mp}</b> g protein</div>
          </header>
          ${toggle}${note}
          <div class="items">${items.map((it, i) => foodItem(day, meal, it, i)).join('')}</div>
          ${skip && skip.length ? `<div class="skip"><span class="skip-label">Skip</span>${skip.map((s) => `<span class="chip-x">${esc(s)}</span>`).join('')}</div>` : ''}
          ${tip ? `<p class="tip">${esc(tip)}</p>` : ''}
        </article>
      </div>`;
  }

  function foodItem(day, meal, it, i) {
    const k = itemKey(day, meal, i), on = !!S.c[k];
    return `<label class="item ${on ? 'done' : ''}">
      <input type="checkbox" data-act="food" data-k="${k}" ${on ? 'checked' : ''}>
      <span class="tick" aria-hidden="true"></span>
      <span class="item-main">
        <span class="item-name">${esc(it.n)} <span class="src s-${it.src}">${SRC[it.src]}</span></span>
        <span class="item-qty">${esc(it.q)}</span>
      </span>
      <span class="item-mac"><b>${it.k}</b> kcal<br><b>${it.p}</b> g</span>
    </label>`;
  }

  function checkinCard(day) {
    const ci = S.ci[day.id] || {};
    const water = ci.water || 0;
    let glasses = '';
    for (let i = 1; i <= TARGETS.waterGlasses; i++) glasses += `<button class="glass ${i <= water ? 'full' : ''}" data-act="water" data-n="${i}" aria-label="${i} glasses of water"><svg viewBox="0 0 24 24"><path d="M5 3h14l-1.6 17.2A2 2 0 0 1 15.4 22H8.6a2 2 0 0 1-2-1.8Z" class="g-out"/><path d="M6.3 9.5h11.4l-1.1 10.6a1 1 0 0 1-1 .9H8.4a1 1 0 0 1-1-.9Z" class="g-in"/></svg></button>`;
    const field = (key, label, unit, step) => `<label class="field"><span>${label}</span><span class="inwrap"><input type="number" inputmode="decimal" step="${step}" min="0" data-ci="${key}" data-day="${day.id}" value="${ci[key] ?? ''}" placeholder="–">${unit ? `<em>${unit}</em>` : ''}</span></label>`;
    return `
      <section class="card checkin">
        <div class="card-head"><h2>Daily check-in</h2><span class="muted small">auto-saved</span></div>
        <div class="water">
          <div class="water-head"><span>Water · tap a glass (250 ml each)</span><b id="waterTxt">${waterText(water)}</b></div>
          <div class="glasses">${glasses}</div>
        </div>
        <div class="ci-grid">
          ${field('weight', 'Morning weight', 'kg', '0.1')}
          ${field('waist', 'Waist at navel', 'cm', '0.5')}
          ${field('steps', 'Steps', '', '100')}
          ${field('sleep', 'Sleep', 'h', '0.5')}
        </div>
      </section>`;
  }
  const waterText = (n) => `${+(n * 0.25).toFixed(2)} L / 3 L`;

  /* ============================================================
     WORKOUT PANE
     ============================================================ */
  function workoutPane(day) {
    const w = day.workout;
    let n = 0;
    const blocks = w.blocks.map((b, bi) => `
      <section class="wblock">
        <div class="wblock-head"><h2>${esc(b.name)}</h2><span>${b.mins} min</span></div>
        ${b.circuit ? '<p class="circuit-note">Do all 5 moves back to back = 1 round. Rest 60 s, repeat 3 rounds. Tick one bubble per round on each move.</p>' : ''}
        ${b.ex.map((e, ei) => exCard(day, b, bi, e, ei, ++n)).join('')}
      </section>`).join('');

    return `
      <section class="card summary" id="woSummary">${woSummary(day)}</section>
      ${day.type === 'strength' ? `
      <details class="card howto" ${S.ui.seenHow ? '' : 'open'} data-act="seenhow">
        <summary><b>New to the gym? Read this once</b></summary>
        <ul class="bullets">
          <li><b>Pick the weight:</b> choose one where the last 2–3 reps feel hard but your form stays clean. If you could do 5+ more reps, go heavier next set.</li>
          <li><b>Tick each set</b> when you finish it. A rest timer starts automatically at the bottom of the screen.</li>
          <li><b>Log the kg</b> you used. Next session the app shows your last weight so you can add a little.</li>
          <li><b>Tap “How to do it”</b> for step-by-step form. The photos switch between the start and finish positions.</li>
          <li><b>Breathe:</b> breathe in on the easy part, out as you push or pull. Never hold your breath for long.</li>
          <li><b>Stop</b> if you feel sharp joint pain, chest pain or dizziness. Muscle burn and soreness are normal.</li>
        </ul>
      </details>` : ''}
      ${blocks}
      <p class="muted small center">All done? Have your protein shake within 30 minutes.</p>`;
  }

  function woSummary(day) {
    const w = day.workout, t = workoutTotals(day);
    const wl = 'wakeLock' in navigator;
    return `
      <div class="wo-sum">
        <div class="meter">
          <div class="m-label">${day.type === 'recovery' ? 'Activity' : 'Workout'} progress</div>
          <div class="m-val">${t.done}<small> / ${t.total} sets done</small></div>
          <div class="bar b-workout"><i style="width:${pct(t.done, t.total)}%"></i></div>
        </div>
        <div class="wo-facts">
          <span>${I.clock}${esc(w.time)}</span>
          <span>${I.pin}${esc(w.where)}</span>
        </div>
      </div>
      ${wl ? `<button class="btn ghost small-btn" data-act="wakelock" aria-pressed="${!!wakeLock}">${I.bolt}${wakeLock ? 'Screen will stay on' : 'Keep screen on during workout'}</button>` : ''}`;
  }

  function exCard(day, b, bi, e, ei, n) {
    const x = EX[e.x];
    const kk = kgKey(day, e.x);
    const last = e.kg ? lastKg(day, e.x) : null;
    let bubbles = '';
    for (let k = 0; k < e.s; k++) {
      const key = setKey(day, bi, ei, k), on = !!S.s[key];
      const label = e.s === 1 ? (on ? 'Done ✓' : 'Mark done') : (b.circuit || /round|interval|jog/i.test(x.name) ? `R${k + 1}` : `Set ${k + 1}`);
      bubbles += `<button class="set ${on ? 'on' : ''}" data-act="set" data-k="${key}" data-rest="${e.rest || 0}" data-single="${e.s === 1 ? 1 : 0}" aria-pressed="${on}">${label}</button>`;
    }
    const allDone = Array.from({ length: e.s }, (_, k) => S.s[setKey(day, bi, ei, k)]).every(Boolean);
    const shot = x.img
      ? `<div class="shot" role="img" aria-label="${esc(x.name)}: start and finish positions">
          <img src="assets/img/${x.img}-0.jpg" alt="" loading="lazy" decoding="async">
          <img class="f2" src="assets/img/${x.img}-1.jpg" alt="" loading="lazy" decoding="async">
          <span class="lab l1">1 · Start</span><span class="lab l2">2 · Finish</span>
        </div>`
      : `<div class="shot noimg">${I.noimg}<span>Follow the steps below</span></div>`;
    const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(x.name.replace(/\s*\(.*?\)/g, '') + ' proper form for beginners')}`;
    return `
      <article class="ex ${allDone ? 'complete' : ''}" id="ex-${bi}-${ei}">
        ${shot}
        <div class="ex-body">
          <div class="ex-top">
            <span class="ex-num">${n}</span>
            <div class="ex-titles"><h3>${esc(x.name)}</h3><p class="muscles">${esc(x.muscles)}</p></div>
          </div>
          <div class="rx">
            <span class="rx-chip main">${e.s > 1 ? `<b>${e.s}</b> ${b.circuit || /round|interval|jog/i.test(x.name) ? 'rounds' : 'sets'} × ` : ''}<b>${esc(e.r)}</b></span>
            ${e.rest ? `<span class="rx-chip">${I.clock}Rest ${e.rest >= 60 ? (e.rest / 60 === Math.floor(e.rest / 60) ? e.rest / 60 + ' min' : e.rest + ' s') : e.rest + ' s'}</span>` : ''}
            ${e.ss ? '<span class="rx-chip ss">Superset ↓ no rest</span>' : ''}
          </div>
          ${e.kg ? `<div class="logrow">
              <label class="inwrap kg"><input type="number" inputmode="decimal" step="0.5" min="0" data-act="kg" data-k="${kk}" value="${S.kg[kk] ?? ''}" placeholder="–" aria-label="Weight used for ${esc(x.name)} in kg"><em>kg used</em></label>
              <span class="last">${last ? `Last time (${last.d.dow}): <b>${esc(last.v)} kg</b>` : x.start ? `Start with: <b>${esc(x.start)}</b>` : ''}</span>
            </div>` : ''}
          <div class="sets ${e.s === 1 ? 'single' : ''}">${bubbles}</div>
          <details class="how">
            <summary>How to do it</summary>
            <ol class="steps">${x.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
            ${x.mistakes && x.mistakes.length ? `<div class="avoid"><b>Avoid</b><ul>${x.mistakes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
            ${x.tip ? `<p class="tip">${esc(x.tip)}</p>` : ''}
            <a class="yt" href="${yt}" target="_blank" rel="noopener">${I.play}Watch a form video on YouTube</a>
          </details>
        </div>
      </article>`;
  }

  function refreshSummaries() {
    const r = parse();
    if (r.view !== 'day') return;
    const day = dayById(r.id);
    const fs = $('#foodSummary'); if (fs) fs.innerHTML = foodSummary(day);
    const ws = $('#woSummary'); if (ws) ws.innerHTML = woSummary(day);
    const strip = $('.daystrip'); if (strip) strip.outerHTML = dayStrip(day);
  }

  /* ============================================================
     REST TIMER
     ============================================================ */
  const timerEl = $('#timer');
  let tEnd = 0, tTotal = 0, tInt = null, audioCtx = null;

  function startTimer(sec) {
    tTotal = sec; tEnd = Date.now() + sec * 1000;
    timerEl.hidden = false; timerEl.classList.remove('go');
    tick();
    clearInterval(tInt); tInt = setInterval(tick, 250);
    try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ }
  }
  function tick() {
    const left = Math.max(0, Math.ceil((tEnd - Date.now()) / 1000));
    $('#tTime').textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    $('#tBar').style.width = `${100 - (left / tTotal) * 100}%`;
    if (left <= 0) {
      clearInterval(tInt);
      timerEl.classList.add('go');
      $('#tLabel').textContent = 'Go! Next set';
      $('#tTime').textContent = '0:00';
      try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (e) { /* ignore */ }
      beep();
      setTimeout(() => { if (timerEl.classList.contains('go')) stopTimer(); }, 5000);
    } else { $('#tLabel').textContent = 'Rest'; }
  }
  function stopTimer() { clearInterval(tInt); timerEl.hidden = true; timerEl.classList.remove('go'); }
  function beep() {
    if (!audioCtx) return;
    try {
      [0, 0.22].forEach((d) => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.25, audioCtx.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d + 0.18);
        o.start(audioCtx.currentTime + d); o.stop(audioCtx.currentTime + d + 0.2);
      });
    } catch (e) { /* ignore */ }
  }
  timerEl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t === 'skip') stopTimer();
    else { tEnd += (+b.dataset.t) * 1000; tTotal = Math.max(tTotal, Math.ceil((tEnd - Date.now()) / 1000)); timerEl.classList.remove('go'); clearInterval(tInt); tInt = setInterval(tick, 250); tick(); }
  });

  /* ---------------- wake lock ---------------- */
  let wakeLock = null;
  async function toggleWake() {
    try {
      if (wakeLock) { await wakeLock.release(); wakeLock = null; }
      else { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; refreshSummaries(); }); }
    } catch (e) { wakeLock = null; }
    S.ui.wantWake = !!wakeLock; save();
    refreshSummaries();
  }

  /* ============================================================
     SHOPPING
     ============================================================ */
  function renderShop() {
    let idx = 0;
    const total = SHOPPING.reduce((a, g) => a + g.items.length, 0);
    const got = Object.keys(S.shop).length;
    app.innerHTML = `
      <section class="page-head">
        <h1>Shopping list</h1>
        <p>Everything is <b>no-cook</b>: mix, soak, or eat as-is. One trip covers all 6 days. The protein powder lasts ~2 weeks.</p>
        <div class="bar b-protein big"><i style="width:${pct(got, total)}%"></i></div>
        <p class="muted small">${got} of ${total} bought</p>
      </section>
      ${SHOPPING.map((g) => `
        <section class="card">
          <div class="card-head"><h2>${esc(g.group)}</h2></div>
          <div class="items">${g.items.map((it) => {
            const k = 'i' + (idx++), on = !!S.shop[k];
            return `<label class="item ${on ? 'done' : ''}">
              <input type="checkbox" data-act="shop" data-k="${k}" ${on ? 'checked' : ''}>
              <span class="tick" aria-hidden="true"></span>
              <span class="item-main"><span class="item-name">${esc(it.n)}</span><span class="item-qty">${esc(it.why)}</span></span>
              <span class="item-mac qty">${esc(it.q)}</span>
            </label>`;
          }).join('')}</div>
        </section>`).join('')}
      <section class="page-head"><h1>No-cook recipes</h1></section>
      <div class="recipes">${RECIPES.map((r) => `
        <article class="card recipe"><h3>${esc(r.n)}</h3><p>${esc(r.how)}</p>${r.mac ? `<span class="pill soft">${esc(r.mac)}</span>` : ''}</article>`).join('')}
      </div>`;
  }

  /* ============================================================
     GUIDE
     ============================================================ */
  function renderGuide() {
    app.innerHTML = `
      <section class="page-head">
        <h1>How this plan works</h1>
        <p>Built for: 27 y, male, 5′10″, ~100 kg, pure veg (no egg), no rice, no tea/coffee, IITGN hostel mess, 1.5–2 h of evening training.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Your numbers</h2></div>
        <div class="kv">
          <div><span>BMI</span><b>31.6</b><em>Goal: below 25, over the coming months</em></div>
          <div><span>Burn at rest (BMR)</span><b>~1,980 kcal</b><em>Mifflin-St Jeor equation</em></div>
          <div><span>Maintenance</span><b>~2,900–3,000 kcal</b><em>With evening training + walking around campus</em></div>
          <div><span>Your intake</span><b>2,000–2,200 kcal</b><em>≈ 800 kcal/day deficit → ~0.7 kg of fat lost per week</em></div>
          <div><span>Protein</span><b>120–140 g</b><em>≈ 1.5–1.8 g per kg of a ~78 kg goal weight. Protects muscle, keeps you full</em></div>
          <div><span>Water · Steps · Sleep</span><b>3 L+ · 9,000+ · 7–8 h</b><em>These three matter as much as the diet</em></div>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>What results to expect</h2></div>
        <ul class="bullets">
          <li><b>Week 1:</b> scale drops 1–2 kg. Mostly water from less salt and junk. That’s normal.</li>
          <li><b>After that:</b> 0.5–1 kg per week of real fat loss. That’s ~3–4 kg a month, and your waist shrinks visibly.</li>
          <li><b>Strength:</b> as a beginner you’ll get stronger almost every session for months, even while losing fat.</li>
          <li>Weight jumps ±1 kg day to day (water, salt, digestion). Judge by the <b>weekly average</b> and your <b>waist</b>, not one morning.</li>
        </ul>
      </section>

      <section class="card accent-card">
        <div class="card-head"><h2>Adjust rule (check every Monday)</h2></div>
        <ul class="bullets">
          <li><b>Losing 0.5–1 kg/week:</b> perfect. Change nothing.</li>
          <li><b>Losing less than 0.3 kg/week for 2 weeks:</b> use Dinner B (Hostel kit) on 3 more nights a week, and add 2,000 steps a day.</li>
          <li><b>Losing more than 1.2 kg/week after week 1,</b> or feeling weak or dizzy: add 1 chapati at lunch.</li>
        </ul>
        <p class="note">Calorie numbers for mess food are estimates. This rule corrects for that automatically using your real results.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Daily rhythm</h2></div>
        <ol class="rhythm">
          <li><b>7:00</b><span>Wake, 500 ml water, weigh in</span></li>
          <li><b>8:15</b><span>Breakfast at mess + protein milk (scoop 1)</span></li>
          <li><b>1:00</b><span>Lunch at mess: your biggest meal</span></li>
          <li><b>4:45</b><span>Pre-workout: sattu / chana / banana</span></li>
          <li><b>5:45</b><span>Gym: warm-up → strength → cardio → stretch</span></li>
          <li><b>7:35</b><span>Protein shake (scoop 2)</span></li>
          <li><b>8:30</b><span>Light dinner: mess plate (A) or Hostel kit (B)</span></li>
          <li><b>11:30</b><span>Lights off</span></li>
        </ol>
        <p class="note">Why not skip dinner fully? Your workout ends at 7:30 pm, so dinner is your recovery meal. Option B keeps your “shake + small items” habit but adds real protein and fibre.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>The mess plate rule</h2></div>
        <div class="plate">
          <svg viewBox="0 0 120 120" aria-hidden="true" class="plate-viz"><circle cx="60" cy="60" r="57" class="pl-rim"/><path d="M60 60 L60 6 A54 54 0 0 1 60 114 Z" class="pl-veg"/><path d="M60 60 L60 114 A54 54 0 0 1 6 60 Z" class="pl-pro"/><path d="M60 60 L6 60 A54 54 0 0 1 60 6 Z" class="pl-carb"/></svg>
          <ul class="legend">
            <li><i class="pl-veg"></i><span><b>½ plate: salad + sabzi.</b> Always take the salad, and eat it first.</span></li>
            <li><i class="pl-pro"></i><span><b>¼: protein.</b> Dal + legume curry (chole, rajma, kathod, soya) + curd or buttermilk.</span></li>
            <li><i class="pl-carb"></i><span><b>¼: carbs.</b> 2 chapati, ask for no ghee.</span></li>
          </ul>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Always skip at your mess</h2></div>
        <div class="skip big">${['Bread + butter + jam', 'Chocos / cornflakes', 'Boost / Bournvita / chocolate powder', 'Sugar in milk & oats', 'Samosa, pakoda, medu vada', 'Puri, bhature (1 max, weekly treat)', 'Fryums, ramakada, papad', 'Lemonade, crushes, shakes, lassi, shikanji', 'Ice cream, halwa, malpua, custard, sev boondi', 'Maggi, white sauce pasta', 'Sev toppings']
          .map((s) => `<span class="chip-x">${s}</span>`).join('')}</div>
        <p class="note">One planned treat a week keeps you sane. This week it’s Saturday’s single bhatura.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Workout rules</h2></div>
        <ul class="bullets">
          <li><b>Split:</b> Lower A → Upper A → Cardio/Core → Lower B → Recovery walk → Upper B. Every muscle gets trained twice a week with rest in between.</li>
          <li><b>Effort:</b> end each set with 2–3 reps left in the tank. On day 1, leave 3–4.</li>
          <li><b>Progression (from week 2):</b> when you hit the top of the rep range on every set, add 2.5 kg for upper body or 5 kg for lower body.</li>
          <li><b>Cardio:</b> incline walking and the elliptical are easy on your joints at 100 kg. Add more jogging as your weight drops.</li>
          <li><b>Steps:</b> 8,000–10,000 every day. Walk to the mess and take the stairs.</li>
        </ul>
      </section>

      <section class="card">
        <div class="card-head"><h2>Hair fall & protein</h2></div>
        <p>This plan uses pea + rice plant protein, which works perfectly well. For your information: research has not shown that whey causes hair loss in most people. The common, <b>fixable</b> causes are:</p>
        <ul class="bullets">
          <li>Low <b>vitamin B12</b> (very common in pure vegetarians)</li>
          <li>Low <b>iron/ferritin</b>, low <b>vitamin D</b>, thyroid issues</li>
          <li>Too little protein, <b>crash dieting</b>, stress, poor sleep</li>
          <li>Genetics (male-pattern hair loss)</li>
        </ul>
        <p><b>Do this week:</b> get a blood test at the health centre (<b>CBC, ferritin, B12, vitamin D, TSH</b>) and show the results to a doctor before taking any supplements. This plan’s moderate deficit plus 120 g+ protein is designed to avoid diet-related hair shedding.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>After 30 November</h2></div>
        <p>The mess menu repeats every week, so <b>run this same plan again</b> from Wednesday. Use Tuesday as an extra walk day. Each week: add a little weight or a couple of reps, raise the treadmill incline by 1%, and check the adjust rule on Monday.</p>
        <p class="muted small">Food values are estimates for typical mess portions. This is general fitness guidance, not medical advice. If you have a medical condition, check with a doctor first. Exercise photos: <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a> (public domain).</p>
      </section>`;
  }

  /* ============================================================
     PROGRESS
     ============================================================ */
  function renderProgress() {
    const rows = DAYS.map((d) => ({ d, ci: S.ci[d.id] || {}, f: foodTotals(d), w: workoutTotals(d) }));
    const weights = rows.filter((r) => r.ci.weight).map((r) => ({ id: r.d.id, v: +r.ci.weight }));
    const waists = rows.filter((r) => r.ci.waist).map((r) => +r.ci.waist);
    const first = weights[0], last = weights[weights.length - 1];
    const dW = weights.length > 1 ? last.v - first.v : null;
    const dWaist = waists.length > 1 ? waists[waists.length - 1] - waists[0] : null;
    const logged = rows.filter((r) => r.f.ep > 0);
    const avgP = logged.length ? logged.reduce((a, r) => a + r.f.ep, 0) / logged.length : null;
    const sessions = rows.filter((r) => r.w.total && r.w.done / r.w.total >= 0.8).length;
    const sign = (v) => (v > 0 ? '+' : '') + v.toFixed(1);

    app.innerHTML = `
      <section class="page-head"><h1>Progress</h1>
        <p>Your ticks, weights and check-ins are saved <b>in this browser on this phone</b>. They stay after refresh and after closing the app, and nobody else can see them.</p>
        ${storageOK ? '' : '<p class="warn">Saving is blocked in this browser (private/incognito mode?). Open the site in a normal tab.</p>'}
      </section>
      <section class="stat-grid">
        <div class="card stat"><span class="m-label">Weight change</span><b>${dW === null ? '–' : sign(dW)}<small> kg</small></b><span class="muted small">${first ? `start ${first.v} kg` : 'log morning weight'}</span></div>
        <div class="card stat"><span class="m-label">Waist change</span><b>${dWaist === null ? '–' : sign(dWaist)}<small> cm</small></b><span class="muted small">measure Wed & Mon</span></div>
        <div class="card stat"><span class="m-label">Avg protein</span><b>${avgP === null ? '–' : fmt(avgP)}<small> g</small></b><span class="muted small">target 120+ g</span></div>
        <div class="card stat"><span class="m-label">Sessions done</span><b>${sessions}<small> / ${DAYS.length}</small></b><span class="muted small">≥ 80% of sets ticked</span></div>
      </section>
      ${weights.length >= 2 ? `<section class="card"><div class="card-head"><h2>Morning weight</h2></div>${spark(weights)}</section>` : ''}
      <section class="card">
        <div class="card-head"><h2>Day by day</h2></div>
        <div class="table-wrap"><table class="ptable">
          <thead><tr><th>Day</th><th>Weight</th><th>Waist</th><th>Water</th><th>Steps</th><th>Sleep</th><th>Kcal</th><th>Protein</th><th>Workout</th></tr></thead>
          <tbody>${rows.map((r) => `<tr>
            <td><a href="#/${r.d.id}">${r.d.dow} ${r.d.date.split(' ')[0]}</a></td>
            <td>${r.ci.weight ? r.ci.weight : '–'}</td>
            <td>${r.ci.waist ? r.ci.waist : '–'}</td>
            <td>${r.ci.water ? +(r.ci.water * 0.25).toFixed(2) + ' L' : '–'}</td>
            <td>${r.ci.steps ? fmt(r.ci.steps) : '–'}</td>
            <td>${r.ci.sleep ? r.ci.sleep + ' h' : '–'}</td>
            <td>${r.f.ek ? fmt(r.f.ek) : '–'}</td>
            <td>${r.f.ep ? r.f.ep + ' g' : '–'}</td>
            <td><span class="mini-bar"><i style="width:${pct(r.w.done, r.w.total)}%"></i></span>${pct(r.w.done, r.w.total)}%</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Backup</h2></div>
        <p class="muted small">Your data lives only in this browser. Clearing browser data or switching phones erases it, so export a backup once in a while.</p>
        <p class="muted small" style="margin-top:8px"><b>Import</b> only accepts a <code>fit-plan-backup-….json</code> file exported from this site. It replaces what is on this phone now.</p>
        <div class="actions">
          <button class="btn" data-act="export">Export backup</button>
          <button class="btn ghost" data-act="pick-import">Import backup</button>
          <input type="file" accept=".json,application/json" data-act="import" id="importFile" hidden>
          <button class="btn danger" data-act="reset">Reset everything</button>
        </div>
      </section>`;
  }

  function spark(pts) {
    const W = 600, H = 170, P = 30;
    const vs = pts.map((p) => p.v);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
    const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, pts.length - 1);
    const y = (v) => P + ((hi - v) * (H - 2 * P - 14)) / (hi - lo);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Morning weight trend"><path d="${d}"/>${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="4.5"/><text x="${x(i)}" y="${y(p.v) - 11}" text-anchor="middle">${p.v}</text><text class="lbl" x="${x(i)}" y="${H - 6}" text-anchor="middle">${dayById(p.id).dow}</text>`).join('')}</svg>`;
  }

  /* ============================================================
     EVENTS
     ============================================================ */
  document.addEventListener('change', (e) => {
    const t = e.target, act = t.dataset.act;
    if (act === 'food' || act === 'shop') {
      const store = act === 'food' ? S.c : S.shop;
      if (t.checked) store[t.dataset.k] = 1; else delete store[t.dataset.k];
      t.closest('.item').classList.toggle('done', t.checked);
      save();
      if (act === 'food') refreshSummaries(); else rerenderKeepScroll();
    } else if (act === 'kg') {
      if (t.value === '') delete S.kg[t.dataset.k]; else S.kg[t.dataset.k] = t.value;
      save();
    } else if (t.dataset.ci) {
      const id = t.dataset.day;
      S.ci[id] = S.ci[id] || {};
      if (t.value === '') delete S.ci[id][t.dataset.ci]; else S.ci[id][t.dataset.ci] = +t.value;
      save();
    } else if (act === 'import') {
      const f = t.files && t.files[0];
      t.value = ''; // allow picking the same file again later
      if (f) importBackup(f);
    }
  });

  document.addEventListener('toggle', (e) => {
    if (e.target.dataset && e.target.dataset.act === 'seenhow' && !e.target.open) { S.ui.seenHow = 1; save(); }
  }, true);

  app.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'set') {
      const k = b.dataset.k;
      if (S.s[k]) delete S.s[k]; else S.s[k] = 1;
      const on = !!S.s[k];
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      if (b.dataset.single === '1') b.textContent = on ? 'Done ✓' : 'Mark done';
      const card = b.closest('.ex');
      card.classList.toggle('complete', $$('.set', card).every((x) => x.classList.contains('on')));
      save(); refreshSummaries();
      const rest = +b.dataset.rest;
      if (on && rest > 0) startTimer(rest);
    } else if (act === 'dinner') {
      S.d[b.dataset.day] = b.dataset.v; save(); rerenderKeepScroll();
    } else if (act === 'water') {
      const id = parse().id; S.ci[id] = S.ci[id] || {};
      const n = +b.dataset.n;
      S.ci[id].water = S.ci[id].water === n ? n - 1 : n;
      save();
      const w = S.ci[id].water;
      $$('.glass').forEach((g) => g.classList.toggle('full', +g.dataset.n <= w));
      $('#waterTxt').textContent = waterText(w);
    } else if (act === 'wakelock') {
      toggleWake();
    } else if (act === 'pick-import') {
      $('#importFile').click();
    } else if (act === 'export') {
      const file = { app: BACKUP_APP, version: BACKUP_VER, exported: new Date().toISOString(), data: S };
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `fit-plan-backup-${TODAY}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (act === 'reset') {
      if (confirm('Erase ALL ticks, weights and check-ins on this phone?')) { S = blank(); save(); route(); }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && S.ui.wantWake && !wakeLock && 'wakeLock' in navigator) toggleWake();
  });

  /* ---------------- offline support ---------------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  route();
})();
