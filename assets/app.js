(function () {
  'use strict';

  /* ============================================================
     STATE — saved in this browser (localStorage), survives refresh
     c: food ticks · s: set ticks · kg: weight used · d: dinner A/B
     ci: daily check-in · days: frozen daily snapshot (for history)
     mo: month-end measurements · shop: shopping ticks · ui: prefs
     ============================================================ */
  const KEY = 'hostelFitPlan:v2';
  const SECTIONS = ['c', 's', 'kg', 'd', 'ci', 'days', 'mo', 'shop', 'ui'];
  const blank = () => ({ c: {}, s: {}, kg: {}, d: {}, ci: {}, days: {}, mo: {}, shop: {}, ui: {} });
  let storageOK = true;
  let persisted = null;
  let S = load();

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY)) || {};
      const out = blank();
      for (const k of SECTIONS) if (isObj(raw[k])) out[k] = raw[k];
      return out;
    } catch (e) { return blank(); }
  }
  // save(): your data changed → stored on this phone AND queued for cloud sync.
  // saveQuiet(): only view preferences changed (tab, collapsed card) → this phone only.
  function saveQuiet() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; }
    catch (e) { storageOK = false; }
  }
  function save() { saveQuiet(); markDirty(); }

  // Ask the browser not to auto-clear this site's storage (long-term records).
  try {
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then((p) => {
        persisted = p;
        if (!p && navigator.storage.persist) return navigator.storage.persist().then((r) => { persisted = r; });
      }).catch(() => {});
    }
  } catch (e) { /* ignore */ }

  /* ============================================================
     HELPERS
     ============================================================ */
  function isObj(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const app = $('#app');
  const fmt = (n) => Math.round(n).toLocaleString('en-IN');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
  const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(1);
  const dash = (v, f = (x) => x) => (v == null || v === '' ? '–' : f(v));

  /* ---------------- dates ---------------- */
  const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DOW_NAME = { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' };
  const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function localISO(d = new Date()) {
    const z = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }
  function parseISO(id) { const [y, m, d] = id.split('-').map(Number); return new Date(y, m - 1, d, 12); }
  const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && localISO(parseISO(s)) === s;
  const isMonth = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
  function addDays(id, n) { const d = parseISO(id); d.setDate(d.getDate() + n); return localISO(d); }
  const dayDiff = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
  const monthOf = (id) => id.slice(0, 7);
  const dowOf = (id) => DOW[parseISO(id).getDay()];
  const niceDate = (id) => `${+id.slice(8)} ${MON[+id.slice(5, 7) - 1]}`;
  const longDate = (id) => `${DOW_NAME[dowOf(id)]} ${niceDate(id)}`;
  const monthLabel = (ym) => `${MONTH[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
  const weekStart = (id) => addDays(id, -((parseISO(id).getDay() + 6) % 7));
  function nextMonth(ym) { let [y, m] = ym.split('-').map(Number); m++; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, '0')}`; }
  const lastOfMonth = (ym) => addDays(nextMonth(ym) + '-01', -1);
  function rangeLabel(a, b) {
    const ma = MON[+a.slice(5, 7) - 1], mb = MON[+b.slice(5, 7) - 1];
    return ma === mb ? `${+a.slice(8)} – ${+b.slice(8)} ${mb}` : `${+a.slice(8)} ${ma} – ${+b.slice(8)} ${mb}`;
  }

  const TODAY = localISO();

  /* ---------------- plans ---------------- */
  const PL = PLANS.slice().sort((a, b) => (a.from < b.from ? -1 : 1));
  const START = PL[0].from;
  const MAX = addDays(TODAY > START ? TODAY : START, 42);
  const REST = {
    type: 'recovery', title: 'Rest day', sub: 'Nothing planned for this day', note: '', meals: [],
    workout: { title: 'Rest', time: '', where: '', mins: 0, blocks: [] },
  };

  function planFor(id) {
    for (let i = PL.length - 1; i >= 0; i--) if (PL[i].from <= id) return PL[i];
    return null;
  }
  const dayCache = new Map();
  function dayFor(id) {
    if (!isDate(id) || id < START || id > MAX) return null;
    if (dayCache.has(id)) return dayCache.get(id);
    const plan = planFor(id), dow = dowOf(id);
    const tpl = plan.days.find((d) => d.dow === dow) || REST;
    const day = Object.assign({}, tpl, { id, dow, dowName: DOW_NAME[dow], date: niceDate(id), plan });
    dayCache.set(id, day);
    return day;
  }
  const currentPlan = () => planFor(TODAY >= START ? TODAY : START);

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
    flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
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

  // Most recent earlier date on which this exercise had a weight logged.
  function lastKg(day, x) {
    let best = null;
    for (const [k, v] of Object.entries(S.kg)) {
      const [d, ex] = k.split('|');
      if (ex === x && d < day.id && v !== '' && (!best || d > best.d)) best = { d, v };
    }
    return best;
  }

  /* ---------------- daily snapshot (frozen history) ----------------
     Saved every time something changes on a day, so later plan edits
     never rewrite what you actually ate and trained. */
  function snap(id) {
    const day = dayFor(id); if (!day) return;
    const f = foodTotals(day), w = workoutTotals(day);
    if (!f.done && !w.done) { delete S.days[id]; return; }
    const meals = {};
    day.meals.forEach((m) => {
      const its = mealItems(day, m);
      meals[m.id] = [its.filter((_, i) => S.c[itemKey(day, m, i)]).length, its.length];
    });
    const rec = {
      plan: day.plan.id, type: day.type, wo: day.workout.title,
      kcal: [f.ek, f.pk], prot: [f.ep, f.pp], items: [f.done, f.n], sets: [w.done, w.total], meals,
    };
    if (day.meals.some((m) => m.dinner)) rec.dinner = dinnerChoice(day);
    S.days[id] = rec;
  }
  function ensureSnaps() {
    const ids = new Set();
    for (const k of Object.keys(S.c).concat(Object.keys(S.s))) ids.add(k.split('|')[0]);
    let changed = false;
    ids.forEach((id) => { if (!S.days[id] && dayFor(id)) { snap(id); changed = true; } });
    if (changed) save();
  }

  /* ============================================================
     BACKUP FILE — only files exported by this site are accepted
     ============================================================ */
  const BACKUP_APP = 'hostel-fit-plan';
  const BACKUP_VER = 3;
  const BACKUP_OK = [2, 3];
  const KEY_RE = /^[\w|:.-]{1,80}$/;
  const num = (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && isFinite(v) && +v >= 0 && +v < 100000;
  const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const pair = (v) => Array.isArray(v) && v.length === 2 && num(v[0]) && num(v[1]);
  const CI_NUM = ['weight', 'waist', 'steps', 'sleep', 'water', 'energy', 'hunger'];
  const CI_TXT = { off: 200, note: 300 };
  const MO_NUM = ['hips', 'chest', 'arm', 'thigh'];

  // Returns a clean state, or throws with a human-readable reason.
  function readBackup(txt) {
    let file;
    try { file = JSON.parse(txt); } catch (e) { throw new Error('This is not a JSON file.'); }
    if (!isObj(file) || file.app !== BACKUP_APP) throw new Error('This file was not exported from Hostel Fit Plan.');
    if (!BACKUP_OK.includes(file.version)) throw new Error(`This backup is from a different version of the site (v${String(file.version)}).`);
    const src = file.data;
    if (!isObj(src)) throw new Error('The backup file is damaged (no data inside).');
    for (const k of SECTIONS) {
      if (src[k] !== undefined && !isObj(src[k])) throw new Error(`The backup file is damaged (bad "${k}" section).`);
    }
    const out = blank();
    const ticks = (from, to) => { for (const [k, v] of Object.entries(from || {})) if (KEY_RE.test(k) && v) to[k] = 1; };
    ticks(src.c, out.c); ticks(src.s, out.s); ticks(src.shop, out.shop);
    for (const [k, v] of Object.entries(src.kg || {})) if (KEY_RE.test(k) && num(v)) out.kg[k] = String(+v);
    for (const [k, v] of Object.entries(src.d || {})) if (isDate(k) && (v === 'A' || v === 'B')) out.d[k] = v;
    for (const [k, v] of Object.entries(src.ci || {})) {
      if (!isDate(k) || !isObj(v)) continue;
      const row = {};
      for (const f of CI_NUM) if (num(v[f])) row[f] = +v[f];
      for (const [f, max] of Object.entries(CI_TXT)) { const s = str(v[f], max); if (s) row[f] = s; }
      out.ci[k] = row;
    }
    for (const [k, v] of Object.entries(src.days || {})) {
      if (!isDate(k) || !isObj(v)) continue;
      const o = {};
      for (const f of ['plan', 'type', 'wo']) { const s = str(v[f], 40); if (s) o[f] = s; }
      if (v.dinner === 'A' || v.dinner === 'B') o.dinner = v.dinner;
      for (const f of ['kcal', 'prot', 'items', 'sets']) if (pair(v[f])) o[f] = [+v[f][0], +v[f][1]];
      if (isObj(v.meals)) {
        o.meals = {};
        for (const [mk, mv] of Object.entries(v.meals)) if (/^\w{1,3}$/.test(mk) && pair(mv)) o.meals[mk] = [+mv[0], +mv[1]];
      }
      out.days[k] = o;
    }
    for (const [k, v] of Object.entries(src.mo || {})) {
      if (!isMonth(k) || !isObj(v)) continue;
      const o = {};
      for (const f of MO_NUM) if (num(v[f])) o[f] = +v[f];
      if (v.photos) o.photos = 1;
      const s = str(v.feel, 1000); if (s) o.feel = s;
      out.mo[k] = o;
    }
    const ui = src.ui || {};
    if (ui.sub === 'food' || ui.sub === 'workout') out.ui.sub = ui.sub;
    if (ui.seenHow) out.ui.seenHow = 1;
    if (ui.wantWake) out.ui.wantWake = true;
    if (isDate(ui.lastExport)) out.ui.lastExport = ui.lastExport;
    if (isMonth(ui.pm)) out.ui.pm = ui.pm;
    return { state: out, exported: typeof file.exported === 'string' ? file.exported : '' };
  }

  function importBackup(f) {
    if (!/\.json$/i.test(f.name)) { alert('Please choose the .json backup file exported from this site.'); return; }
    if (f.size > 5 * 1024 * 1024) { alert('That file is too big to be a Hostel Fit Plan backup.'); return; }
    f.text().then((txt) => {
      let b;
      try { b = readBackup(txt); } catch (err) { alert('Import cancelled: ' + err.message); return; }
      const when = b.exported ? new Date(b.exported) : null;
      const label = when && !isNaN(when) ? when.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown date';
      const n = Object.keys(b.state.c).length + Object.keys(b.state.s).length;
      if (!confirm(`Restore backup from ${label}?\n(${n} ticks, ${Object.keys(b.state.ci).length} check-in days)\n\nThis replaces everything currently saved on this phone.`)) return;
      S = b.state; ensureSnaps(); save(); route(); alert('Backup restored.');
    }).catch(() => alert('Could not read that file. Try choosing it again.'));
  }

  /* ---------------- export: raw data + a readable review summary ---------------- */
  function buildExport() {
    const days = allDates().map((id) => {
      const ci = S.ci[id] || {}, sn = S.days[id] || {}, d = dayFor(id);
      return {
        date: id, dow: DOW_NAME[dowOf(id)],
        plan: sn.plan || (d && d.plan.id), type: sn.type || (d && d.type), workout: sn.wo || (d && d.workout.title),
        weightKg: ci.weight, waistCm: ci.waist, steps: ci.steps, sleepH: ci.sleep,
        waterL: ci.water != null ? ci.water * 0.25 : undefined,
        energy1to5: ci.energy, hunger1to5: ci.hunger, offPlanFood: ci.off, note: ci.note,
        kcalEaten: sn.kcal && sn.kcal[0], kcalPlanned: sn.kcal && sn.kcal[1],
        proteinEaten: sn.prot && sn.prot[0], proteinPlanned: sn.prot && sn.prot[1],
        foodItemsTicked: sn.items, setsDone: sn.sets, dinnerOption: sn.dinner, mealsTicked: sn.meals,
      };
    });
    const weeks = weekRows();
    return {
      app: BACKUP_APP, version: BACKUP_VER, exported: new Date().toISOString(),
      about: 'Hostel Fit Plan export. "review" is a readable summary for the month-end review. "data" is what the Import button restores.',
      profile: PROFILE, targets: TARGETS,
      plans: PL.map((p) => ({ id: p.id, from: p.from, label: p.label })),
      review: {
        firstWeighIn: firstWeight(), currentWeight7dAvg: currentWeight(),
        adjustRule: verdict(weeks).text,
        weeks, months: monthRows(),
        strength: strengthRows().map((r) => ({ exercise: r.name, key: r.x, log: r.log })),
        monthEnd: S.mo, days,
      },
      data: S,
    };
  }
  function doExport() {
    S.ui.lastExport = TODAY; save();
    const blob = new Blob([JSON.stringify(buildExport(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `fit-plan-backup-${TODAY}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ============================================================
     CLOUD SYNC — free & private: one JSON file in YOUR private GitHub
     repo, written with a token that can only touch that repo.
     Every save is a commit, so GitHub keeps every past version.
     Token + sync status live in their own key and are never exported.
     ============================================================ */
  const SYNC_KEY = 'hostelFitPlan:sync';
  const SYNC_FILE = 'fit-plan-data.json';
  const PUSH_DELAY = 15000;      // wait for a quiet moment after your last change
  const PUSH_MIN_GAP = 60000;    // at most ~1 commit a minute while you use the app
  let SY = loadSync();           // { repo, token, sha, at, dirty, err }
  let syncState = '', syncMsg = '';
  let pushTimer = null, lastPush = 0, syncBusy = false, syncAgain = false, editSeq = 0;

  function loadSync() { try { const v = JSON.parse(localStorage.getItem(SYNC_KEY)); return isObj(v) ? v : {}; } catch (e) { return {}; } }
  function saveSync() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(SY)); } catch (e) { /* ignore */ } }
  function syncOn() { return !!(SY.repo && SY.token); }

  function markDirty() {
    if (!syncOn()) return;
    editSeq++;
    if (!SY.dirty) { SY.dirty = true; saveSync(); }
    schedulePush();
  }
  function schedulePush(delay = PUSH_DELAY) {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => syncNow(), Math.max(delay, PUSH_MIN_GAP - (Date.now() - lastPush)));
  }

  function gh(path, opt = {}) {
    const headers = { Authorization: `Bearer ${SY.token}`, Accept: opt.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' };
    if (opt.body) headers['Content-Type'] = 'application/json';
    return fetch(`https://api.github.com/repos/${SY.repo}${path}`, { method: opt.method || 'GET', headers, body: opt.body, cache: 'no-store' });
  }
  function ghError(status) {
    const e = new Error(
      status === 401 ? 'GitHub rejected the token (wrong or expired). Create a new token and connect again.'
        : status === 403 ? 'The token is not allowed to write here. It needs “Contents: Read and write” on this repo.'
          : status === 404 ? 'Repo not found, or the token was not given access to it.'
            : `GitHub error ${status}. Will retry later.`);
    e.fatal = status === 401 || status === 403 || status === 404;
    return e;
  }
  const toB64 = (s) => {
    const b = new TextEncoder().encode(s); let bin = '';
    for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const fromB64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  const device = () => { const u = navigator.userAgent; return /Android/.test(u) ? 'Android' : /iPhone|iPad/.test(u) ? 'iPhone' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : 'browser'; };

  async function fetchRemote() {
    const path = `/contents/${SYNC_FILE}`;
    const r = await gh(path);
    if (r.status === 404) return null;
    if (!r.ok) throw ghError(r.status);
    const j = await r.json();
    let txt = j.content && j.encoding === 'base64' ? fromB64(j.content) : null;
    if (txt == null) { const r2 = await gh(path, { raw: true }); if (!r2.ok) throw ghError(r2.status); txt = await r2.text(); } // files > 1 MB
    return { sha: j.sha, txt };
  }
  async function putRemote(sha) {
    const now = new Date();
    const body = {
      message: `sync ${localISO(now)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} · ${device()}`,
      content: toB64(JSON.stringify({ app: BACKUP_APP, version: BACKUP_VER, saved: now.toISOString(), data: S })),
    };
    if (sha) body.sha = sha;
    const r = await gh(`/contents/${SYNC_FILE}`, { method: 'PUT', body: JSON.stringify(body) });
    if (r.status === 409 || r.status === 422) return { conflict: true };
    if (!r.ok) throw ghError(r.status);
    return { sha: (await r.json()).content.sha };
  }

  // Combine two copies without losing anything: union of all days/ticks/logs;
  // where both have the same field, this phone's unsynced edit wins.
  function mergeStates(remote, local) {
    const out = blank();
    for (const k of SECTIONS) out[k] = Object.assign({}, remote[k], local[k]);
    for (const k of ['ci', 'mo']) {
      for (const id of Object.keys(remote[k])) if (local[k][id]) out[k][id] = Object.assign({}, remote[k][id], local[k][id]);
    }
    return out;
  }
  const hasData = (st) => SECTIONS.some((k) => k !== 'ui' && Object.keys(st[k] || {}).length);

  function rerenderSafe() {
    const a = document.activeElement;
    if (a && /INPUT|TEXTAREA/.test(a.tagName)) return; // never yank the page while you type
    rerenderKeepScroll();
  }
  function setSync(state, msg) {
    syncState = state; syncMsg = msg || '';
    const dot = $('#syncDot');
    if (dot) {
      dot.hidden = !syncOn();
      dot.className = `syncdot s-${state}`;
      dot.title = state === 'ok' ? 'Synced to GitHub' : state === 'syncing' ? 'Syncing…' : syncMsg;
    }
    const el = $('#syncStatus'); if (el) el.innerHTML = syncStatusHTML();
  }

  async function syncNow() {
    if (!syncOn()) return;
    if (syncBusy) { syncAgain = true; return; }
    if (!navigator.onLine) { setSync('offline', 'Offline. Changes are safe on this phone and will sync when you are back online.'); return; }
    syncBusy = true; clearTimeout(pushTimer); setSync('syncing');
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const remote = await fetchRemote();
        let pulled = false;
        if (remote && remote.sha !== SY.sha) { // another device saved since our last sync
          const rs = readBackup(remote.txt).state;
          if (SY.dirty) S = mergeStates(rs, S);
          else { rs.ui = Object.assign({}, rs.ui, S.ui, { lastExport: [rs.ui.lastExport, S.ui.lastExport].filter(Boolean).sort().pop() }); S = rs; }
          ensureSnaps(); saveQuiet(); dayCache.clear(); pulled = true;
        }
        if (!SY.dirty && remote) { SY.sha = remote.sha; if (pulled) rerenderSafe(); break; }
        const seq = editSeq;
        const res = await putRemote(remote && remote.sha);
        if (res.conflict) continue; // someone saved in between: pull + merge again
        SY.sha = res.sha; lastPush = Date.now();
        SY.dirty = editSeq !== seq; // edits made while uploading still need a push
        if (pulled) rerenderSafe();
        break;
      }
      SY.at = new Date().toISOString(); SY.err = ''; saveSync();
      setSync('ok');
    } catch (e) {
      const offline = e instanceof TypeError; // fetch() network failure
      SY.err = offline ? '' : e.message; saveSync();
      setSync(offline ? 'offline' : 'error', offline ? 'Could not reach GitHub. Will retry.' : e.message);
      if (!e.fatal) schedulePush(PUSH_MIN_GAP);
    } finally {
      syncBusy = false;
      if (syncAgain) { syncAgain = false; if (SY.dirty) schedulePush(2000); }
      else if (SY.dirty) schedulePush();
    }
  }

  async function connectSync(repoIn, tokenIn) {
    const repo = String(repoIn || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
    const token = String(tokenIn || '').trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Repo must look like username/repo-name, e.g. prince-vats/fit-data.');
    if (!/^(github_pat_|ghp_)\w{20,}$/.test(token)) throw new Error('That does not look like a GitHub token. It starts with github_pat_.');
    const prev = SY;
    SY = { repo, token };
    try {
      const r = await gh('');
      if (!r.ok) throw ghError(r.status);
      const info = await r.json();
      if (!info.private) throw new Error('This repo is PUBLIC, so anyone could read your health data. Make it private (repo Settings → General → Danger Zone → Change visibility) and connect again.');
    } catch (e) {
      SY = prev; saveSync();
      throw e instanceof TypeError ? new Error('Could not reach GitHub. Check your internet and try again.') : e;
    }
    SY.dirty = hasData(S); // first connect: upload what this phone has (merged with any cloud copy)
    saveSync();
    await syncNow();
    if (syncState === 'error') throw new Error(syncMsg);
  }
  function disconnectSync() { clearTimeout(pushTimer); SY = {}; saveSync(); setSync(''); }

  function ago(iso) {
    const s = Math.round((Date.now() - new Date(iso)) / 1000);
    return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} days ago`;
  }
  function syncStatusHTML() {
    if (!syncOn()) return '';
    if (syncState === 'syncing') return '<span class="sy sy-syncing">Syncing…</span>';
    if (syncState === 'error' || SY.err) return `<span class="sy sy-error">${esc(syncMsg || SY.err)}</span>`;
    if (syncState === 'offline') return `<span class="sy sy-offline">${esc(syncMsg)}</span>`;
    return `<span class="sy sy-ok">✓ Synced${SY.at ? ' ' + ago(SY.at) : ''}${SY.dirty ? ' · new changes waiting to upload' : ''}</span>`;
  }

  /* ============================================================
     HISTORY MATHS (weeks, months, strength, adjust rule)
     ============================================================ */
  function allDates() {
    const set = new Set(Object.keys(S.ci).concat(Object.keys(S.days)));
    return [...set].filter((id) => isDate(id) && (Object.keys(S.ci[id] || {}).length || S.days[id])).sort();
  }
  function weighIns() {
    return Object.keys(S.ci).filter((id) => isDate(id) && S.ci[id].weight).sort().map((id) => ({ id, v: +S.ci[id].weight }));
  }
  const firstWeight = () => { const w = weighIns(); return w.length ? w[0].v : null; };
  function avgWeightAround(id) { // trailing 7-day average ending on id
    const from = addDays(id, -6);
    return avg(weighIns().filter((p) => p.id >= from && p.id <= id).map((p) => p.v));
  }
  const currentWeight = () => { const w = weighIns(); return w.length ? r1(avgWeightAround(w[w.length - 1].id)) : null; };

  function summarize(ids) {
    const ci = ids.map((id) => S.ci[id] || {}), sn = ids.map((id) => S.days[id]).filter(Boolean);
    const vals = (f) => ci.map((c) => c[f]).filter((v) => v != null && v !== '').map(Number);
    const W = vals('weight'), WA = vals('waist');
    const fed = sn.filter((d) => d.kcal && d.kcal[0] > 0);
    return {
      weightAvg: r1(avg(W)), weighIns: W.length,
      waist: WA.length ? WA[WA.length - 1] : null,
      kcalAvg: fed.length ? Math.round(avg(fed.map((d) => d.kcal[0]))) : null,
      proteinAvg: fed.length ? Math.round(avg(fed.map((d) => d.prot[0]))) : null,
      foodDays: fed.length,
      workouts: sn.filter((d) => d.sets && d.sets[1] && d.sets[0] / d.sets[1] >= 0.8).length,
      stepsAvg: vals('steps').length ? Math.round(avg(vals('steps'))) : null,
      sleepAvg: r1(avg(vals('sleep'))),
      waterAvgL: vals('water').length ? r1(avg(vals('water')) * 0.25) : null,
      energyAvg: r1(avg(vals('energy'))), hungerAvg: r1(avg(vals('hunger'))),
      offPlanDays: ci.filter((c) => c.off).length,
    };
  }
  function weekRows() {
    const groups = new Map();
    allDates().forEach((id) => { const w = weekStart(id); if (!groups.has(w)) groups.set(w, []); groups.get(w).push(id); });
    const rows = [...groups.keys()].sort().map((w) => Object.assign({ from: w, to: addDays(w, 6) }, summarize(groups.get(w))));
    rows.forEach((r, i) => {
      const p = rows[i - 1];
      r.change = p && r.weightAvg != null && p.weightAvg != null && dayDiff(p.from, r.from) === 7 ? r1(r.weightAvg - p.weightAvg) : null;
    });
    return rows;
  }
  function monthRows() {
    const groups = new Map();
    allDates().forEach((id) => { const m = monthOf(id); if (!groups.has(m)) groups.set(m, []); groups.get(m).push(id); });
    return [...groups.keys()].sort().map((m) => {
      const ids = groups.get(m);
      const W = ids.filter((id) => S.ci[id] && S.ci[id].weight).map((id) => +S.ci[id].weight);
      const WA = ids.filter((id) => S.ci[id] && S.ci[id].waist).map((id) => +S.ci[id].waist);
      const start = W.length ? r1(avg(W.slice(0, 3))) : null, end = W.length ? r1(avg(W.slice(-3))) : null;
      return Object.assign({ month: m, daysLogged: ids.length, weightStart: start, weightEnd: end,
        weightChange: W.length >= 4 ? r1(end - start) : null,
        waistChange: WA.length >= 2 ? r1(WA[WA.length - 1] - WA[0]) : null }, summarize(ids), { measurements: S.mo[m] || null });
    });
  }
  function strengthRows() {
    const by = {};
    for (const [k, v] of Object.entries(S.kg)) {
      const [d, x] = k.split('|');
      if (!isDate(d) || !EX[x] || v === '') continue;
      (by[x] = by[x] || []).push([d, +v]);
    }
    return Object.entries(by).map(([x, log]) => ({ x, name: EX[x].name, log: log.sort((a, b) => (a[0] < b[0] ? -1 : 1)) }))
      .sort((a, b) => b.log.length - a.log.length || (a.name < b.name ? -1 : 1));
  }

  // The weekly adjust rule from the Guide, applied automatically.
  function verdict(weeks) {
    const full = weeks.filter((w) => w.to < TODAY && w.weighIns >= 3);
    if (full.length < 2) {
      return { tone: 'info', text: 'Needs two finished weeks with at least 3 morning weigh-ins each. Weigh yourself every morning and this fills in automatically.' };
    }
    const [a, b] = full.slice(-2);
    const rate = b.weightAvg - a.weightAvg, rs = `${sign(rate)} kg/week`;
    const early = a.from <= weekStart(START);
    if (rate <= -1.2 && !early) return { tone: 'warn', text: `Losing fast (${rs}). Add 1 chapati at lunch. If you feel weak or dizzy, do it today.`, rate };
    if (rate <= -0.5) return { tone: 'good', text: `On track (${rs}). Change nothing.`, rate };
    if (rate <= -0.3) return { tone: 'ok', text: `A bit slow (${rs}) but fine. Keep going and check again next Monday.`, rate };
    if (full.length >= 3) {
      const prev = a.weightAvg - full[full.length - 3].weightAvg;
      if (prev > -0.3) return { tone: 'act', text: `Stalled two weeks in a row (${rs}). Use Dinner B (Hostel kit) on 3 more nights a week and add 2,000 steps a day.`, rate };
    }
    return { tone: 'ok', text: `Slow week (${rs}). One slow week is normal (water, salt). If next week is slow too, the rule will tell you what to change.`, rate };
  }

  /* ---------------- month-end review timing ---------------- */
  function reviewDue() {
    const m = monthOf(TODAY), end = lastOfMonth(m);
    if (TODAY === end) return { month: m, done: S.ui.lastExport === TODAY };
    const prevEnd = addDays(m + '-01', -1);
    if (+TODAY.slice(8) <= 3 && prevEnd >= START && !(S.ui.lastExport && S.ui.lastExport >= prevEnd)) return { month: monthOf(prevEnd), late: true };
    return null;
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  function defaultDay() { return dayFor(TODAY) ? TODAY : START; }
  function parse() {
    const p = location.hash.replace(/^#\/?/, '').split('/');
    if (dayFor(p[0])) return { view: 'day', id: p[0], sub: p[1] === 'workout' || p[1] === 'food' ? p[1] : S.ui.sub || 'food' };
    if (['shop', 'guide', 'progress'].includes(p[0])) return { view: p[0] };
    return { view: 'day', id: defaultDay(), sub: S.ui.sub || 'food' };
  }

  function route() {
    const r = parse();
    $$('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.tab === (r.view === 'day' ? 'plan' : r.view)));
    if (r.view === 'day') { S.ui.sub = r.sub; saveQuiet(); renderDay(dayFor(r.id), r.sub); }
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
      ${banners(day)}
      ${weekStrip(day, sub)}
      <section class="hero t-${day.type}">
        <div class="hero-meta">
          <span class="pill">${TYPE[day.type]}</span>
          <span>${day.dowName}, ${day.date}${day.id === TODAY ? ' · <b class="today-tag">Today</b>' : ''}</span>
        </div>
        <h1>${esc(day.title)}</h1>
        <p class="hero-sub">${esc(day.sub)}</p>
        ${day.note ? `<p class="hero-note">${esc(day.note)}</p>` : ''}
      </section>

      <div class="subtabs" role="tablist">
        <a role="tab" href="#/${day.id}/food" class="${sub === 'food' ? 'on' : ''}" aria-selected="${sub === 'food'}">
          ${I.food}<span>Food<small>${fmt(f.pk)} kcal · ${f.pp} g protein</small></span>
        </a>
        <a role="tab" href="#/${day.id}/workout" class="${sub === 'workout' ? 'on' : ''}" aria-selected="${sub === 'workout'}">
          ${isRec ? I.walk : I.gym}<span>${isRec ? 'Activity' : 'Workout'}<small>${day.workout.mins} min${day.workout.where ? ' · ' + esc(day.workout.where) : ''}</small></span>
        </a>
      </div>

      <div id="pane">${sub === 'workout' ? workoutPane(day) : foodPane(day)}</div>
      ${dayNav(day, sub)}`;
  }

  function banners(day) {
    let out = '';
    const due = reviewDue();
    if (due && !due.done) {
      out += `<section class="banner">
        <div>${I.flag}</div>
        <div><b>${due.late ? `${monthLabel(due.month)} review is pending` : 'Today is month-end review day'}</b>
          <p>Fill in the month-end measurements, export your file, and send it to Claude along with next month’s mess menu.</p>
          <a class="btn" href="#progress">Open month-end review</a></div>
      </section>`;
    }
    if (monthOf(day.id) > day.plan.id) {
      out += `<section class="banner soft"><div>${I.food}</div><div><b>Still using the ${esc(day.plan.label)} meals</b>
        <p>The mess menu has probably changed. Send the new menu to Claude to update the meals. Workouts stay the same.</p></div></section>`;
    }
    return out;
  }

  function weekStrip(active, sub) {
    const mon = weekStart(active.id);
    const ids = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    const prevW = addDays(active.id, -7), nextW = addDays(active.id, 7);
    const prevTarget = dayFor(prevW) ? prevW : (mon > START ? START : null);
    const nextTarget = dayFor(nextW) ? nextW : null;
    const chips = ids.map((id) => {
      const d = dayFor(id);
      if (!d) return `<span class="daychip off"><span class="dc-dow">${DOW_NAME[dowOf(id)]}</span><span class="dc-date">${+id.slice(8)}</span><span class="dc-bar"></span></span>`;
      const sn = S.days[id];
      const p = sn ? pct((sn.items ? sn.items[0] : 0) + (sn.sets ? sn.sets[0] : 0), (sn.items ? sn.items[1] : 0) + (sn.sets ? sn.sets[1] : 0)) : 0;
      return `<a href="#/${id}/${sub}" class="daychip ${id === active.id ? 'active' : ''} ${id === TODAY ? 'is-today' : ''}" aria-label="${d.dowName} ${d.date}, ${p}% done">
        <span class="dc-dow">${d.dowName}</span><span class="dc-date">${+id.slice(8)}</span>
        <span class="dc-bar"><i style="width:${p}%"></i></span></a>`;
    }).join('');
    return `<div class="week">
      <div class="weekbar">
        ${prevTarget ? `<a href="#/${prevTarget}/${sub}" aria-label="Previous week">‹</a>` : '<span class="wb-gap"></span>'}
        <span class="wb-label">${rangeLabel(ids[0], ids[6])}${active.id !== TODAY && dayFor(TODAY) ? ` · <a href="#/${TODAY}/${sub}">Today</a>` : ''}</span>
        ${nextTarget ? `<a href="#/${nextTarget}/${sub}" aria-label="Next week">›</a>` : '<span class="wb-gap"></span>'}
      </div>
      <nav class="daystrip" aria-label="Choose day">${chips}</nav>
    </div>`;
  }

  function dayNav(day, sub) {
    const prev = dayFor(addDays(day.id, -1)), next = dayFor(addDays(day.id, 1));
    return `<nav class="daynav">
      ${prev ? `<a href="#/${prev.id}/${sub}">← ${prev.dowName} ${prev.date}</a>` : '<span></span>'}
      ${next ? `<a href="#/${next.id}/${sub}">${next.dowName} ${next.date} →</a>` : '<span></span>'}
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

  function rateRow(day, f, label, lo, hi) {
    const v = (S.ci[day.id] || {})[f];
    return `<div class="rate"><span class="rate-label">${label}</span>
      <div class="rate-btns" role="group" aria-label="${label}">${[1, 2, 3, 4, 5].map((n) => `<button data-act="rate" data-f="${f}" data-day="${day.id}" data-n="${n}" class="${v === n ? 'on' : ''}" aria-pressed="${v === n}">${n}</button>`).join('')}</div>
      <span class="rate-ends"><em>${lo}</em><em>${hi}</em></span></div>`;
  }

  function checkinCard(day) {
    const ci = S.ci[day.id] || {};
    const water = ci.water || 0;
    let glasses = '';
    for (let i = 1; i <= TARGETS.waterGlasses; i++) glasses += `<button class="glass ${i <= water ? 'full' : ''}" data-act="water" data-n="${i}" aria-label="${i} glasses of water"><svg viewBox="0 0 24 24"><path d="M5 3h14l-1.6 17.2A2 2 0 0 1 15.4 22H8.6a2 2 0 0 1-2-1.8Z" class="g-out"/><path d="M6.3 9.5h11.4l-1.1 10.6a1 1 0 0 1-1 .9H8.4a1 1 0 0 1-1-.9Z" class="g-in"/></svg></button>`;
    const field = (key, label, unit, step) => `<label class="field"><span>${label}</span><span class="inwrap"><input type="number" inputmode="decimal" step="${step}" min="0" data-ci="${key}" data-day="${day.id}" value="${ci[key] ?? ''}" placeholder="–">${unit ? `<em>${unit}</em>` : ''}</span></label>`;
    const isMon = day.dow === 'mon';
    return `
      <section class="card checkin">
        <div class="card-head"><h2>Daily check-in</h2><span class="muted small">auto-saved</span></div>
        <div class="water">
          <div class="water-head"><span>Water · tap a glass (250 ml each)</span><b id="waterTxt">${waterText(water)}</b></div>
          <div class="glasses">${glasses}</div>
        </div>
        <div class="ci-grid">
          ${field('weight', 'Morning weight', 'kg', '0.1')}
          ${field('waist', isMon ? 'Waist at navel · <b class="today-tag">today</b>' : 'Waist (Mondays)', 'cm', '0.5')}
          ${field('steps', 'Steps', '', '100')}
          ${field('sleep', 'Sleep last night', 'h', '0.5')}
        </div>
        <div class="rates">
          ${rateRow(day, 'energy', 'Energy', 'drained', 'great')}
          ${rateRow(day, 'hunger', 'Hunger', 'full', 'starving')}
        </div>
        <label class="field wide"><span>Off-plan food · anything you ate that is not ticked above</span>
          <span class="inwrap"><input type="text" maxlength="${CI_TXT.off}" data-ci-t="off" data-day="${day.id}" value="${esc(ci.off || '')}" placeholder="e.g. 2 samosa at canteen, birthday cake"></span></label>
        <label class="field wide"><span>Notes · pain, illness, travel, missed workout and why</span>
          <span class="inwrap"><input type="text" maxlength="${CI_TXT.note}" data-ci-t="note" data-day="${day.id}" value="${esc(ci.note || '')}" placeholder="optional"></span></label>
      </section>`;
  }
  const waterText = (n) => `${+(n * 0.25).toFixed(2)} L / 3 L`;

  /* ============================================================
     WORKOUT PANE
     ============================================================ */
  function workoutPane(day) {
    const w = day.workout;
    if (!w.blocks.length) return '<section class="card"><p class="muted">Nothing planned. Walk 8,000+ steps and stretch.</p></section>';
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
              <label class="inwrap kg"><input type="number" inputmode="decimal" step="0.5" min="0" data-act="kg" data-k="${kk}" value="${esc(S.kg[kk] ?? '')}" placeholder="–" aria-label="Weight used for ${esc(x.name)} in kg"><em>kg used</em></label>
              <span class="last">${last ? `Last time (${longDate(last.d)}): <b>${esc(last.v)} kg</b>` : x.start ? `Start with: <b>${esc(x.start)}</b>` : ''}</span>
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
    const day = dayFor(r.id);
    const fs = $('#foodSummary'); if (fs) fs.innerHTML = foodSummary(day);
    const ws = $('#woSummary'); if (ws) ws.innerHTML = woSummary(day);
    const wk = $('.week'); if (wk) wk.outerHTML = weekStrip(day, r.sub);
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
    S.ui.wantWake = !!wakeLock; saveQuiet();
    refreshSummaries();
  }

  /* ============================================================
     SHOPPING
     ============================================================ */
  const PERIOD = {
    month: { key: () => monthOf(TODAY), label: () => `for ${MONTH[+TODAY.slice(5, 7) - 1]} · resets on the 1st` },
    week: { key: () => 'w' + weekStart(TODAY), label: () => `this week (${rangeLabel(weekStart(TODAY), addDays(weekStart(TODAY), 6))}) · resets on Monday` },
    once: { key: () => 'once', label: () => 'buy once' },
  };
  function renderShop() {
    let total = 0, got = 0;
    const groups = SHOPPING.map((g, gi) => {
      const per = PERIOD[g.every] || PERIOD.once;
      const items = g.items.map((it, ii) => {
        const k = `${per.key()}|${gi}|${ii}`, on = !!S.shop[k];
        total++; if (on) got++;
        return `<label class="item ${on ? 'done' : ''}">
          <input type="checkbox" data-act="shop" data-k="${k}" ${on ? 'checked' : ''}>
          <span class="tick" aria-hidden="true"></span>
          <span class="item-main"><span class="item-name">${esc(it.n)}</span><span class="item-qty">${esc(it.why)}</span></span>
          <span class="item-mac qty">${esc(it.q)}</span>
        </label>`;
      }).join('');
      return `<section class="card"><div class="card-head"><h2>${esc(g.group)}</h2><span class="muted small">${per.label()}</span></div><div class="items">${items}</div></section>`;
    }).join('');
    app.innerHTML = `
      <section class="page-head">
        <h1>Shopping list</h1>
        <p>Everything is <b>no-cook</b>: mix, soak, or eat as-is. Stock up once a month, grab the fresh items every week.</p>
        <div class="bar b-protein big"><i style="width:${pct(got, total)}%"></i></div>
        <p class="muted small">${got} of ${total} bought</p>
      </section>
      ${groups}
      <section class="page-head"><h1>No-cook recipes</h1></section>
      <div class="recipes">${RECIPES.map((r) => `
        <article class="card recipe"><h3>${esc(r.n)}</h3><p>${esc(r.how)}</p>${r.mac ? `<span class="pill soft">${esc(r.mac)}</span>` : ''}</article>`).join('')}
      </div>`;
  }

  /* ============================================================
     GUIDE
     ============================================================ */
  function renderGuide() {
    const w = currentWeight() || firstWeight() || PROFILE.startKg;
    const h = PROFILE.heightCm;
    const bmi = w / ((h / 100) ** 2);
    const bmr = 10 * w + 6.25 * h - 5 * PROFILE.age + 5;
    const maint = bmr * 1.5;
    const mid = (TARGETS.kcalLow + TARGETS.kcalHigh) / 2;
    const plan = currentPlan();
    const split = WEEK_ORDER.map((d) => { const t = plan.days.find((x) => x.dow === d); return `<li><b>${DOW_NAME[d]}</b><span>${t ? esc(t.title) : 'Rest'}</span></li>`; }).join('');
    app.innerHTML = `
      <section class="page-head">
        <h1>How this plan works</h1>
        <p>Built for: ${PROFILE.age} y, ${PROFILE.sex}, 5′10″, started at ~${PROFILE.startKg} kg, ${esc(PROFILE.diet)}, IITGN hostel mess, 1.5–2 h of evening training.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Your numbers</h2><span class="muted small">at ${r1(w)} kg${currentWeight() ? ' (7-day average)' : ''}</span></div>
        <div class="kv">
          <div><span>BMI</span><b>${bmi.toFixed(1)}</b><em>Goal: below 25 (≈ ${PROFILE.goalKg} kg), over the coming months</em></div>
          <div><span>Burn at rest (BMR)</span><b>~${fmt(Math.round(bmr / 10) * 10)} kcal</b><em>Mifflin-St Jeor equation. Drops as you lose weight</em></div>
          <div><span>Maintenance</span><b>~${fmt(Math.round(maint / 50) * 50)} kcal</b><em>With evening training + walking around campus</em></div>
          <div><span>Your intake</span><b>${fmt(TARGETS.kcalLow)}–${fmt(TARGETS.kcalHigh)} kcal</b><em>≈ ${fmt(Math.round((maint - mid) / 50) * 50)} kcal/day deficit → ~${r1(((maint - mid) * 7) / 7700)} kg of fat per week</em></div>
          <div><span>Protein</span><b>${TARGETS.proteinLow}–${TARGETS.proteinHigh} g</b><em>≈ 1.5–1.8 g per kg of your goal weight. Protects muscle, keeps you full</em></div>
          <div><span>Water · Steps · Sleep</span><b>3 L+ · ${fmt(TARGETS.steps)}+ · 7–8 h</b><em>These three matter as much as the diet</em></div>
        </div>
      </section>

      <section class="card accent-card">
        <div class="card-head"><h2>How this runs long-term</h2></div>
        <ul class="bullets">
          <li><b>Every week:</b> the mess menu repeats weekly, so the same Mon–Sun plan runs all month. Beat last week’s numbers (the app shows “Last time” on each exercise).</li>
          <li><b>Every day:</b> tick what you eat and the sets you do, and fill the check-in. Weigh in every morning; one weigh-in a day makes the weekly average reliable.</li>
          <li><b>Every Monday:</b> measure your waist. Progress → “This week vs last week” applies the adjust rule for you.</li>
          <li><b>Last date of every month:</b> do the month-end review in Progress (measurements + photos + notes), then <b>Export</b> and send the file to Claude <b>together with next month’s mess menu</b>. Claude reviews your month, then updates meals, targets and workouts.</li>
          <li><b>Keep your records safe:</b> use the same phone and browser, never “clear site data”, and keep each exported file in Google Drive.</li>
        </ul>
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

      <section class="card">
        <div class="card-head"><h2>Adjust rule (Progress checks it every week)</h2></div>
        <ul class="bullets">
          <li><b>Losing 0.5–1 kg/week:</b> perfect. Change nothing.</li>
          <li><b>Losing less than 0.3 kg/week for 2 weeks:</b> use Dinner B (Hostel kit) on 3 more nights a week, and add 2,000 steps a day.</li>
          <li><b>Losing more than 1.2 kg/week after week 1,</b> or feeling weak or dizzy: add 1 chapati at lunch.</li>
        </ul>
        <p class="note">Calorie numbers for mess food are estimates. This rule corrects for that automatically using your real results.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Weekly training split</h2><span class="muted small">${esc(plan.label)} plan</span></div>
        <ol class="rhythm">${split}</ol>
        <p class="note">Every muscle gets trained twice a week with rest in between. Tuesday and Friday are fat-burning cardio days; Sunday is easy recovery.</p>
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
        <p class="note">Why not skip dinner fully? Your workout ends around 7:30 pm, so dinner is your recovery meal. Option B keeps your “shake + small items” habit but adds real protein and fibre.</p>
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
        <p class="note">One planned treat a week keeps you sane: Saturday’s single bhatura.</p>
      </section>

      <section class="card">
        <div class="card-head"><h2>Workout rules</h2></div>
        <ul class="bullets">
          <li><b>Effort:</b> end each set with 2–3 reps left in the tank.</li>
          <li><b>Progression:</b> when you hit the top of the rep range on every set, add 2.5 kg for upper body or 5 kg for lower body next time.</li>
          <li><b>Cardio:</b> incline walking and the elliptical are easy on your joints at your current weight. When walks feel easy, raise the incline by 1%. Add more jogging as your weight drops.</li>
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
        <p><b>Do this soon:</b> get a blood test at the health centre (<b>CBC, ferritin, B12, vitamin D, TSH</b>) and show the results to a doctor before taking any supplements. Mention the results in a month-end note so the plan can account for them. This plan’s moderate deficit plus 120 g+ protein is designed to avoid diet-related hair shedding.</p>
        <p class="muted small">Food values are estimates for typical mess portions. This is general fitness guidance, not medical advice. If you have a medical condition, check with a doctor first. Exercise photos: <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener">free-exercise-db</a> (public domain).</p>
      </section>`;
  }

  /* ============================================================
     PROGRESS
     ============================================================ */
  function renderProgress() {
    const weeks = weekRows(), months = monthRows(), lifts = strengthRows();
    const W = weighIns(), first = W[0], cur = currentWeight();
    const waists = Object.keys(S.ci).filter((id) => isDate(id) && S.ci[id].waist).sort().map((id) => +S.ci[id].waist);
    const bmi = cur ? cur / ((PROFILE.heightCm / 100) ** 2) : null;
    const thisWeek = weeks.find((w) => w.from === weekStart(TODAY));
    const v = verdict(weeks);
    const due = reviewDue();
    const review = reviewCard(due ? due.month : monthOf(TODAY), !!(due && !due.done));
    const months_ = [...new Set(allDates().map(monthOf).concat([monthOf(TODAY >= START ? TODAY : START)]))].sort();
    const pm = months_.includes(S.ui.pm) ? S.ui.pm : months_[months_.length - 1];
    const dayIds = allDates().filter((id) => monthOf(id) === pm).reverse();

    app.innerHTML = `
      <section class="page-head"><h1>Progress</h1>
        <p>Your long-term record. Everything is saved <b>in this browser on this phone</b> and stays after refresh and closing the app.</p>
        ${storageOK ? '' : '<p class="warn">Saving is blocked in this browser (private/incognito mode?). Open the site in a normal tab.</p>'}
      </section>
      ${due && !due.done ? review : ''}
      <section class="stat-grid">
        <div class="card stat"><span class="m-label">Weight now</span><b>${dash(cur)}<small> kg</small></b><span class="muted small">7-day average</span></div>
        <div class="card stat"><span class="m-label">Total change</span><b>${first && cur != null ? sign(cur - first.v) : '–'}<small> kg</small></b><span class="muted small">${first ? `since ${niceDate(first.id)} (${first.v} kg)` : 'log morning weight'}</span></div>
        <div class="card stat"><span class="m-label">Waist change</span><b>${waists.length > 1 ? sign(waists[waists.length - 1] - waists[0]) : '–'}<small> cm</small></b><span class="muted small">${waists.length ? `now ${waists[waists.length - 1]} cm` : 'measure on Mondays'}</span></div>
        <div class="card stat"><span class="m-label">BMI now</span><b>${bmi ? bmi.toFixed(1) : '–'}</b><span class="muted small">goal below 25</span></div>
      </section>

      <section class="card verdict v-${v.tone}">
        <div class="card-head"><h2>This week vs last week</h2><span class="muted small">adjust rule</span></div>
        <p>${esc(v.text)}</p>
        ${thisWeek ? `<p class="muted small">This week so far: ${thisWeek.workouts} workout${thisWeek.workouts === 1 ? '' : 's'} done · ${thisWeek.weighIns} weigh-in${thisWeek.weighIns === 1 ? '' : 's'}${thisWeek.proteinAvg != null ? ` · avg protein ${thisWeek.proteinAvg} g` : ''}</p>` : ''}
      </section>

      ${W.length >= 2 ? `<section class="card"><div class="card-head"><h2>Morning weight</h2><span class="muted small"><i class="key k-raw"></i>daily <i class="key k-avg"></i>7-day avg</span></div>${chart(W)}</section>` : ''}

      ${weeks.length ? `<section class="card">
        <div class="card-head"><h2>Week by week</h2><span class="muted small">newest first</span></div>
        <div class="table-wrap"><table class="ptable">
          <thead><tr><th>Week</th><th>Avg kg</th><th>Change</th><th>Waist</th><th>Kcal</th><th>Protein</th><th>Workouts</th><th>Steps</th><th>Sleep</th></tr></thead>
          <tbody>${weeks.slice().reverse().map((w) => `<tr>
            <td>${rangeLabel(w.from, w.to)}</td>
            <td>${dash(w.weightAvg)}${w.weighIns ? `<span class="muted"> ·${w.weighIns}</span>` : ''}</td>
            <td class="${w.change < 0 ? 'good' : w.change > 0 ? 'bad' : ''}">${w.change == null ? '–' : sign(w.change)}</td>
            <td>${dash(w.waist)}</td>
            <td>${dash(w.kcalAvg, fmt)}</td>
            <td>${dash(w.proteinAvg, (x) => x + ' g')}</td>
            <td>${w.workouts} / 7</td>
            <td>${dash(w.stepsAvg, fmt)}</td>
            <td>${dash(w.sleepAvg, (x) => x + ' h')}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <p class="muted small">Avg kg ·n = number of weigh-ins that week. Kcal and protein are averages of days you ticked food.</p>
      </section>` : ''}

      ${months.length ? `<section class="card">
        <div class="card-head"><h2>Month by month</h2></div>
        <div class="table-wrap"><table class="ptable">
          <thead><tr><th>Month</th><th>Weight</th><th>Change</th><th>Waist</th><th>Kcal</th><th>Protein</th><th>Workouts</th><th>Days logged</th></tr></thead>
          <tbody>${months.slice().reverse().map((m) => `<tr>
            <td>${monthLabel(m.month)}</td>
            <td>${m.weightStart != null ? `${m.weightStart} → ${m.weightEnd}` : '–'}</td>
            <td class="${m.weightChange < 0 ? 'good' : m.weightChange > 0 ? 'bad' : ''}">${m.weightChange == null ? '–' : sign(m.weightChange)}</td>
            <td>${m.waistChange == null ? '–' : sign(m.waistChange) + ' cm'}</td>
            <td>${dash(m.kcalAvg, fmt)}</td>
            <td>${dash(m.proteinAvg, (x) => x + ' g')}</td>
            <td>${m.workouts}</td>
            <td>${m.daysLogged}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </section>` : ''}

      ${lifts.length ? `<section class="card">
        <div class="card-head"><h2>Strength</h2><span class="muted small">kg used, first → latest</span></div>
        <div class="table-wrap"><table class="ptable">
          <thead><tr><th>Exercise</th><th>First</th><th>Latest</th><th>Change</th><th>Sessions</th></tr></thead>
          <tbody>${lifts.map((l) => { const a = l.log[0], b = l.log[l.log.length - 1]; return `<tr>
            <td>${esc(l.name)}</td><td>${a[1]} kg</td><td>${b[1]} kg <span class="muted">${niceDate(b[0])}</span></td>
            <td class="${b[1] > a[1] ? 'good' : ''}">${l.log.length > 1 ? sign(b[1] - a[1]) : '–'}</td><td>${l.log.length}</td></tr>`; }).join('')}</tbody>
        </table></div>
      </section>` : ''}

      <section class="card">
        <div class="card-head"><h2>Day by day</h2></div>
        <div class="chips">${months_.map((m) => `<button class="chipbtn ${m === pm ? 'on' : ''}" data-act="pm" data-m="${m}">${MON[+m.slice(5) - 1]} ${m.slice(2, 4)}</button>`).join('')}</div>
        ${dayIds.length ? `<div class="table-wrap"><table class="ptable">
          <thead><tr><th>Day</th><th>Weight</th><th>Waist</th><th>Kcal</th><th>Protein</th><th>Workout</th><th>Steps</th><th>Sleep</th><th>Water</th><th>Energy</th><th>Notes</th></tr></thead>
          <tbody>${dayIds.map((id) => { const ci = S.ci[id] || {}, sn = S.days[id] || {}; return `<tr>
            <td>${dayFor(id) ? `<a href="#/${id}">${longDate(id)}</a>` : longDate(id)}</td>
            <td>${dash(ci.weight)}</td><td>${dash(ci.waist)}</td>
            <td>${sn.kcal && sn.kcal[0] ? fmt(sn.kcal[0]) : '–'}</td>
            <td>${sn.prot && sn.prot[0] ? sn.prot[0] + ' g' : '–'}</td>
            <td>${sn.sets && sn.sets[1] ? `<span class="mini-bar"><i style="width:${pct(sn.sets[0], sn.sets[1])}%"></i></span>${pct(sn.sets[0], sn.sets[1])}%` : '–'}</td>
            <td>${dash(ci.steps, fmt)}</td><td>${dash(ci.sleep, (x) => x + ' h')}</td>
            <td>${ci.water ? +(ci.water * 0.25).toFixed(2) + ' L' : '–'}</td><td>${dash(ci.energy)}</td>
            <td class="wrapcell">${esc([ci.off && 'Off-plan: ' + ci.off, ci.note].filter(Boolean).join(' · ')) || '–'}</td>
          </tr>`; }).join('')}</tbody>
        </table></div>` : '<p class="muted small">Nothing logged in this month yet.</p>'}
      </section>

      ${due && !due.done ? '' : review}

      ${syncCard()}

      <section class="card">
        <div class="card-head"><h2>Backup</h2><span class="muted small">${S.ui.lastExport ? `last export ${niceDate(S.ui.lastExport)}` : 'never exported'}</span></div>
        <p class="muted small">${syncOn()
          ? 'Cloud sync is on, so your data is also safe in your GitHub repo. Export is still how you send Claude your month-end review.'
          : 'Without sync, your data lives only in this browser. Clearing browser data or switching phones erases it, so turn on sync above, or export a backup every week or two and keep it in Google Drive.'}</p>
        <p class="muted small" style="margin-top:8px">${persisted === true ? '✓ This browser has marked your data as <b>protected</b> from automatic cleanup.' : 'Tip: add the site to your home screen. Browsers then protect its data from automatic cleanup.'}</p>
        <p class="muted small" style="margin-top:8px"><b>Import</b> only accepts a <code>fit-plan-backup-….json</code> file exported from this site. It replaces what is on this phone now.</p>
        <div class="actions">
          <button class="btn" data-act="export">Export backup</button>
          <button class="btn ghost" data-act="pick-import">Import backup</button>
          <input type="file" accept=".json,application/json" data-act="import" id="importFile" hidden>
          <button class="btn danger" data-act="reset">Reset everything</button>
        </div>
      </section>`;
  }

  function syncCard() {
    if (syncOn()) {
      return `<section class="card sync-card" id="sync">
        <div class="card-head"><h2>Sync across devices</h2><span class="muted small">on</span></div>
        <p class="small">Saving to your private repo <b>${esc(SY.repo)}</b>. Every device you connect shows the same data.</p>
        <p class="small" id="syncStatus">${syncStatusHTML()}</p>
        <div class="actions">
          <button class="btn" data-act="sync-now">Sync now</button>
          <a class="btn ghost" href="https://github.com/${esc(SY.repo)}/commits" target="_blank" rel="noopener">Version history</a>
          <button class="btn danger" data-act="sync-off">Disconnect this device</button>
        </div>
        <p class="muted small" style="margin-top:10px">New phone or laptop? Open this site there, come to Progress → Sync, paste your token, and your full history downloads.</p>
      </section>`;
    }
    return `<section class="card sync-card" id="sync">
      <div class="card-head"><h2>Sync across devices</h2><span class="muted small">free · private · off</span></div>
      <p class="small">Keep your records in your own <b>private GitHub repo</b> instead of only in this browser: same data on phone and laptop, nothing lost if you clear the browser or change phones, and every past version kept.</p>
      <details class="how">
        <summary>One-time setup (5 minutes)</summary>
        <ol class="steps">
          <li>Create a <b>private</b> repo: <a href="https://github.com/new" target="_blank" rel="noopener">github.com/new</a> → name <code>fit-data</code> → choose <b>Private</b> → tick <b>Add a README file</b> → Create.</li>
          <li>Create a token: <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → Fine-grained token</a> → name <code>fit-plan sync</code> → expiration: the longest offered → <b>Repository access: Only select repositories → fit-data</b> → <b>Permissions → Repository permissions → Contents: Read and write</b> → Generate → copy it.</li>
          <li>Paste it below and tap Connect. Do the same on each device (keep the token in your password manager or Google Keep).</li>
        </ol>
        <p class="muted small">The token can only read/write that one private repo. It stays on your device and is never included in exports.</p>
      </details>
      <div class="ci-grid sync-grid">
        <label class="field"><span>Private repo</span><span class="inwrap"><input type="text" id="syRepo" value="${esc((SY.lastRepo) || 'prince-vats/fit-data')}" autocomplete="off" autocapitalize="off" spellcheck="false"></span></label>
        <label class="field"><span>Token</span><span class="inwrap"><input type="password" id="syToken" placeholder="github_pat_…" autocomplete="off" autocapitalize="off" spellcheck="false"></span></label>
      </div>
      <p class="small" id="syncErr" role="alert"></p>
      <div class="actions"><button class="btn" data-act="sync-connect">Connect</button></div>
    </section>`;
  }

  function reviewCard(m, hot) {
    const mo = S.mo[m] || {};
    const end = lastOfMonth(m);
    const f = (key, label) => `<label class="field"><span>${label}</span><span class="inwrap"><input type="number" inputmode="decimal" step="0.5" min="0" data-mo="${key}" data-m="${m}" value="${mo[key] ?? ''}" placeholder="–"><em>cm</em></span></label>`;
    return `<section class="card review ${hot ? 'hot' : ''}" id="review">
      <div class="card-head"><h2>Month-end review · ${monthLabel(m)}</h2><span class="muted small">do it on ${longDate(end)}</span></div>
      <ol class="steps">
        <li>That morning: log <b>weight</b> and <b>waist</b> in the daily check-in.</li>
        <li>Measure the rest with the tape (relaxed, same spot each month):
          <div class="ci-grid">${f('hips', 'Hips (widest)')}${f('chest', 'Chest (nipple line)')}${f('arm', 'Upper arm (mid)')}${f('thigh', 'Thigh (mid)')}</div></li>
        <li>Take front, side and back <b>photos</b> in the same light. Keep them in your gallery, not here.
          <label class="item ${mo.photos ? 'done' : ''}" style="margin-top:8px"><input type="checkbox" data-mo-c="photos" data-m="${m}" ${mo.photos ? 'checked' : ''}><span class="tick" aria-hidden="true"></span><span class="item-main"><span class="item-name">Photos taken</span></span></label></li>
        <li>How did the month go? Energy, hunger, what was hard, injuries, blood-test results:
          <label class="field wide"><span class="inwrap tall"><textarea rows="3" maxlength="1000" data-mo-t="feel" data-m="${m}" placeholder="Write a few honest lines">${esc(mo.feel || '')}</textarea></span></label></li>
        <li><b>Export</b> and send the file to Claude <b>with next month’s mess menu</b>.</li>
      </ol>
      <div class="actions"><button class="btn" data-act="export">Export review file</button></div>
    </section>`;
  }

  function chart(pts) {
    const Wd = 420, H = 200, PL = 34, PR = 12, PT = 16, PB = 26;
    const a = pts[0].id, b = pts[pts.length - 1].id, span = Math.max(1, dayDiff(a, b));
    const trend = pts.map((p) => ({ id: p.id, v: avgWeightAround(p.id) }));
    const vs = pts.map((p) => p.v);
    const lo = Math.floor(Math.min(...vs) - 0.5), hi = Math.ceil(Math.max(...vs) + 0.5);
    const x = (id) => PL + (dayDiff(a, id) / span) * (Wd - PL - PR);
    const y = (v) => PT + ((hi - v) / (hi - lo)) * (H - PT - PB);
    const steps = hi - lo <= 4 ? 1 : hi - lo <= 10 ? 2 : 5;
    let grid = '';
    for (let g = Math.ceil(lo / steps) * steps; g <= hi; g += steps) grid += `<line x1="${PL}" x2="${Wd - PR}" y1="${y(g)}" y2="${y(g)}" class="gl"/><text x="${PL - 6}" y="${y(g) + 4}" text-anchor="end" class="lbl">${g}</text>`;
    const path = trend.map((p, i) => `${i ? 'L' : 'M'}${x(p.id).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const dots = pts.map((p) => `<circle cx="${x(p.id).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${pts.length > 40 ? 2.5 : 3.5}" class="raw"/>`).join('');
    const last = trend[trend.length - 1];
    return `<svg class="spark" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="Morning weight from ${niceDate(a)} to ${niceDate(b)}">
      ${grid}${dots}<path d="${path}"/>
      <circle cx="${x(last.id)}" cy="${y(last.v)}" r="5" class="end"/>
      <text x="${Math.min(x(last.id), Wd - PR - 30)}" y="${y(last.v) - 10}" text-anchor="middle">${r1(last.v)}</text>
      <text x="${PL}" y="${H - 8}" class="lbl">${niceDate(a)}</text>
      <text x="${Wd - PR}" y="${H - 8}" text-anchor="end" class="lbl">${niceDate(b)}</text>
    </svg>`;
  }

  /* ============================================================
     EVENTS
     ============================================================ */
  const dayOfKey = (k) => k.split('|')[0];

  document.addEventListener('change', (e) => {
    const t = e.target, act = t.dataset.act;
    if (act === 'food' || act === 'shop') {
      const store = act === 'food' ? S.c : S.shop;
      if (t.checked) store[t.dataset.k] = 1; else delete store[t.dataset.k];
      t.closest('.item').classList.toggle('done', t.checked);
      if (act === 'food') { snap(dayOfKey(t.dataset.k)); save(); refreshSummaries(); }
      else { save(); rerenderKeepScroll(); }
    } else if (act === 'kg') {
      if (t.value === '' || !num(t.value)) delete S.kg[t.dataset.k]; else S.kg[t.dataset.k] = String(+t.value);
      save();
    } else if (t.dataset.ci) {
      const id = t.dataset.day;
      S.ci[id] = S.ci[id] || {};
      if (t.value === '' || !num(t.value)) delete S.ci[id][t.dataset.ci]; else S.ci[id][t.dataset.ci] = +t.value;
      save();
    } else if (t.dataset.ciT) {
      const id = t.dataset.day, f = t.dataset.ciT, s = str(t.value, CI_TXT[f] || 200);
      S.ci[id] = S.ci[id] || {};
      if (s) S.ci[id][f] = s; else delete S.ci[id][f];
      save();
    } else if (t.dataset.mo || t.dataset.moT || t.dataset.moC) {
      const m = t.dataset.m; S.mo[m] = S.mo[m] || {};
      if (t.dataset.mo) { if (t.value === '' || !num(t.value)) delete S.mo[m][t.dataset.mo]; else S.mo[m][t.dataset.mo] = +t.value; }
      else if (t.dataset.moT) { const s = str(t.value, 1000); if (s) S.mo[m].feel = s; else delete S.mo[m].feel; }
      else { if (t.checked) S.mo[m].photos = 1; else delete S.mo[m].photos; t.closest('.item').classList.toggle('done', t.checked); }
      save();
    } else if (act === 'import') {
      const f = t.files && t.files[0];
      t.value = ''; // allow picking the same file again later
      if (f) importBackup(f);
    }
  });

  document.addEventListener('toggle', (e) => {
    if (e.target.dataset && e.target.dataset.act === 'seenhow' && !e.target.open) { S.ui.seenHow = 1; saveQuiet(); }
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
      snap(dayOfKey(k)); save(); refreshSummaries();
      const rest = +b.dataset.rest;
      if (on && rest > 0) startTimer(rest);
    } else if (act === 'dinner') {
      S.d[b.dataset.day] = b.dataset.v; snap(b.dataset.day); save(); rerenderKeepScroll();
    } else if (act === 'water') {
      const id = parse().id; S.ci[id] = S.ci[id] || {};
      const n = +b.dataset.n;
      S.ci[id].water = S.ci[id].water === n ? n - 1 : n;
      save();
      const w = S.ci[id].water;
      $$('.glass').forEach((g) => g.classList.toggle('full', +g.dataset.n <= w));
      $('#waterTxt').textContent = waterText(w);
    } else if (act === 'rate') {
      const id = b.dataset.day, f = b.dataset.f, n = +b.dataset.n;
      S.ci[id] = S.ci[id] || {};
      if (S.ci[id][f] === n) delete S.ci[id][f]; else S.ci[id][f] = n;
      save();
      $$(`button[data-act="rate"][data-f="${f}"]`).forEach((x) => { const on = +x.dataset.n === S.ci[id][f]; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    } else if (act === 'pm') {
      S.ui.pm = b.dataset.m; saveQuiet(); rerenderKeepScroll();
    } else if (act === 'wakelock') {
      toggleWake();
    } else if (act === 'sync-connect') {
      const err = $('#syncErr'); err.textContent = ''; b.disabled = true; b.textContent = 'Connecting…';
      connectSync($('#syRepo').value, $('#syToken').value)
        .then(() => { rerenderKeepScroll(); })
        .catch((x) => { err.innerHTML = `<span class="sy sy-error">${esc(x.message)}</span>`; b.disabled = false; b.textContent = 'Connect'; });
    } else if (act === 'sync-now') {
      syncNow();
    } else if (act === 'sync-off') {
      if (confirm('Stop syncing on this device?\n\nYour data stays on this phone and in your GitHub repo. You can reconnect any time with a token.')) {
        const repo = SY.repo; disconnectSync(); SY.lastRepo = repo; saveSync(); rerenderKeepScroll();
      }
    } else if (act === 'pick-import') {
      $('#importFile').click();
    } else if (act === 'export') {
      doExport();
      if (parse().view === 'progress') rerenderKeepScroll();
    } else if (act === 'reset') {
      const msg = syncOn()
        ? 'Erase ALL ticks, weights, check-ins and history on this phone AND in your cloud copy (all synced devices)?\n\nOld versions stay in your GitHub repo history, but export a backup first if you might need it.'
        : 'Erase ALL ticks, weights, check-ins and history on this phone?\n\nExport a backup first if you might need it.';
      if (confirm(msg)) { S = blank(); save(); route(); }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (S.ui.wantWake && !wakeLock && 'wakeLock' in navigator) toggleWake();
      if (syncOn() && (!SY.at || Date.now() - new Date(SY.at) > 20000)) syncNow(); // pick up changes from other devices
    } else if (syncOn() && SY.dirty) {
      lastPush = 0; syncNow(); // leaving the app: upload right away
    }
  });
  window.addEventListener('online', () => { if (syncOn()) syncNow(); });

  /* ---------------- offline support ---------------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  ensureSnaps();
  route();
  if (syncOn()) { setSync(SY.err ? 'error' : 'ok', SY.err); syncNow(); }
})();
