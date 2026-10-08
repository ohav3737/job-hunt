// ---------- נתונים ----------
const STORE_KEY = 'jobhunt.v1';
const STATUSES = [
  { id: 'new', label: 'חדשה' },
  { id: 'saved', label: 'שמרתי' },
  { id: 'applied', label: 'הגשתי' },
  { id: 'interview', label: 'ראיון' },
  { id: 'process', label: 'בתהליך' },
  { id: 'offer', label: 'הצעה' },
  { id: 'rejected', label: 'נדחיתי' },
  { id: 'skip', label: 'לא רלוונטי' },
];
const STATUS_LABEL = Object.fromEntries(STATUSES.map(s => [s.id, s.label]));

let state = load();
const ui = { view: 'jobs', cat: 'all', region: 'core', list: state.profile.cv.trim() ? 'best' : 'all', order: 'rec', q: '', trackSort: 'date', trackFilter: 'active', source: 'all', city: '', noexp: false, age: 'week' };

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign({ jobs: [], profile: { cv: '', extraSkills: [], removedSkills: [] } }, JSON.parse(raw));
  } catch (e) { /* אחסון לא זמין */ }
  return { jobs: [], profile: { cv: '', extraSkills: [], removedSkills: [] } };
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast('לא הצלחתי לשמור במכשיר'); }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }) : '';
const fmtStamp = d => d.length > 10
  ? new Date(d).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
  : fmtDate(d);
function timeAgo(d) {
  if (!d) return '';
  const t = new Date(d.length <= 10 ? d + 'T12:00' : d).getTime();
  if (isNaN(t)) return '';
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 60) return min <= 1 ? 'עכשיו' : `לפני ${min} דקות`;
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? 'לפני שעה' : h === 2 ? 'לפני שעתיים' : `לפני ${h} שעות`;
  const days = Math.round(h / 24);
  if (days < 7) return days === 1 ? 'אתמול' : days === 2 ? 'לפני יומיים' : `לפני ${days} ימים`;
  const w = Math.round(days / 7);
  if (days < 30) return w === 1 ? 'לפני שבוע' : w === 2 ? 'לפני שבועיים' : `לפני ${w} שבועות`;
  const m = Math.round(days / 30);
  return m === 1 ? 'לפני חודש' : `לפני ${m} חודשים`;
}
const postedTime = j => new Date(j.postedAt ? (j.postedAt.length <= 10 ? j.postedAt + 'T12:00' : j.postedAt) : (j.dateAdded || '2000-01-01') + 'T00:00').getTime() || 0;
const fmtMoney = n => '₪' + Math.round(n / 1000) + 'K';
const $ = id => document.getElementById(id);

// הפרופיל בפועל: כישורים שזוהו בקו"ח + שהוספת ידנית − שהסרת
function profile() {
  const p = state.profile;
  const detected = Engine.extractSkills(p.cv);
  (p.removedSkills || []).forEach(id => detected.delete(id));
  (p.extraSkills || []).forEach(id => detected.add(id));
  return { cv: '', extraSkills: [...detected] };
}

const cache = new Map();
function analysis(job) {
  const key = job.id + '|' + job.updated + '|' + profileKey;
  if (!cache.has(key)) cache.set(key, Engine.analyze(job, profile()));
  return cache.get(key);
}
let profileKey = 0;
function profileChanged() { profileKey++; cache.clear(); }

// ---------- ניווט ----------
const TITLES = { jobs: 'משרות', track: 'מעקב הגשות', search: 'חיפוש משרות', cv: 'קורות חיים' };
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
function go(view) {
  ui.view = view;
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  $('title').textContent = TITLES[view];
  render();
  window.scrollTo(0, 0);
}

function chips(el, items, current, onPick) {
  el.innerHTML = items.map(([id, label]) => `<button class="chip ${id === current ? 'on' : ''}" data-id="${id}">${esc(label)}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('.chip'); if (b) onPick(b.dataset.id); };
}

// ---------- מסך משרות ----------
const CATS = [['all', 'כל התחומים'], ['pm', 'ניהול פרויקטים'], ['product', 'מוצר'], ['analyst', 'אנליסט'], ['ops', 'תפעול / תעשייה'], ['consulting', 'ייעוץ'], ['other', 'אחר']];
const SUBS = ['BI', 'דאטה', 'מוצר', 'שיווק', 'עסקי', 'פיננסי', 'תפעולי'];
const REGIONS = [['ta', 'ת"א + רמת גן'], ['core', 'ת"א והסביבה'], ['center', 'כל המרכז'], ['all', 'כל הארץ']];
const AGES = [['day', '24 שעות'], ['3days', '3 ימים'], ['week', 'שבוע'], ['month', 'חודש'], ['any', 'הכל']];
const ORDERS = [['rec', 'מומלץ'], ['match', 'התאמה גבוהה'], ['date', 'הכי חדשות']];
const DEFAULTS = { cat: 'all', sub: 'all', region: 'core', city: '', age: 'week', noexp: false, juniorTitle: false, source: 'all', order: 'rec' };
const label = (list, id) => (list.find(x => x[0] === id) || [])[1] || id;

// הסינון עצמו: מחזיר את המשרות שעוברות את כל הסינונים, ממוינות
function filteredJobs(f = ui) {
  const allowed = { ta: ['ta', 'remote', 'unknown'], core: ['ta', 'core', 'remote', 'unknown'], center: ['ta', 'core', 'center', 'remote', 'unknown'], all: null }[f.region];
  const terms = searchTerms(f.q);
  const bypass = terms.length && f.searchAll;
  const maxAge = { day: 1, '3days': 3, week: 7, month: 31 }[f.age];
  let list = state.jobs.map(j => ({ j, a: analysis(j) })).filter(({ j, a }) => {
    if (a.experience.isSenior) return false; // משרות בכירות / ראש צוות לא מוצגות בכלל
    if (terms.length && !matchesSearch(j, terms)) return false;
    if (bypass) return true;
    if (j.status === 'skip' || j.status === 'rejected') return false;
    if (f.list === 'best' && (a.verdict.level !== 'yes' || !entryLevel(j, a))) return false;
    if (f.list === 'fit' && (a.verdict.level === 'no' || !entryLevel(j, a))) return false;
    if (f.juniorTitle && !juniorTitle(j)) return false;
    if (f.cat !== 'all' && a.category.id !== f.cat) return false;
    if (f.cat === 'analyst' && f.sub && f.sub !== 'all' && !a.category.label.endsWith('· ' + f.sub)) return false;
    if (f.city) { if (!Engine.jobCities(j.location || j.description || '').includes(f.city)) return false; }
    else if (allowed && !allowed.includes(a.region)) return false;
    if (maxAge && Date.now() - postedTime(j) > maxAge * 86400000) return false;
    if (f.source !== 'all' && j.source !== f.source) return false;
    if (f.noexp && !noExperience(j, a)) return false;
    if (f.roleTerms && !f.roleTerms.some(t => (j.title + ' ' + (j.description || '')).toLowerCase().includes(t))) return false;
    return true;
  });
  if (f.order === 'match') list.sort((x, y) => y.a.match - x.a.match);
  else if (f.order === 'date') list.sort((x, y) => postedTime(y.j) - postedTime(x.j));
  else if (f.list === 'all' && !state.profile.cv.trim()) list.sort((x, y) => x.a.sortKey - y.a.sortKey);
  else list.sort((x, y) => worth(y.j, y.a) - worth(x.j, x.a));
  if (terms.length) list.sort((x, y) => titleHits(y.j, terms) - titleHits(x.j, terms));
  return { list, terms, bypass };
}

// תגיות של הסינונים הפעילים (אפשר להסיר כל אחת ב-✕)
function activeFilters() {
  const out = [];
  if (ui.cat !== 'all') out.push(['cat', label(CATS, ui.cat) + (ui.cat === 'analyst' && ui.sub !== 'all' ? ' · ' + ui.sub : '')]);
  if (ui.city) out.push(['city', '📍 ' + ui.city]);
  else if (ui.region !== DEFAULTS.region) out.push(['region', '📍 ' + label(REGIONS, ui.region)]);
  if (ui.age !== DEFAULTS.age) out.push(['age', '🕒 ' + label(AGES, ui.age)]);
  if (ui.noexp) out.push(['noexp', '🎓 ללא ניסיון']);
  if (ui.juniorTitle) out.push(['juniorTitle', '🌱 ג׳וניור בכותרת']);
  if (ui.source !== 'all') out.push(['source', ui.source]);
  if (ui.order !== 'rec') out.push(['order', '↕ ' + label(ORDERS, ui.order)]);
  return out;
}
function clearFilter(k) {
  if (k === 'cat') { ui.cat = 'all'; ui.sub = 'all'; } else if (k === 'city') ui.city = ''; else ui[k] = DEFAULTS[k];
  renderJobs();
}

function renderJobs() {
  const hasCv = !!state.profile.cv.trim();
  const segs = hasCv ? [['best', '🔥 הכי שוות'], ['fit', 'מתאימות לי'], ['all', 'הכל']] : [['all', 'כל המשרות']];
  if (!hasCv) ui.list = 'all';
  $('listSeg').innerHTML = segs.map(([id, t]) => `<button class="${ui.list === id ? 'on' : ''}" data-id="${id}">${t}</button>`).join('');
  $('listSeg').onclick = e => { const b = e.target.closest('button'); if (b) { ui.list = b.dataset.id; renderJobs(); } };
  $('listSeg').style.display = segs.length > 1 ? '' : 'none';

  const jtCount = filteredJobs({ ...ui, juniorTitle: true }).list.length;
  $('juniorBtn').innerHTML = `🌱 ג׳וניור בכותרת <b>${jtCount}</b>`;
  $('juniorBtn').classList.toggle('on', !!ui.juniorTitle);
  const act = activeFilters();
  $('filterCount').textContent = act.length || '';
  $('filterBtn').classList.toggle('has', act.length > 0);
  $('activePills').innerHTML = act.map(([k, t]) => `<button class="pill" onclick="clearFilter('${k}')">${esc(t)} <span>✕</span></button>`).join('')
    + (act.length > 1 ? `<button class="pill clear" onclick="Object.assign(ui, DEFAULTS);renderJobs()">ניקוי הכל</button>` : '');

  $('cvNudge').style.display = hasCv ? 'none' : 'block';
  $('roleFilter').style.display = ui.roleTerms ? 'flex' : 'none';
  if (ui.roleTerms) $('roleFilterText').textContent = 'מסונן לפי תפקיד: ' + ui.roleTerms[0];

  const { list, terms, bypass } = filteredJobs();
  const freshCount = state.jobs.filter(j => j.fresh).length;
  $('feedInfo').innerHTML = `<b>${list.length}</b> משרות` + (freshCount ? ` · <span style="color:var(--good)">${freshCount} חדשות</span>` : '') +
    (state.feedUpdated ? ` · עודכן ${timeAgo(state.feedUpdated)}` : '');

  if (!state.jobs.length) {
    $('jobList').innerHTML = `<div class="empty"><div class="big">🔎</div><p><b>טוען משרות…</b></p></div>`;
    return;
  }
  let head = '';
  if (terms.length) {
    const total = state.jobs.filter(j => matchesSearch(j, terms)).length;
    if (bypass) head = `<button class="pill clear" style="margin-bottom:8px" onclick="ui.searchAll=false;renderJobs()">חזרה לסינונים</button>`;
    else if (total > list.length) head = `<button class="pill clear" style="margin-bottom:8px" onclick="ui.searchAll=true;renderJobs()">עוד ${total - list.length} תוצאות מוסתרות בגלל הסינון · הצגה</button>`;
  }
  if (!list.length) {
    $('jobList').innerHTML = head + `<div class="empty"><div class="big">🤷‍♀️</div><p>אין משרות שמתאימות לסינון הזה</p>
      ${act.length || ui.list !== 'all' ? `<button class="btn secondary" onclick="Object.assign(ui, DEFAULTS, {list: 'all'});renderJobs()">הרחבת החיפוש</button>` : ''}</div>`;
    return;
  }
  $('jobList').innerHTML = head + list.map(({ j, a }) => jobCard(j, a)).join('');
}

// ---------- חלון הסינון ----------
function openFilters() {
  const draw = () => {
    const sources = [...new Set(state.jobs.map(j => j.source).filter(Boolean))].sort();
    const counts = {};
    state.jobs.forEach(j => Engine.jobCities(j.location || '').forEach(c => counts[c] = (counts[c] || 0) + 1));
    const cities = ['תל אביב', 'רמת גן', ...Object.keys(counts).filter(c => c !== 'תל אביב' && c !== 'רמת גן').sort((a, b) => counts[b] - counts[a])];
    const group = (title, key, items, cur) => `<div class="f-group"><div class="f-title">${title}</div>
      <div class="f-chips">${items.map(([id, t]) => `<button class="chip ${id === cur ? 'on' : ''}" data-k="${key}" data-v="${esc(id)}">${esc(t)}</button>`).join('')}</div></div>`;
    $('sheetBody').innerHTML = `
      ${group('תחום', 'cat', CATS, ui.cat)}
      ${ui.cat === 'analyst' ? group('סוג אנליסט', 'sub', [['all', 'הכל'], ...SUBS.map(x => [x, x])], ui.sub) : ''}
      <div class="f-group"><div class="f-title">מיקום</div>
        <div class="f-chips">${REGIONS.map(([id, t]) => `<button class="chip ${!ui.city && id === ui.region ? 'on' : ''}" data-k="region" data-v="${id}">${t}</button>`).join('')}</div>
        <select class="input" id="fCity" style="margin-top:8px"><option value="">או עיר ספציפית…</option>
          ${cities.map(c => `<option value="${esc(c)}" ${ui.city === c ? 'selected' : ''}>${esc(c)} (${counts[c] || 0})</option>`).join('')}</select>
      </div>
      ${group('פורסמו ב…', 'age', AGES, ui.age)}
      <div class="f-group"><div class="f-title">ניסיון</div>
        <label class="toggle"><input type="checkbox" id="fNoexp" ${ui.noexp ? 'checked' : ''}><span>רק משרות ללא ניסיון</span></label>
        <label class="toggle" style="margin-top:10px"><input type="checkbox" id="fJunior" ${ui.juniorTitle ? 'checked' : ''}><span>רק "ג׳וניור" בשם התפקיד</span></label></div>
      ${group('מיון', 'order', ORDERS, ui.order)}
      ${group('מקור', 'source', [['all', 'כל המקורות'], ...sources.map(x => [x, x])], ui.source)}
      <div class="f-footer">
        <button class="btn secondary" id="fReset">איפוס</button>
        <button class="btn" id="fApply" style="flex:1">הצגת ${filteredJobs().list.length} משרות</button>
      </div>`;
    $('sheetBody').querySelectorAll('.chip[data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k;
      ui[k] = b.dataset.v;
      if (k === 'cat') ui.sub = 'all';
      if (k === 'region') ui.city = '';
      draw();
    });
    $('fCity').onchange = e => { ui.city = e.target.value; draw(); };
    $('fNoexp').onchange = e => { ui.noexp = e.target.checked; draw(); };
    $('fJunior').onchange = e => { ui.juniorTitle = e.target.checked; draw(); };
    $('fReset').onclick = () => { Object.assign(ui, DEFAULTS); draw(); };
    $('fApply').onclick = () => { closeSheet(); renderJobs(); };
  };
  openSheet('סינון', '', { key: 'filters' });
  draw();
}
$('filterBtn').onclick = openFilters;
$('juniorBtn').onclick = () => { ui.juniorTitle = !ui.juniorTitle; renderJobs(); };

// ---------- חיפוש חופשי ----------
// מחפש בכל הטקסט של המשרה. כמה מילים = כולן צריכות להופיע. "בגרשיים" = ביטוי מדויק.
const normSearch = t => ' ' + String(t || '').toLowerCase().replace(/[\u2019`׳]/g, "'").replace(/[״"]/g, '"')
  .replace(/\s*[\/.]\s*(ית|ת|ה)(?=[\s,.)\-|]|$)/g, '').replace(/\s+/g, ' ') + ' ';
const searchCache = new Map();
function searchText(j) {
  if (!searchCache.has(j.id)) searchCache.set(j.id, normSearch([j.title, j.company, j.location, j.source, j.description].join(' ')));
  return searchCache.get(j.id);
}
function searchTerms(q) {
  const out = [];
  String(q || '').replace(/"([^"]+)"|(\S+)/g, (m, phrase, word) => { out.push(normSearch(phrase || word).trim()); });
  return out.filter(Boolean);
}
const matchesSearch = (j, terms) => { const t = searchText(j); return terms.every(w => t.includes(w)); };
const titleHits = (j, terms) => { const t = normSearch(j.title); return terms.filter(w => t.includes(w)).length; };

// כמה שווה להגיש: התאמה, סיכוי לעבור סינון, וטריות (משרה חדשה = פחות מתחרים)
function worth(j, a) {
  const days = (Date.now() - postedTime(j)) / 86400000;
  const fresh = days < 1 ? 8 : days < 3 ? 5 : days < 7 ? 2 : days < 14 ? 0 : -5;
  const field = a.category.priority <= 2 ? 3 : 0;
  return 0.55 * a.match + 0.45 * a.screenPct + fresh + field;
}
// משרת כניסה: נאמר במפורש ג׳וניור / ללא ניסיון / בוגרים, או עד שנתיים ניסיון
function entryLevel(j, a) {
  if (a.experience.isSenior) return false;
  if (a.experience.years !== null && a.experience.years <= 2) return true;
  return a.experience.isJunior || noExperience(j, a);
}
const JUNIOR_TITLE = /junior|jr\.?\b|ג['׳]?וניור|entry[- ]?level|graduate|grad\b|בוגר|ללא ניסיון|ללא נסיון|associate|trainee|מתלמד|הכשרה|first job|משרה ראשונה|סטאז/i;
const juniorTitle = j => JUNIOR_TITLE.test(j.title || '');

function noExperience(j, a) {
  if (a.experience.isSenior || a.experience.years > 0) return false;
  return a.experience.years === 0 || a.experience.isJunior || /ללא ניסיון|ללא נסיון|no experience|entry[- ]level|graduate|בוגר/i.test(j.title + ' ' + (j.description || ''));
}
function ringColor(p) { return p >= 70 ? 'var(--good)' : p >= 55 ? 'var(--warn)' : 'var(--bad)'; }

function jobCard(j, a) {
  const noCv = !state.profile.cv.trim();
  const city = (Engine.jobCities(j.location || '')[0]) || a.city || (j.location || '').split(',')[0];
  return `<div class="card job" onclick="openJob('${j.id}')">
    <div>
      <h3 dir="auto">${esc(j.title || 'משרה ללא שם')}</h3>
      <div class="meta">${esc(j.company || '')}${j.company && city ? ' · ' : ''}${esc(city)}</div>
      <div class="meta small">${esc(a.category.label)} · ${esc(a.experience.level)}${j.postedAt ? ' · ' + timeAgo(j.postedAt) : ''}</div>
    </div>
    ${noCv ? '' : `<div class="ring" style="--p:${a.match};--c:${ringColor(a.match)}"><span>${a.match}%</span></div>`}
    <div class="tags">
      ${noCv ? '' : `<span class="badge ${a.verdict.level}">${esc(a.verdict.text)}</span>`}
      ${j.fresh ? '<span class="badge yes">חדש</span>' : ''}
      ${j.status !== 'new' ? `<span class="badge accent">${STATUS_LABEL[j.status]}</span>` : ''}
    </div>
  </div>`;
}

// ---------- פרטי משרה ----------
function openSheet(title, html, opts = {}) {
  const sheet = $('sheet').querySelector('.sheet');
  const already = $('sheet').classList.contains('open');
  const keepScroll = already && opts.key && sheet.dataset.key === opts.key;
  const top = sheet.scrollTop;
  $('sheetTitle').textContent = title;
  $('sheetBody').innerHTML = html;
  sheet.classList.toggle('full', !!opts.full);
  sheet.dataset.key = opts.key || '';
  $('sheet').classList.add('open');
  sheet.scrollTop = keepScroll ? top : 0;
  // כפתור "אחורה" / החלקה מהצד באייפון סוגרים את הדף
  if (!already) history.pushState({ sheet: true }, '');
}
function closeSheet() {
  if (!$('sheet').classList.contains('open')) return;
  $('sheet').classList.remove('open');
  if (history.state && history.state.sheet) history.back();
}
window.addEventListener('popstate', () => { $('sheet').classList.remove('open'); if (ui.view === 'jobs') renderJobs(); });
$('sheetClose').onclick = closeSheet;
$('sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });

const MARK = { have: '✓', similar: '≈', partial: '~', missing: '✕' };
const STATE_LABEL = { have: 'יש לך', similar: 'יש לך כישור דומה', partial: 'קרוב חלקית', missing: 'חסר' };

function skillRows(list) {
  if (!list.length) return '<div class="muted small">לא זוהו</div>';
  const order = { have: 0, similar: 1, partial: 2, missing: 3 };
  return '<ul class="skill-list">' + [...list].sort((a, b) => order[a.state] - order[b.state]).map(r => `
    <li><span class="mark ${r.state}">${MARK[r.state]}</span>
      <div><b>${esc(r.name)}</b> <span class="muted small">${STATE_LABEL[r.state]}${r.via ? ': ' + esc(r.via.join(', ')) : ''}</span></div></li>`).join('') + '</ul>';
}

// מעצב את תיאור המשרה: כותרות, רשימות, והדגשת כישורים (ירוק = יש לך, אדום = חסר)
function formatDescription(text, a) {
  if (!text || !text.trim()) return '<div class="muted small">אין תיאור מלא. אפשר לפתוח את המשרה באתר המקורי.</div>';
  const states = {};
  [...a.skills.must, ...a.skills.nice].forEach(r => { states[r.id] = r.state; });
  const marks = [];
  Object.entries(states).forEach(([id, st]) => Engine.SKILL_BY_ID[id].aliases.map(x => x.trim()).filter(x => x.length > 1)
    .forEach(alias => marks.push({ alias, cls: st === 'have' ? 'kw-have' : st === 'missing' ? 'kw-miss' : 'kw-sim' })));
  marks.sort((x, y) => y.alias.length - x.alias.length);
  const hl = line => {
    let out = esc(line);
    marks.forEach(({ alias, cls }) => {
      const re = /^[a-z0-9 .\/&+#()-]+$/i.test(alias)
        ? new RegExp('(^|[^a-z0-9>])(' + esc(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=$|[^a-z0-9<])', 'gi')
        : new RegExp('()(' + esc(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'g');
      out = out.replace(re, (m, pre, word) => pre + `<mark class="${cls}">${word}</mark>`);
    });
    return out;
  };
  const HEAD = /^(תיאור (ה)?(משרה|תפקיד)|דרישות( התפקיד| המשרה)?|דרישות חובה|יתרון|יתרונות|מה (את|אתה|תעשו|תעשי|נדרש)|תחומי אחריות|על החברה|על התפקיד|כישורים|requirements|qualifications|responsibilities|what you.?ll do|about (the )?(role|company|us|you)|nice to have|the role|who you are|bonus points|description)[:\s]*$/i;
  let html = '', list = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[-•*·▪●◦]\s*/.test(line) || /^\d+[.)]\s+/.test(line);
    if (HEAD.test(line) || (line.length < 40 && /:$/.test(line))) {
      if (list) { html += '</ul>'; list = false; }
      html += `<h4>${esc(line.replace(/:$/, ''))}</h4>`;
    } else if (bullet) {
      if (!list) { html += '<ul>'; list = true; }
      html += `<li>${hl(line.replace(/^[-•*·▪●◦]\s*|^\d+[.)]\s+/, ''))}</li>`;
    } else {
      if (list) { html += '</ul>'; list = false; }
      html += `<p>${hl(line)}</p>`;
    }
  }
  return html + (list ? '</ul>' : '');
}

function openJob(id) {
  const j = state.jobs.find(x => x.id === id);
  if (!j) return;
  if (j.fresh) { j.fresh = false; save(); render(); }
  const a = analysis(j);
  const noCv = !state.profile.cv.trim();
  const missing = a.skills.must.filter(r => r.state === 'missing');
  const meta = [
    ['🏢', j.company || 'חברה לא צוינה'],
    ['📍', (j.location || a.city || 'מיקום לא ידוע') + ' · ' + a.regionLabel],
    j.postedAt && ['🕒', 'פורסמה ' + timeAgo(j.postedAt)],
    ['💼', a.category.label + ' · ' + a.experience.level],
    ['💰', `${fmtMoney(a.salary.min)}–${fmtMoney(a.salary.max)} ${a.salary.source === 'הערכה' ? '(הערכה)' : ''}`],
    j.source && ['🔗', 'מקור: ' + j.source + (j.alsoAt?.length ? ` (ועוד ${j.alsoAt.length} אתרים)` : '')],
  ].filter(Boolean);
  openSheet(j.title || 'משרה', `
    <div class="job-page">
      <h1 class="job-title" dir="auto">${esc(j.title)}</h1>
      <ul class="job-meta">${meta.map(([i, t]) => `<li><span>${i}</span><span dir="auto">${esc(t)}</span></li>`).join('')}</ul>

      <div class="job-actions">
        <button class="btn" onclick="applyJob('${j.id}')">📤 הגשת קו״ח</button>
        <button class="btn secondary" onclick="setStatus('${j.id}','${j.status === 'saved' ? 'new' : 'saved'}', true)">${j.status === 'saved' ? '★ שמורה' : '☆ שמירה'}</button>
        <button class="btn secondary" onclick="tailorFor('${j.id}')">התאמת קו״ח</button>
      </div>

      ${noCv ? '<div class="notice">📄 העלי קורות חיים בלשונית קו״ח כדי לראות כמה המשרה מתאימה לך.</div>' : `
      <div class="match-strip">
        <div class="ring" style="--p:${a.match};--c:${ringColor(a.match)}"><span>${a.match}%</span></div>
        <div style="flex:1">
          <div class="verdict-inline ${a.verdict.level}">${esc(a.verdict.text)}</div>
          <div class="small muted">סיכוי לעבור סינון: <b>${a.screenPct}%</b>${missing.length ? ' · חסר: ' + esc(missing.map(r => r.name).join(', ')) : ''}</div>
        </div>
      </div>`}

      <div class="section-title">תיאור המשרה</div>
      ${noCv ? '' : '<div class="small muted legend"><mark class="kw-have">יש לך</mark> <mark class="kw-sim">דומה</mark> <mark class="kw-miss">חסר</mark></div>'}
      <div class="card job-desc" dir="auto">${formatDescription(j.description, a)}</div>

      ${noCv ? '' : `
      <details class="card"><summary><b>ניתוח ההתאמה המלא</b></summary>
        ${a.reasons.length ? `<ul class="reasons" style="margin-top:10px">${a.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
        <div class="small muted" style="margin:10px 0 4px">דרישות חובה</div>${skillRows(a.skills.must)}
        ${a.skills.nice.length ? `<div class="small muted" style="margin:10px 0 4px">יתרון</div>${skillRows(a.skills.nice)}` : ''}
        <div class="small muted" style="margin-top:8px">${esc(a.degree.label)}</div>
      </details>`}

      <div class="section-title">סטטוס והערות</div>
      <div class="card">
        <div class="status-picker">${STATUSES.map(st => `<button class="chip ${j.status === st.id ? 'on' : ''}" onclick="setStatus('${j.id}','${st.id}', true)">${st.label}</button>`).join('')}</div>
        <div class="row small muted" style="margin-top:10px">
          <span>נוספה ${fmtDate(j.dateAdded)}</span>
          ${j.dateApplied ? `<span>· הוגשה ${fmtDate(j.dateApplied)}</span>` : ''}
        </div>
        <label class="field" style="margin:10px 0 0"><span>הערות</span>
          <textarea class="input" style="min-height:70px" onchange="setNotes('${j.id}', this.value)" placeholder="איש קשר, מועד ראיון, מה שאלו…">${esc(j.notes || '')}</textarea></label>
      </div>

      <div class="row" style="margin-top:12px">
        <button class="btn secondary" onclick="editJob('${j.id}')">עריכה</button>
        <span class="spacer"></span>
        <button class="btn danger" onclick="deleteJob('${j.id}')">מחיקה</button>
      </div>
    </div>
  `, { full: true, key: 'job:' + j.id });
}

// ---------- הגשה ----------
function applyJob(id) {
  const j = state.jobs.find(x => x.id === id);
  if (!j) return;
  const email = j.applyEmail;
  if (!email) {
    if (!j.url) { toast('אין קישור או מייל להגשה במשרה הזו'); return; }
    markPending(j); window.open(j.url, '_blank', 'noopener'); return;
  }
  const subject = `קורות חיים – ${j.title}`;
  const body = `שלום,\n\nמצורפים קורות החיים שלי למשרת ${j.title}${j.company && j.company !== 'חברה חסויה' ? ' ב' + j.company : ''}.\nאשמח לשוחח ולספר עוד.\n\nתודה,\n`;
  openSheet('הגשת קו״ח', `
    <div class="small muted" style="margin-bottom:12px">ההגשה למשרה הזו במייל: <b dir="ltr">${esc(email)}</b></div>
    <a class="btn block" style="display:block;text-align:center;text-decoration:none;margin-bottom:8px" href="mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}" onclick="markPending(state.jobs.find(x=>x.id==='${j.id}'))">✉️ פתיחת מייל מוכן</a>
    <div class="small muted" style="margin:0 2px 12px">במייל שייפתח, צרפי את קובץ קורות החיים (📎 ← "עיון" ← הקובץ שלך).</div>
    <button class="btn secondary block" style="margin-bottom:8px" onclick="shareCv('${j.id}')">📎 שליחת קובץ קו״ח דרך אפליקציה אחרת</button>
    ${j.url ? `<a class="btn secondary block" style="display:block;text-align:center;text-decoration:none" href="${esc(j.url)}" target="_blank" rel="noopener" onclick="markPending(state.jobs.find(x=>x.id==='${j.id}'))">או הגשה באתר המשרה ↗</a>` : ''}
  `, { key: 'apply:' + j.id });
}
async function shareCv(id) {
  const j = state.jobs.find(x => x.id === id);
  const file = await getCvFile();
  if (!file) { toast('צריך להעלות קובץ קורות חיים בלשונית קו״ח'); return; }
  const f = new File([file], state.profile.cvFile || file.name || 'cv.pdf', { type: file.type || 'application/pdf' });
  if (!navigator.canShare || !navigator.canShare({ files: [f] })) { toast('המכשיר הזה לא תומך בשיתוף קבצים'); return; }
  try { await navigator.clipboard.writeText(j.applyEmail || ''); } catch (e) {}
  try {
    await navigator.share({ files: [f], title: `קורות חיים – ${j.title}` });
    markPending(j);
    if (j.applyEmail) toast('כתובת המייל הועתקה. הדביקי אותה בשדה "אל"');
  } catch (e) { /* בוטל */ }
}
// אחרי שיוצאים להגשה, כשחוזרים לאפליקציה שואלים אם הוגש
function markPending(j) { if (j) { state.pendingApply = { id: j.id, at: Date.now() }; save(); } }
document.addEventListener('visibilitychange', () => {
  const p = state.pendingApply;
  if (document.hidden || !p || Date.now() - p.at < 8000) return;
  const j = state.jobs.find(x => x.id === p.id);
  state.pendingApply = null; save();
  if (!j || ['applied', 'interview', 'process', 'offer'].includes(j.status)) return;
  const bar = $('askApplied');
  bar.innerHTML = `<div>הגשת למשרה <b>${esc(j.title)}</b>?</div><div class="row" style="margin-top:8px">
    <button class="btn" onclick="setStatus('${j.id}','applied');$('askApplied').classList.remove('show');toast('נרשם במעקב ✓')">כן, הגשתי</button>
    <button class="btn secondary" onclick="$('askApplied').classList.remove('show')">עוד לא</button></div>`;
  bar.classList.add('show');
});

function setStatus(id, status, reopen) {
  const j = state.jobs.find(x => x.id === id);
  if (!j) return;
  j.status = status;
  if (['applied', 'interview', 'process', 'offer'].includes(status) && !j.dateApplied) j.dateApplied = today();
  (j.history = j.history || []).push({ status, date: today() });
  save();
  if (reopen) openJob(id);
  render();
}
function setNotes(id, v) { const j = state.jobs.find(x => x.id === id); if (j) { j.notes = v; save(); } }
function deleteJob(id) {
  if (!confirm('למחוק את המשרה?')) return;
  state.jobs = state.jobs.filter(x => x.id !== id);
  save(); closeSheet(); render();
}

// ---------- הוספה / עריכה ----------
$('addBtn').onclick = () => editJob(null);
function editJob(id) {
  const j = id ? state.jobs.find(x => x.id === id) : { title: '', company: '', location: '', url: '', description: '' };
  openSheet(id ? 'עריכת משרה' : 'משרה חדשה', `
    <label class="field"><span>קישור למשרה</span><input class="input" id="f_url" type="url" dir="ltr" value="${esc(j.url)}" placeholder="https://"></label>
    <label class="field"><span>תיאור המשרה ודרישות (הדביקי הכול)</span><textarea class="input" id="f_desc" style="min-height:180px">${esc(j.description)}</textarea></label>
    <label class="field"><span>שם התפקיד</span><input class="input" id="f_title" value="${esc(j.title)}"></label>
    <label class="field"><span>חברה</span><input class="input" id="f_company" value="${esc(j.company)}"></label>
    <label class="field"><span>מיקום</span><input class="input" id="f_loc" value="${esc(j.location)}" placeholder="יזוהה אוטומטית מהתיאור"></label>
    <button class="btn block" id="f_save">${id ? 'שמירה' : 'הוספה וניתוח'}</button>
  `);
  // ניחוש שם תפקיד ועיר מהתיאור כשמדביקים
  $('f_desc').addEventListener('input', () => {
    const d = $('f_desc').value;
    if (!$('f_title').value) { const first = d.split('\n').map(s => s.trim()).find(Boolean); if (first && first.length < 80) $('f_title').value = first; }
    if (!$('f_loc').value) { const c = Engine.detectCity(d).city; if (c) $('f_loc').value = c; }
  });
  $('f_save').onclick = () => {
    const data = { url: $('f_url').value.trim(), description: $('f_desc').value.trim(), title: $('f_title').value.trim(), company: $('f_company').value.trim(), location: $('f_loc').value.trim() };
    if (!data.title && !data.description) { toast('צריך לפחות שם תפקיד או תיאור'); return; }
    let target;
    if (id) { target = state.jobs.find(x => x.id === id); Object.assign(target, data); target.updated = Date.now(); }
    else { target = { id: uid(), ...data, status: 'new', dateAdded: today(), updated: Date.now(), history: [] }; state.jobs.unshift(target); }
    searchCache.delete(target.id);
    save(); render(); openJob(target.id);
  };
}

// ---------- מעקב ----------
function renderTrack() {
  const counts = s => state.jobs.filter(j => j.status === s).length;
  const applied = state.jobs.filter(j => j.dateApplied).length;
  $('pipeline').innerHTML = [
    ['שמרתי', counts('saved')], ['הגשתי', applied], ['ראיונות', counts('interview') + counts('process')], ['הצעות', counts('offer')],
  ].map(([k, v]) => `<div class="stat"><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');

  chips($('trackFilter'), [['active', 'פעילות'], ['all', 'הכל'], ...STATUSES.filter(s => s.id !== 'new').map(s => [s.id, s.label])], ui.trackFilter, v => { ui.trackFilter = v; renderTrack(); });
  chips($('trackSort'), [['date', 'לפי תאריך'], ['company', 'לפי חברה'], ['title', 'לפי תפקיד'], ['location', 'לפי מיקום'], ['status', 'לפי סטטוס']], ui.trackSort, v => { ui.trackSort = v; renderTrack(); });

  let list = state.jobs.filter(j => j.status !== 'new');
  if (ui.trackFilter === 'active') list = list.filter(j => !['rejected', 'skip'].includes(j.status));
  else if (ui.trackFilter !== 'all') list = list.filter(j => j.status === ui.trackFilter);
  const loc = j => j.location || analysis(j).city || '';
  const by = {
    date: (a, b) => (b.dateApplied || b.dateAdded || '').localeCompare(a.dateApplied || a.dateAdded || ''),
    company: (a, b) => (a.company || '').localeCompare(b.company || '', 'he'),
    title: (a, b) => (a.title || '').localeCompare(b.title || '', 'he'),
    location: (a, b) => loc(a).localeCompare(loc(b), 'he'),
    status: (a, b) => STATUSES.findIndex(s => s.id === a.status) - STATUSES.findIndex(s => s.id === b.status),
  }[ui.trackSort];
  list.sort(by);

  $('trackList').innerHTML = list.length ? list.map(j => `
    <div class="card track-row">
      <div onclick="openJob('${j.id}')" style="cursor:pointer"><b>${esc(j.title)}</b></div>
      <div class="sel"><select onchange="setStatus('${j.id}', this.value)">${STATUSES.map(s => `<option value="${s.id}" ${s.id === j.status ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div>
      <div class="small muted">${esc(j.company || '—')} · ${esc(loc(j) || '—')} · ${j.dateApplied ? 'הוגשה ' + fmtDate(j.dateApplied) : 'נשמרה ' + fmtDate(j.dateAdded)}</div>
    </div>`).join('')
    : '<div class="empty small">כאן יופיעו משרות שסימנת בסטטוס "שמרתי", "הגשתי", "ראיון" וכו׳.<br>פתחי משרה ובחרי לה סטטוס.</div>';

  // לפי חברה: כמה הגשות לכל חברה
  const groups = {};
  state.jobs.filter(j => j.status !== 'new').forEach(j => { const c = j.company || 'ללא שם חברה'; (groups[c] = groups[c] || []).push(j); });
  const names = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length || a.localeCompare(b, 'he'));
  $('companyList').innerHTML = names.length ? names.map(c => `
    <details class="card company-group">
      <summary>${esc(c)} <span class="spacer"></span><span class="badge accent">${groups[c].filter(j => j.dateApplied).length} הגשות</span></summary>
      ${groups[c].map(j => `<div class="small" style="margin-top:8px;cursor:pointer" onclick="openJob('${j.id}')">• ${esc(j.title)} · <span class="muted">${STATUS_LABEL[j.status]}${j.dateApplied ? ' · ' + fmtDate(j.dateApplied) : ''}</span></div>`).join('')}
    </details>`).join('') : '<div class="muted small" style="padding:0 4px">אין עדיין</div>';
}

// ---------- חיפוש ----------
const QUERIES = [
  { id: 'pm', label: 'ניהול פרויקטים', en: 'junior project manager OR project coordinator', he: 'רכז/ת פרויקטים' },
  { id: 'product', label: 'מוצר', en: 'junior product manager OR associate product manager OR product operations', he: 'מנהל/ת מוצר ג׳וניור' },
  { id: 'bi', label: 'BI / Power BI', en: 'junior BI analyst power bi', he: 'אנליסט/ית BI' },
  { id: 'data', label: 'דאטה אנליסט', en: 'junior data analyst', he: 'אנליסט/ית נתונים' },
  { id: 'productan', label: 'אנליסט מוצר', en: 'junior product analyst', he: 'אנליסט/ית מוצר' },
  { id: 'business', label: 'אנליסט עסקי', en: 'junior business analyst', he: 'אנליסט/ית עסקי' },
  { id: 'marketing', label: 'אנליסט שיווק', en: 'junior marketing analyst', he: 'אנליסט/ית שיווק' },
  { id: 'ops', label: 'תפעול / תעשייה', en: 'industrial engineer OR operations analyst junior', he: 'מהנדס/ת תעשייה וניהול' },
  { id: 'grad', label: 'בוגרי תעשייה וניהול', en: 'industrial engineering graduate', he: 'בוגר/ת הנדסת תעשייה וניהול' },
];
let currentQuery = QUERIES[0];

function searchSites(en, he) {
  const e = encodeURIComponent, g = q => 'https://www.google.com/search?q=' + e(q);
  return [
    { group: 'לינקדאין', items: [
      { label: 'LinkedIn: שבוע אחרון, ג׳וניור', url: `https://www.linkedin.com/jobs/search/?keywords=${e(en)}&location=${e('Tel Aviv District, Israel')}&f_E=1%2C2&f_JT=F&f_TPR=r604800&sortBy=DD` },
      { label: 'LinkedIn: כל המרכז', url: `https://www.linkedin.com/jobs/search/?keywords=${e(en)}&location=${e('Central District, Israel')}&f_E=1%2C2&f_JT=F` },
      { label: 'פוסטים "מגייסים" בלינקדאין', url: `https://www.linkedin.com/search/results/content/?keywords=${e('מגייסים ' + he)}&sortBy=%22date_posted%22` },
    ] },
    { group: 'אתרי דרושים', items: [
      { label: 'Google Jobs', url: g(en + ' jobs Tel Aviv') + '&ibp=htl;jobs' },
      { label: 'Indeed ישראל', url: `https://il.indeed.com/jobs?q=${e(en.split(' OR ')[0])}&l=${e('תל אביב-יפו')}&sort=date` },
      { label: 'AllJobs', url: g('site:alljobs.co.il ' + he) },
      { label: 'Drushim', url: g('site:drushim.co.il ' + he) },
      { label: 'JobMaster', url: g('site:jobmaster.co.il ' + he) },
      { label: 'Glassdoor', url: g('site:glassdoor.com ' + en.split(' OR ')[0] + ' Tel Aviv') },
      { label: 'Comeet (חברות הייטק)', url: g('site:comeet.com ' + en.split(' OR ')[0] + ' Tel Aviv') },
      { label: 'Greenhouse / Lever', url: g('(site:boards.greenhouse.io OR site:jobs.lever.co) ' + en.split(' OR ')[0] + ' Tel Aviv') },
    ] },
    { group: 'משרות חסויות וחברות השמה', items: [
      { label: 'משרות חסויות', url: g('משרה חסויה ' + he + ' תל אביב') },
      { label: 'חברות השמה לבוגרים', url: g('חברת השמה בוגרים הנדסת תעשייה וניהול ללא ניסיון') },
      { label: 'קבוצות פייסבוק', url: g('site:facebook.com/groups דרושים ' + he + ' ללא ניסיון') },
    ] },
  ];
}

function renderSearch() {
  chips($('queryChips'), QUERIES.map(q => [q.id, q.label]), currentQuery.id, id => { currentQuery = QUERIES.find(q => q.id === id); $('customQuery').value = ''; renderSearch(); });
  const custom = $('customQuery').value.trim();
  const en = custom || currentQuery.en, he = custom || currentQuery.he;
  $('searchLinks').innerHTML = searchSites(en, he).map(g => `
    <div class="section-title">${g.group}</div>
    <div class="links">${g.items.map(i => `<a class="link-btn" href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.label)}</a>`).join('')}</div>`).join('')
    + `<div class="section-title">טיפ</div><div class="card small">בלינקדאין, אחרי שפתחת חיפוש, לחצי על <b>"Set alert"</b> כדי לקבל התראה כשמתפרסמת משרה חדשה. בדרך הזו את בין הראשונות שמגישות.</div>`;
}
$('customQuery').addEventListener('input', () => renderSearch());

// ---------- קו"ח ----------
function renderCv() {
  if (document.activeElement !== $('cvText')) $('cvText').value = state.profile.cv;
  const detected = Engine.extractSkills(state.profile.cv);
  const removed = new Set(state.profile.removedSkills || []);
  const extra = new Set(state.profile.extraSkills || []);
  const on = id => (detected.has(id) && !removed.has(id)) || extra.has(id);
  const byGroup = {};
  Engine.SKILLS.forEach(s => (byGroup[s.group] = byGroup[s.group] || []).push(s));
  $('skillChips').innerHTML = Object.entries(byGroup).map(([g, list]) => `
    <div class="small muted" style="margin:8px 0 4px">${Engine.GROUP_LABEL[g]}</div>
    <div class="row">${list.map(s => `<button class="chip ${on(s.id) ? 'on' : ''}" onclick="toggleSkill('${s.id}')">${esc(s.name)}</button>`).join('')}</div>`).join('');

  const sel = $('tailorJob');
  const cur = sel.value;
  sel.innerHTML = '<option value="">בחרי משרה…</option>' + state.jobs.map(j => `<option value="${j.id}">${esc(j.title)}${j.company ? ' · ' + esc(j.company) : ''}</option>`).join('');
  sel.value = cur;
  renderTailor();
  renderRoles();
  renderNotify();
  if (document.activeElement !== $('apiKey')) $('apiKey').value = apiKey();
}

function toggleSkill(id) {
  const p = state.profile;
  p.removedSkills = p.removedSkills || []; p.extraSkills = p.extraSkills || [];
  const detected = Engine.extractSkills(p.cv).has(id);
  const isOn = (detected && !p.removedSkills.includes(id)) || p.extraSkills.includes(id);
  if (isOn) { p.extraSkills = p.extraSkills.filter(x => x !== id); if (detected) p.removedSkills.push(id); }
  else { p.removedSkills = p.removedSkills.filter(x => x !== id); if (!detected) p.extraSkills.push(id); }
  save(); profileChanged(); renderCv();
}

$('saveCv').onclick = () => {
  state.profile.cv = $('cvText').value;
  if (state.profile.cv.trim()) ui.list = 'best';
  save(); profileChanged(); renderCv();
  toast('נשמר. זוהו ' + Engine.extractSkills(state.profile.cv).size + ' כישורים');
};

// ---------- קובץ קו"ח שמור במכשיר (לשיתוף בהגשה) ----------
function idb() {
  return new Promise((ok, fail) => {
    const r = indexedDB.open('jobhunt', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => ok(r.result); r.onerror = () => fail(r.error);
  });
}
async function saveCvFile(file) {
  try { const db = await idb(); db.transaction('files', 'readwrite').objectStore('files').put(file, 'cv'); } catch (e) { /* לא קריטי */ }
}
async function getCvFile() {
  try {
    const db = await idb();
    return await new Promise(ok => { const r = db.transaction('files').objectStore('files').get('cv'); r.onsuccess = () => ok(r.result || null); r.onerror = () => ok(null); });
  } catch (e) { return null; }
}

// ---------- העלאת קובץ קו"ח ----------
function loadScript(src) {
  return new Promise((ok, fail) => { const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = fail; document.head.appendChild(el); });
}
async function pdfText(buf) {
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const c = await (await pdf.getPage(i)).getTextContent();
    // מקבצים פריטים לשורות לפי הגובה בעמוד, ומסדרים כל שורה לפי כיוון הכתיבה שלה
    const rows = [];
    for (const it of c.items) {
      if (!it.str.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      let row = rows.find(r => Math.abs(r.y - y) < 3);
      if (!row) rows.push(row = { y, items: [] });
      row.items.push({ x, s: it.str.trim() });
    }
    rows.sort((a, b) => b.y - a.y);
    const heb = t => /[\u0590-\u05FF]/.test(t);
    const lines = rows.map(r => {
      const rtl = r.items.filter(i => heb(i.s)).length >= r.items.length / 2;
      const items = r.items.sort((a, b) => rtl ? b.x - a.x : a.x - b.x).map(i => i.s);
      if (!rtl) return items.join(' ');
      // בשורה עברית, רצפים באנגלית/מספרים נשארים משמאל לימין
      const out = []; let run = [];
      for (const t of items) { if (heb(t)) { out.push(...run.reverse(), t); run = []; } else run.push(t); }
      out.push(...run.reverse());
      return out.join(' ').replace(/\s+([:,.])/g, '$1');
    });
    pages.push(lines.filter(Boolean).join('\n'));
  }
  return pages.join('\n');
}
async function docxText(buf) {
  if (!window.mammoth) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
  return (await mammoth.extractRawText({ arrayBuffer: buf })).value;
}
$('cvFile').onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  toast('קורא את הקובץ…');
  try {
    const buf = await f.arrayBuffer();
    const name = f.name.toLowerCase();
    const text = name.endsWith('.pdf') ? await pdfText(buf) : name.endsWith('.docx') ? await docxText(buf) : new TextDecoder().decode(buf);
    if (!text.trim()) throw new Error('empty');
    state.profile.cv = text.replace(/\n{3,}/g, '\n\n').trim();
    state.profile.cvFile = f.name;
    saveCvFile(f);
    ui.list = 'best';
    save(); profileChanged(); renderCv();
    toast('קורות החיים נטענו. זוהו ' + Engine.extractSkills(state.profile.cv).size + ' כישורים');
  } catch (err) {
    toast('לא הצלחתי לקרוא את הקובץ. אפשר להעתיק ולהדביק את הטקסט');
  }
  e.target.value = '';
};

function highlight(line, words) {
  let out = esc(line);
  words.forEach(w => { if (w.length > 1) out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<span class="hl">$1</span>'); });
  return out;
}

const ATS_LABEL = {
  exact: ['✓', 'have', 'מופיע'], reword: ['✎', 'similar', 'יש לך, לנסח כמו במשרה'], similar: ['≈', 'partial', 'כלי דומה'],
  confirm: ['?', 'partial', 'צריך אישור שלך'], missing: ['✕', 'missing', 'חסר, לא להוסיף'],
};
function renderTailor() {
  const id = $('tailorJob').value;
  const j = state.jobs.find(x => x.id === id);
  if (!j) { $('tailorOut').innerHTML = ''; return; }
  if (!state.profile.cv.trim()) { $('tailorOut').innerHTML = '<div class="notice">קודם צריך להעלות קורות חיים למעלה.</div>'; return; }
  const t = Engine.tailorCV(state.profile.cv, j, profile());
  const words = t.keywords.flatMap(k => Engine.SKILL_BY_ID[k.id].aliases).map(a => a.trim()).filter(a => a.length > 2);
  const by = st => t.keywords.filter(k => k.status === st);
  const why = k => [k.inTitle ? 'בשם התפקיד' : '', k.must ? 'דרישת חובה' : 'יתרון', k.count > 1 ? `מוזכר ${k.count} פעמים` : ''].filter(Boolean).join(' · ');
  const copyBtn = (txt, label = 'העתקה') => `<button class="chip" onclick="navigator.clipboard.writeText(${esc(JSON.stringify(txt))}).then(()=>toast('הועתק'))">${label}</button>`;
  const toAdd = by('reword'), toConfirm = by('confirm'), similar = by('similar'), have = by('exact'), missing = by('missing');
  const extraMissing = t.extraTerms.filter(x => !x.inCv);

  $('tailorOut').innerHTML = `
    <div class="ats-score">
      <div><div class="k">הקורא האוטומטי ימצא היום</div><div class="v">${t.atsNow}%</div></div>
      <div class="arrow">←</div>
      <div><div class="k">אחרי התיקונים (בלי להמציא)</div><div class="v" style="color:var(--good)">${t.atsPotential}%</div></div>
    </div>
    <div class="small muted" style="margin:6px 2px 12px">מערכות סינון אוטומטיות מחפשות את <b>המילים המדויקות</b> מהמשרה. אם הכישור כתוב אצלך במילים אחרות, הן לא תמיד מזהות אותו.</div>

    ${toAdd.length ? `<div class="section-title">✍️ להוסיף לקו״ח, יש לך את זה (${toAdd.length})</div>
    <div class="card">${toAdd.map(k => `<div class="ats-item">
      <div class="row"><b class="ats-term" dir="auto">${esc(k.term)}</b>${copyBtn(k.term)}<span class="spacer"></span><span class="small muted">${why(k)}</span></div>
      <div class="small">כתבי בדיוק "<b dir="auto">${esc(k.term)}</b>" פעמיים: בשורת הכישורים, וגם בתוך תיאור הניסיון.</div>
      ${k.where ? `<div class="small muted">💡 מתאים להוסיף לשורה: "<span dir="auto">${esc(k.where.slice(0, 90))}${k.where.length > 90 ? '…' : ''}</span>"</div>` : ''}
    </div>`).join('')}</div>` : ''}

    ${toConfirm.length ? `<div class="section-title">❓ יש לך? אם כן, הוסיפי (${toConfirm.length})</div>
    <div class="card">${toConfirm.map(k => `<div class="ats-item">
      <div class="row"><b class="ats-term" dir="auto">${esc(k.term)}</b><span class="spacer"></span><span class="small muted">${why(k)}</span></div>
      <div class="small muted">לא מופיע בקו״ח. אם זה נכון לגבייך (מהתואר, מפרויקט או מעבודה), הוסיפי את המונח עם דוגמה אמיתית.</div>
      <div class="row" style="margin-top:6px"><button class="chip" onclick="confirmSkill('${k.id}')">✓ יש לי את זה</button>${copyBtn(k.term, 'העתקת המונח')}</div>
    </div>`).join('')}</div>` : ''}

    ${similar.length ? `<div class="section-title">≈ יש לך כלי דומה (${similar.length})</div>
    <div class="card">${similar.map(k => `<div class="ats-item"><b dir="auto">${esc(k.term)}</b> <span class="small muted">· יש לך ${esc((k.via || []).join(', '))}</span>
      <div class="small muted">אל תכתבי "${esc(k.term)}" אם לא עבדת איתו. הבליטי את ${esc((k.via || []).join(', '))}, ואפשר לציין במכתב פנייה שזה כלי מקביל.</div></div>`).join('')}</div>` : ''}

    <div class="section-title">📋 שורת כישורים מוכנה להעתקה</div>
    <div class="card"><div dir="auto" style="user-select:all">${esc(t.atsSkillsLine.join(' | ') || '—')}</div>
      <div class="row small muted" style="margin-top:8px"><span>בניסוח של המשרה, רק מה שיש לך. הדביקי תחת "כישורים".</span><span class="spacer"></span>${t.atsSkillsLine.length ? copyBtn(t.atsSkillsLine.join(' | ')) : ''}</div></div>

    <div class="section-title">🏷️ כותרת לראש הקו״ח</div>
    <div class="card"><div dir="auto" style="user-select:all"><b>${esc(t.headline)}</b></div>
      <div class="row small muted" style="margin-top:8px"><span>הקורא האוטומטי מחפש התאמה לשם התפקיד. שימי שורה כזו מתחת לשם שלך.</span><span class="spacer"></span>${copyBtn(t.headline)}</div></div>

    ${extraMissing.length ? `<div class="section-title">🔎 מונחים נוספים מהמשרה שלא מופיעים אצלך</div>
    <div class="card"><div class="f-chips">${extraMissing.map(x => `<span class="badge" dir="auto">${esc(x.term)}${x.count > 1 ? ' ×' + x.count : ''}</span>`).join('')}</div>
      <div class="small muted" style="margin-top:8px">אם אחד מהם נכון לגבייך (כלי, תחום, מתודולוגיה), כדאי להוסיף אותו בדיוק כך.</div></div>` : ''}

    <details class="card" style="margin-top:10px"><summary><b>✓ כבר מופיע אצלך (${have.length}) · ✕ חסר (${missing.length})</b></summary>
      ${have.length ? `<div class="small" style="margin-top:8px">✓ ${have.map(k => esc(k.term)).join(' · ')}</div>` : ''}
      ${missing.length ? `<div class="small muted" style="margin-top:6px">✕ חסר, לא להוסיף: ${missing.map(k => esc(k.term)).join(' · ')}</div>` : ''}
    </details>

    <details class="card"><summary><b>📄 טיפים לקובץ שהקורא האוטומטי יצליח לקרוא</b></summary>
      <ul class="reasons small" style="margin-top:8px">
        <li>שלחי Word או PDF שנוצר מ-Word, לא סריקה או תמונה.</li>
        <li>בלי טבלאות, עמודות, תיבות טקסט או אייקונים. הקורא האוטומטי מערבב אותם.</li>
        <li>כותרות סטנדרטיות: "השכלה", "ניסיון", "פרויקטים", "כישורים".</li>
        <li>שם קובץ ברור, למשל "קורות חיים - השם שלך.pdf".</li>
        <li>אם המשרה באנגלית, עדיף קו״ח באנגלית (או לפחות המונחים המקצועיים באנגלית).</li>
        <li>כל מילת מפתח חשובה פעמיים: בכישורים וגם בתיאור הניסיון.</li>
      </ul>
    </details>

    <div class="section-title">שורות מהקו״ח שלך, הרלוונטיות ביותר קודם</div>
    <div>${t.bullets.length ? t.bullets.map(b => `<div class="bullet">${highlight(b.line, words)}${b.tips.map(tip => `<div class="tip">💡 ${esc(tip)}</div>`).join('')}</div>`).join('') : '<div class="muted small">לא נמצאו שורות שקשורות ישירות למשרה</div>'}</div>

    <button class="btn secondary block" style="margin-top:12px" onclick="aiTailor('${j.id}')">✨ ניסוח מחדש עם AI</button>
    <div id="aiTailorOut"></div>
  `;
}
function confirmSkill(id) {
  const p = state.profile;
  p.extraSkills = [...new Set([...(p.extraSkills || []), id])];
  p.removedSkills = (p.removedSkills || []).filter(x => x !== id);
  save(); profileChanged(); renderCv();
  toast('נוסף לכישורים שלך. זכרי להוסיף אותו גם לקובץ קורות החיים');
}

// ---------- תפקידים מומלצים ----------
function renderRoles() {
  if (!state.profile.cv.trim()) { $('rolesOut').innerHTML = '<div class="muted small">אחרי שתעלי קורות חיים, יופיעו כאן תפקידים שמתאימים לכישורים שלך.</div>'; return; }
  const roles = Engine.suggestRoles(profile());
  $('rolesOut').innerHTML = roles.length ? roles.slice(0, 10).map(r => `
    <div class="bullet">
      <div class="row"><b>${esc(r.he)}</b> <span class="small muted" dir="ltr">${esc(r.en)}</span><span class="spacer"></span>
        <span class="badge ${r.fit >= 70 ? 'yes' : 'maybe'}">${r.fit}%</span>${r.core ? '' : '<span class="badge accent">אולי לא חשבת על זה</span>'}</div>
      <div class="small muted">יש לך: ${esc(r.got.join(', '))}${r.gap.length ? ' · חסר: ' + esc(r.gap.join(', ')) : ''}</div>
      <div class="row" style="margin-top:6px"><button class="chip" onclick='showRoleJobs(${JSON.stringify([r.en, r.he.split(/[\/ ]/)[0]])})'>משרות כאלה באפליקציה</button>
        <a class="chip" target="_blank" rel="noopener" href="https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(r.en)}&location=${encodeURIComponent('Tel Aviv District, Israel')}&f_E=1%2C2">לינקדאין ↗</a></div>
    </div>`).join('') : '<div class="muted small">לא נמצאו התאמות. נסי להוסיף כישורים ידנית למעלה.</div>';
}
function showRoleJobs(terms) {
  ui.roleTerms = terms.map(t => t.toLowerCase());
  ui.list = 'all';
  go('jobs');
  toast('מציג משרות שקשורות ל: ' + terms[0]);
}

// ---------- AI ----------
function apiKey() { try { return localStorage.getItem('jobhunt.apikey') || ''; } catch { return ''; } }
$('saveKey').onclick = () => {
  try { localStorage.setItem('jobhunt.apikey', $('apiKey').value.trim()); toast('המפתח נשמר במכשיר'); } catch { toast('לא הצלחתי לשמור'); }
};
async function withAI(outEl, run) {
  if (!apiKey()) { outEl.innerHTML = '<div class="notice small">כדי להשתמש ב-AI צריך להזין מפתח API בסעיף "AI" למטה.</div>'; return; }
  if (!state.profile.cv.trim()) { outEl.innerHTML = '<div class="notice small">קודם צריך להעלות קורות חיים.</div>'; return; }
  outEl.innerHTML = '<div class="muted small" style="padding:10px 0">✨ מנתח… זה יכול לקחת כחצי דקה</div>';
  try {
    const AI = await import('./ai.js');
    outEl.innerHTML = await run(AI);
  } catch (e) {
    const msg = e.status === 401 ? 'מפתח ה-API לא תקין. בדקי אותו בסעיף "AI"'
      : e.status === 429 ? 'יותר מדי בקשות. נסי שוב בעוד דקה'
      : e.status === 400 && /credit/i.test(e.message) ? 'אין מספיק קרדיט בחשבון ה-API'
      : !navigator.onLine ? 'אין חיבור לאינטרנט' : (e.message || String(e));
    outEl.innerHTML = `<div class="notice small">הניתוח נכשל: ${esc(msg)}</div>`;
  }
}
$('aiRolesBtn').onclick = () => withAI($('aiRolesOut'), async AI => {
  const r = await AI.suggestRoles(apiKey(), state.profile.cv, 'ניהול פרויקטים, ניהול מוצר, אנליסט (BI, דאטה, מוצר, שיווק, עסקי)');
  state.profile.aiRoles = r.roles; save();
  return `<div class="notice small" style="margin-top:10px">${esc(r.summary)}</div>` + r.roles.map(x => `
    <div class="bullet">
      <div class="row"><b>${esc(x.title_he)}</b> <span class="small muted" dir="ltr">${esc(x.title_en)}</span><span class="spacer"></span><span class="badge ${x.fit >= 70 ? 'yes' : 'maybe'}">${x.fit}%</span></div>
      <div class="small">${esc(x.why)}</div>
      ${x.evidence.length ? `<div class="small muted">מהקו״ח שלך: ${esc(x.evidence.join(' · '))}</div>` : ''}
      ${x.gaps.length ? `<div class="small muted">חסר: ${esc(x.gaps.join(', '))}</div>` : ''}
      <div class="row" style="margin-top:6px"><button class="chip" onclick='showRoleJobs(${esc(JSON.stringify(x.search_terms))})'>משרות כאלה באפליקציה</button></div>
    </div>`).join('');
});
function aiTailor(id) {
  const j = state.jobs.find(x => x.id === id);
  withAI($('aiTailorOut'), async AI => {
    const r = await AI.tailor(apiKey(), state.profile.cv, j);
    const lab = { exact: ['✓', 'have'], reword: ['✎', 'similar'], confirm: ['?', 'partial'], missing: ['✕', 'missing'] };
    return `<div class="section-title">✨ ניתוח AI: מילות מפתח</div><ul class="skill-list">${r.keywords.map(k => `
        <li><span class="mark ${lab[k.status][1]}">${lab[k.status][0]}</span><div><b dir="auto">${esc(k.keyword)}</b>
        ${k.evidence ? `<div class="small muted">מהקו״ח: ${esc(k.evidence)}</div>` : ''}<div class="small">${esc(k.advice)}</div></div></li>`).join('')}</ul>
      <div class="section-title">✨ משפט פתיחה מותאם</div><div class="card small" style="user-select:all">${esc(r.summary_line)}</div>
      <div class="section-title">✨ בולטים בניסוח משופר (רק עובדות מהקו״ח)</div>
      ${r.bullets.map(b => `<div class="bullet"><div class="small muted"><s>${esc(b.original)}</s></div><div style="user-select:all" dir="auto">${esc(b.improved)}</div>
        ${b.keywords_used.length ? `<div class="small muted">מונחים מהמשרה: ${esc(b.keywords_used.join(', '))}</div>` : ''}</div>`).join('')}
      <div class="notice small" style="margin-top:8px">בדקי כל שורה לפני שאת מעתיקה. אם משהו לא מדויק לגבייך, אל תשתמשי בו.</div>`;
  });
}
$('tailorJob').addEventListener('change', renderTailor);
function tailorFor(id) { closeSheet(); go('cv'); $('tailorJob').value = id; renderTailor(); setTimeout(() => $('tailorJob').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }

// ---------- גיבוי ----------
$('exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'job-hunt-backup-' + today() + '.json';
  a.click();
};
$('importFile').onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    // קובץ גיבוי מלא, או רשימת משרות להוספה
    const incoming = Array.isArray(data) ? data : data.jobs;
    if (!Array.isArray(incoming)) throw new Error();
    if (!Array.isArray(data) && data.profile && confirm('לשחזר גיבוי מלא? זה יחליף את הנתונים הנוכחיים')) state = data;
    else {
      const seen = new Set(state.jobs.map(j => j.url).filter(Boolean));
      let added = 0;
      incoming.forEach(j => { if (j.url && seen.has(j.url)) return; state.jobs.push({ id: uid(), status: 'new', dateAdded: today(), history: [], ...j, updated: Date.now() }); added++; });
      toast('נוספו ' + added + ' משרות');
    }
    save(); profileChanged(); render();
  } catch { toast('הקובץ לא תקין'); }
  e.target.value = '';
};

// ---------- דוגמאות ----------
function loadDemo() {
  const demo = [
    { title: 'Junior Project Manager', company: 'חברה לדוגמה א׳', location: 'תל אביב', description: 'We are looking for a Junior Project Manager to join our PMO team in Tel Aviv.\nRequirements:\n- B.Sc in Industrial Engineering & Management - must\n- 0-1 years of experience\n- Excellent Excel skills\n- Experience with Monday.com or Jira - advantage\n- Strong communication skills and ability to work with multiple stakeholders\n- Fluent English' },
    { title: 'אנליסט/ית BI', company: 'חברה לדוגמה ב׳', location: 'רמת גן', description: 'דרוש/ה אנליסט/ית BI למשרה מלאה ברמת גן.\nדרישות:\n- תואר ראשון בהנדסת תעשייה וניהול / כלכלה / סטטיסטיקה\n- שליטה ב-SQL\n- ניסיון ב-Tableau\n- אקסל ברמה גבוהה\n- ניסיון ב-Python - יתרון\n- יכולות אנליטיות גבוהות' },
    { title: 'Senior Product Manager', company: 'חברה לדוגמה ג׳', location: 'הרצליה', description: '5+ years of product management experience in B2B SaaS.\nOwn the roadmap, write PRDs, work with R&D.\nExperience with A/B testing and SQL.' },
    { title: 'רכז/ת תפעול ושיפור תהליכים', company: 'חברה לדוגמה ד׳', location: 'פתח תקווה', description: 'משרה מלאה. מתאים לבוגרים.\nמיפוי תהליכים ושיפור תהליכים, עבודה מול ממשקים בארגון.\nדרישות: הנדסת תעשייה וניהול, אקסל, ידע ב-SAP או Priority - יתרון.' },
  ];
  demo.forEach(d => state.jobs.push({ id: uid(), ...d, demo: true, url: '', status: 'new', dateAdded: today(), updated: Date.now(), history: [] }));
  save(); render();
}

// ---------- משרות שנאספו אוטומטית (jobs.json) ----------
async function loadFeed(manual) {
  const btn = $('refreshBtn');
  btn.classList.add('spin');
  try {
    const res = await fetch('jobs.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error();
    const feed = await res.json();
    const known = new Set(state.jobs.map(j => j.url).filter(Boolean));
    // משרות חדשות מסומנות כ"חדש" עד שפותחים אותן
    let added = 0;
    const addedJobs = [];
    const byUrl = new Map(state.jobs.filter(j => j.url).map(j => [j.url, j]));
    for (const f of feed.jobs || []) {
      const old = f.url && byUrl.get(f.url);
      if (old && old.auto && (old.description !== f.description || old.postedAt !== f.postedAt || old.applyEmail !== f.applyEmail)) {
        Object.assign(old, { description: f.description, postedAt: f.postedAt, location: f.location, alsoAt: f.alsoAt, applyEmail: f.applyEmail, updated: Date.now() });
        searchCache.delete(old.id);
      }
      if (!f.url || known.has(f.url)) continue;
      const nj = { id: uid(), ...f, status: 'new', fresh: true, auto: true, dateAdded: today(), updated: Date.now(), history: [] };
      state.jobs.push(nj); addedJobs.push(nj);
      added++;
    }
    // משרות שנאספו אוטומטית, ירדו מהאתרים, ולא טיפלת בהן: מסירים (משרות עם סטטוס נשארות במעקב)
    const feedUrls = new Set((feed.jobs || []).map(f => f.url));
    if (feedUrls.size > 50) state.jobs = state.jobs.filter(j => !j.auto || j.status !== 'new' || feedUrls.has(j.url));
    // בטעינה הראשונה כל המשרות "חדשות", אז לא מתריעים עליהן
    if (state.feedUpdated) notifyMatches(addedJobs);
    state.feedUpdated = feed.updated;
    save();
    if (manual || added) toast(added ? 'נמצאו ' + added + ' משרות חדשות' : 'אין משרות חדשות מאז הבדיקה הקודמת');
  } catch (e) {
    if (manual) toast('לא הצלחתי לטעון משרות חדשות');
  } finally {
    btn.classList.remove('spin');
    render();
  }
}
$('refreshBtn').onclick = () => loadFeed(true);
// בדיקה אוטומטית למשרות חדשות כל 5 דקות, ובכל פעם שחוזרים לאפליקציה
setInterval(() => loadFeed(false), 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) loadFeed(false); });

// ---------- התראות על משרות עם התאמה גבוהה ----------
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && 'ontouchend' in document);
function notifySettings() { return state.notify || (state.notify = { on: false, threshold: 95 }); }

async function notifyMatches(jobs) {
  const n = notifySettings();
  if (!n.on || !state.profile.cv.trim() || !('Notification' in window) || Notification.permission !== 'granted') return;
  const day = today();
  if (n.day !== day) { n.day = day; n.sentToday = 0; }
  const room = Math.max(0, (n.maxPerDay || 4) - n.sentToday);
  const hits = jobs.map(j => ({ j, a: analysis(j) })).filter(x => x.a.match >= n.threshold && x.a.verdict.level === 'yes')
    .sort((x, y) => worth(y.j, y.a) - worth(x.j, x.a)).slice(0, room);
  if (!hits.length) return;
  n.sentToday += hits.length; save();
  const reg = await navigator.serviceWorker?.getRegistration();
  for (const { j, a } of hits) {
    const title = `🎯 ${a.match}% התאמה: ${j.title}`;
    const opts = { body: [j.company, j.location || a.city].filter(Boolean).join(' · '), tag: j.id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { job: j.id } };
    try { reg ? await reg.showNotification(title, opts) : new Notification(title, opts); } catch (e) { /* התראה לא נתמכת */ }
  }
  // מספר על אייקון האפליקציה במסך הבית
  try { navigator.setAppBadge?.(state.jobs.filter(j => j.fresh && analysis(j).match >= n.threshold).length); } catch (e) {}
}

function renderNotify() {
  const n = notifySettings();
  $('notifyThreshold').value = String(n.threshold);
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const on = n.on && perm === 'granted';
  $('notifyBtn').textContent = on ? 'כיבוי התראות' : 'הפעלת התראות';
  $('notifyBtn').className = on ? 'btn secondary' : 'btn';
  let info = '';
  if (isIOS() && !isStandalone()) info = '📱 באייפון התראות עובדות רק אחרי שמוסיפים את האפליקציה למסך הבית (שיתוף ← "הוספה למסך הבית"), ופותחים אותה משם.';
  else if (perm === 'unsupported') info = 'הדפדפן הזה לא תומך בהתראות.';
  else if (perm === 'denied') info = 'ההתראות חסומות. אפשר לאשר אותן בהגדרות המכשיר ← התראות ← משרות.';
  else if (!state.profile.cv.trim()) info = 'צריך להעלות קורות חיים כדי לחשב התאמה.';
  else {
    const count = state.jobs.filter(j => analysis(j).match >= n.threshold).length;
    info = (on ? '✅ התראות פעילות. ' : '') + `כרגע יש ${count} משרות עם התאמה של ${n.threshold}% ומעלה.` +
      (count === 0 ? ' אם לא תגיע אף התראה לאורך זמן, אפשר להוריד את הסף.' : '');
  }
  $('notifyInfo').textContent = info;
  if (on && !$('pushCodeBox').innerHTML) $('pushCodeBox').innerHTML = '<button class="chip" style="margin-top:8px" onclick="showPushCode()">קוד חיבור להתראות כשהאפליקציה סגורה</button>';
  if (!on) $('pushCodeBox').innerHTML = '';
}
$('notifyThreshold').onchange = e => { notifySettings().threshold = +e.target.value; save(); renderNotify(); if (notifySettings().on) showPushCode(); };
$('notifyBtn').onclick = async () => {
  const n = notifySettings();
  if (n.on && Notification.permission === 'granted') { n.on = false; save(); renderNotify(); return; }
  if (!('Notification' in window)) { renderNotify(); return; }
  const perm = await Notification.requestPermission();
  n.on = perm === 'granted'; save(); renderNotify();
  if (n.on) { toast('התראות הופעלו'); showPushCode(); }
};
// ---------- התראות גם כשהאפליקציה סגורה (Web Push דרך GitHub) ----------
const PUSH_KEY = 'BNp-0rq5A4Gy9w-7umzuTvj74lNWRvxyVYydIt8ofW2jEr-ORrwvAmgtII-6YKQ_aogyCZXnZxlvPBL7LfFBo-E';
function b64ToBytes(b64) {
  const s = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}
async function pushCode() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(PUSH_KEY) });
  // קוד החיבור כולל רק את כתובת ההתראות, רשימת הכישורים והסף. לא את קורות החיים
  return JSON.stringify({ devices: [sub.toJSON()], skills: profile().extraSkills, threshold: notifySettings().threshold, maxPerDay: 4 });
}
async function showPushCode() {
  const box = $('pushCodeBox');
  if (!('PushManager' in window) || !navigator.serviceWorker) { box.innerHTML = '<div class="small muted">המכשיר הזה לא תומך בהתראות כשהאפליקציה סגורה.</div>'; return; }
  try {
    const code = await pushCode();
    box.innerHTML = `<div class="small" style="margin:10px 0 6px"><b>שלב אחרון:</b> כדי שההתראות יגיעו גם כשהאפליקציה סגורה, העתיקי את הקוד ושלחי אותו ל-Claude בצ׳אט. אם עדכנת קורות חיים או סף, צריך לשלוח קוד חדש.</div>
      <textarea class="input" readonly style="min-height:70px;font-size:12px" dir="ltr" id="pushCode">${esc(code)}</textarea>
      <button class="btn secondary block" style="margin-top:6px" onclick="navigator.clipboard.writeText($('pushCode').value).then(()=>toast('הקוד הועתק'))">העתקת הקוד</button>`;
  } catch (e) {
    box.innerHTML = `<div class="small muted">לא הצלחתי להירשם להתראות: ${esc(e.message || e)}</div>`;
  }
}

// פתיחת משרה מתוך התראה
function openJobByUrl(url) {
  const j = state.jobs.find(x => x.url === url);
  if (j) { go('jobs'); openJob(j.id); } else loadFeed(false).then(() => { const k = state.jobs.find(x => x.url === url); if (k) { go('jobs'); openJob(k.id); } });
}
navigator.serviceWorker?.addEventListener('message', e => {
  if (e.data?.openJob) { go('jobs'); openJob(e.data.openJob); }
  if (e.data?.openJobUrl) openJobByUrl(e.data.openJobUrl);
});
const startJobUrl = new URLSearchParams(location.search).get('jobUrl');
if (startJobUrl) setTimeout(() => openJobByUrl(startJobUrl), 500);
const startJob = new URLSearchParams(location.search).get('job');
if (startJob) setTimeout(() => openJob(startJob), 300);
document.addEventListener('visibilitychange', () => { if (!document.hidden) try { navigator.clearAppBadge?.(); } catch (e) {} });

// ---------- כללי ----------
let toastTimer;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400); }

$('jobSearch').addEventListener('input', e => { ui.q = e.target.value; if (!ui.q.trim()) ui.searchAll = false; renderJobs(); });

function render() {
  if (ui.view === 'jobs') renderJobs();
  if (ui.view === 'track') renderTrack();
  if (ui.view === 'search') renderSearch();
  if (ui.view === 'cv') renderCv();
}

// הצעת התקנה למסך הבית (באייפון/אייפד, כשלא פתוח כאפליקציה)
const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (!standalone && /iphone|ipad|ipod|macintosh/i.test(navigator.userAgent) && 'ontouchend' in document) $('installHint').classList.add('show');

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

render();
loadFeed(false);
