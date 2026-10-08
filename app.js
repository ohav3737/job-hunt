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
const ui = { view: 'jobs', cat: 'all', region: 'core', sort: state.profile.cv.trim() ? 'fit' : 'smart', q: '', trackSort: 'date', trackFilter: 'active', source: 'all' };

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
function renderJobs() {
  chips($('catChips'), [['all', 'כל התחומים'], ['pm', 'ניהול פרויקטים'], ['product', 'מוצר'], ['analyst', 'אנליסט'], ['ops', 'תפעול / תעשייה'], ['other', 'אחר']], ui.cat, v => { ui.cat = v; renderJobs(); });
  chips($('regionChips'), [['ta', 'ת"א + רמת גן'], ['core', 'ת"א + סובב'], ['center', 'כל המרכז'], ['all', 'כל הארץ']], ui.region, v => { ui.region = v; renderJobs(); });
  const sources = [...new Set(state.jobs.map(j => j.source).filter(Boolean))].sort();
  chips($('sourceChips'), [['all', 'כל המקורות'], ...sources.map(x => [x, x])], ui.source, v => { ui.source = v; renderJobs(); });
  chips($('sortChips'), [['fit', 'מתאימות לי'], ['smart', 'הכל, מיון חכם'], ['match', 'לפי התאמה'], ['date', 'החדשות קודם'], ['fresh', 'רק חדשות'], ['junior', 'רק ג׳וניור'], ['hide', 'בלי לא רלוונטיות']], ui.sort, v => { ui.sort = v; renderJobs(); });

  $('cvNudge').style.display = state.profile.cv.trim() ? 'none' : 'block';
  const freshCount = state.jobs.filter(j => j.fresh).length;
  $('feedInfo').textContent = state.feedUpdated ? 'משרות נאספו לאחרונה: ' + fmtDate(state.feedUpdated) + (freshCount ? ' · ' + freshCount + ' חדשות' : '') : '';
  const allowed = { ta: ['ta', 'remote', 'unknown'], core: ['ta', 'core', 'remote', 'unknown'], center: ['ta', 'core', 'center', 'remote', 'unknown'], all: null }[ui.region];
  const q = ui.q.trim().toLowerCase();
  let list = state.jobs.map(j => ({ j, a: analysis(j) })).filter(({ j, a }) => {
    if (ui.cat !== 'all' && a.category.id !== ui.cat) return false;
    if (allowed && !allowed.includes(a.region)) return false;
    if (ui.sort === 'junior' && a.experience.isSenior) return false;
    if (ui.sort === 'junior' && a.experience.years >= 2) return false;
    if (ui.sort === 'fit' && a.verdict.level === 'no') return false;
    if (ui.sort === 'fresh' && !j.fresh) return false;
    if (ui.source !== 'all' && j.source !== ui.source) return false;
    if (ui.sort === 'hide' && (j.status === 'skip' || j.status === 'rejected')) return false;
    if (q && ![j.title, j.company, j.location, a.city].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
  if (ui.sort === 'match') list.sort((x, y) => y.a.match - x.a.match);
  else if (ui.sort === 'date') list.sort((x, y) => (y.j.dateAdded || '').localeCompare(x.j.dateAdded || ''));
  else list.sort((x, y) => x.a.sortKey - y.a.sortKey); // 'fit' + 'smart'

  if (!state.jobs.length) {
    $('jobList').innerHTML = `<div class="empty"><div class="big">🔎</div>
      <p><b>עוד אין משרות</b></p>
      <p class="small">כדי להתחיל, הדביקי את קורות החיים בלשונית <b>קו״ח</b>. אחר כך מצאי משרות בלשונית <b>חיפוש</b> והוסיפי אותן עם <b>+</b>.</p>
      <button class="btn secondary" onclick="loadDemo()">הצגת משרות לדוגמה</button></div>`;
    return;
  }
  if (!list.length) { $('jobList').innerHTML = '<div class="empty">אין משרות שמתאימות לסינון</div>'; return; }
  $('jobList').innerHTML = list.map(({ j, a }) => jobCard(j, a)).join('');
}

function ringColor(p) { return p >= 70 ? 'var(--good)' : p >= 55 ? 'var(--warn)' : 'var(--bad)'; }

function jobCard(j, a) {
  return `<div class="card job" onclick="openJob('${j.id}')">
    <div>
      <h3>${esc(j.title || 'משרה ללא שם')}</h3>
      <div class="meta">${esc(j.company || '')}${j.company && (j.location || a.city) ? ' · ' : ''}${esc(j.location || a.city)}</div>
    </div>
    <div class="ring" style="--p:${a.match};--c:${ringColor(a.match)}"><span>${a.match}%</span></div>
    <div class="tags">
      <span class="badge ${a.verdict.level}">${esc(a.verdict.text)}</span>
      <span class="badge accent">${esc(a.category.label)}</span>
      <span class="badge">${esc(a.experience.level)}</span>
      <span class="badge">${fmtMoney(a.salary.min)}–${fmtMoney(a.salary.max)}</span>
      ${j.status !== 'new' ? `<span class="badge">${STATUS_LABEL[j.status]}</span>` : ''}
      ${j.demo ? '<span class="badge">דוגמה</span>' : ''}
      ${j.fresh ? '<span class="badge yes">חדש</span>' : ''}
    </div>
  </div>`;
}

// ---------- פרטי משרה ----------
function openSheet(title, html) {
  $('sheetTitle').textContent = title;
  $('sheetBody').innerHTML = html;
  $('sheet').classList.add('open');
  $('sheet').querySelector('.sheet').scrollTop = 0;
}
function closeSheet() { $('sheet').classList.remove('open'); }
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

function openJob(id) {
  const j = state.jobs.find(x => x.id === id);
  if (!j) return;
  if (j.fresh) { j.fresh = false; save(); render(); }
  const a = analysis(j);
  const noCv = !state.profile.cv.trim();
  openSheet(j.title || 'משרה', `
    <div class="muted" style="margin-bottom:10px">${esc(j.company)}${j.company ? ' · ' : ''}${esc(j.location || a.city || 'מיקום לא ידוע')} · ${esc(a.regionLabel)}${j.source ? ' · מקור: ' + esc(j.source) : ''}${j.postedAt ? ' · פורסמה ' + fmtDate(j.postedAt) : ''}</div>
    ${noCv ? '<div class="notice">⚠️ עוד לא הדבקת קורות חיים, אז הציון לא מדויק. הדביקי אותם בלשונית קו״ח.</div>' : ''}
    <div class="verdict ${a.verdict.level}">${esc(a.verdict.text)}</div>
    <div class="stats">
      <div class="stat"><div class="k">התאמה</div><div class="v" style="color:${ringColor(a.match)}">${a.match}%</div></div>
      <div class="stat"><div class="k">סיכוי לעבור סינון</div><div class="v">${a.screenPct}%</div></div>
      <div class="stat"><div class="k">שכר ${a.salary.source === 'הערכה' ? 'משוער' : ''}</div><div class="v">${fmtMoney(a.salary.min)}–${fmtMoney(a.salary.max)}</div></div>
      <div class="stat"><div class="k">רמת ניסיון</div><div class="v" style="font-size:15px">${esc(a.experience.level)}</div></div>
    </div>
    <div class="row small muted" style="margin:8px 2px">
      <span>תחום: <b>${esc(a.category.label)}</b></span> · <span>${esc(a.degree.label)}</span>
    </div>

    ${a.reasons.length ? `<div class="section-title">למה</div><div class="card"><ul class="reasons">${a.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}

    <div class="section-title">דרישות חובה</div>
    <div class="card">${skillRows(a.skills.must)}</div>
    ${a.skills.nice.length ? `<div class="section-title">יתרון</div><div class="card">${skillRows(a.skills.nice)}</div>` : ''}

    <div class="section-title">סטטוס</div>
    <div class="card">
      <div class="status-picker">${STATUSES.map(s => `<button class="chip ${j.status === s.id ? 'on' : ''}" onclick="setStatus('${j.id}','${s.id}', true)">${s.label}</button>`).join('')}</div>
      <div class="row small muted" style="margin-top:10px">
        <span>נוספה ${fmtDate(j.dateAdded)}</span>
        ${j.dateApplied ? `<span>· הוגשה ${fmtDate(j.dateApplied)}</span>` : ''}
      </div>
      <label class="field" style="margin:10px 0 0"><span>הערות</span>
        <textarea class="input" style="min-height:70px" onchange="setNotes('${j.id}', this.value)" placeholder="איש קשר, מועד ראיון, מה שאלו…">${esc(j.notes || '')}</textarea></label>
    </div>

    <div class="row" style="margin-top:12px">
      ${j.url ? `<a class="btn" href="${esc(j.url)}" target="_blank" rel="noopener">למשרה ↗</a>` : ''}
      <button class="btn secondary" onclick="tailorFor('${j.id}')">התאמת קו״ח</button>
      <button class="btn secondary" onclick="editJob('${j.id}')">עריכה</button>
      <span class="spacer"></span>
      <button class="btn danger" onclick="deleteJob('${j.id}')">מחיקה</button>
    </div>
  `);
}

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
  if (state.profile.cv.trim()) ui.sort = 'fit';
  save(); profileChanged(); renderCv();
  toast('נשמר. זוהו ' + Engine.extractSkills(state.profile.cv).size + ' כישורים');
};

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
    ui.sort = 'fit';
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

function renderTailor() {
  const id = $('tailorJob').value;
  const j = state.jobs.find(x => x.id === id);
  if (!j) { $('tailorOut').innerHTML = ''; return; }
  if (!state.profile.cv.trim()) { $('tailorOut').innerHTML = '<div class="notice">קודם צריך להדביק קורות חיים למעלה.</div>'; return; }
  const t = Engine.tailorCV(state.profile.cv, j, profile());
  // מילים להדגשה: כל הכינויים של כישורי המשרה
  const words = t.keywords.flatMap(k => Engine.SKILL_BY_ID[k.id].aliases).map(a => a.trim()).filter(a => a.length > 2);
  $('tailorOut').innerHTML = `
    <div class="notice small">🔒 ההצעות מבוססות רק על מה שכבר כתוב בקורות החיים שלך. המערכת לא ממציאה ניסיון או כישורים, ומסמנת במפורש מה חסר.</div>
    <div class="section-title">מילות מפתח מהמשרה</div>
    <ul class="skill-list">${t.keywords.map(k => `<li><span class="mark ${k.state}">${MARK[k.state]}</span><div><b>${esc(k.name)}</b><div class="small muted">${esc(k.tip)}</div></div></li>`).join('') || '<li class="muted">לא זוהו כישורים במשרה</li>'}</ul>

    <div class="section-title">שורת כישורים מומלצת (לפי סדר רלוונטיות)</div>
    <div class="card small" style="user-select:all">${esc(t.skillsLine.join(' · ') || '—')}</div>

    <div class="section-title">בולטים מקו״ח, הרלוונטיים ביותר קודם</div>
    <div>${t.bullets.length ? t.bullets.map(b => `<div class="bullet">${highlight(b.line, words)}${b.tips.map(tip => `<div class="tip">💡 ${esc(tip)}</div>`).join('')}</div>`).join('') : '<div class="muted small">לא נמצאו שורות שקשורות ישירות למשרה</div>'}</div>
  `;
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
    for (const f of feed.jobs || []) {
      if (!f.url || known.has(f.url)) continue;
      state.jobs.push({ id: uid(), ...f, status: 'new', fresh: true, auto: true, dateAdded: today(), updated: Date.now(), history: [] });
      added++;
    }
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

// ---------- כללי ----------
let toastTimer;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400); }

$('jobSearch').addEventListener('input', e => { ui.q = e.target.value; renderJobs(); });

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
