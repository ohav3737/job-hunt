// מנוע ההתאמה: זיהוי כישורים, סיווג משרות, ציון התאמה, הערכות.
// הכול רץ במכשיר, בלי שרת ובלי AI חיצוני.

// ---------- כישורים ----------
// group = משפחת כישורים. כישורים מאותה משפחה נחשבים "דומים" (למשל Tableau ≈ Power BI).
const SKILLS = [
  // ויזואליזציה ו-BI
  { id: 'powerbi', name: 'Power BI', group: 'viz', aliases: ['power bi', 'powerbi', 'פאוור בי', 'dax', 'power query'] },
  { id: 'tableau', name: 'Tableau', group: 'viz', aliases: ['tableau', 'טאבלו'] },
  { id: 'looker', name: 'Looker / Looker Studio', group: 'viz', aliases: ['looker', 'data studio'] },
  { id: 'qlik', name: 'Qlik', group: 'viz', aliases: ['qlik', 'qlikview', 'qlik sense'] },
  { id: 'dataviz', name: 'ויזואליזציה של נתונים', group: 'viz', aliases: ['data visualization', 'data visualisation', 'dashboard', 'dashboards', 'דשבורד', 'דשבורדים', 'ויזואליזציה', 'דאטה ויז'] },
  { id: 'bi', name: 'BI', group: 'viz', aliases: ['business intelligence', 'bi tools', 'bi', 'כלי bi'] },

  // גיליונות
  { id: 'excel', name: 'Excel', group: 'sheets', aliases: ['excel', 'אקסל', 'pivot', 'פיבוט', 'vlookup', 'xlookup'] },
  { id: 'excel_adv', name: 'Excel מתקדם', group: 'sheets', aliases: ['advanced excel', 'excel advanced', 'אקסל מתקדם', 'excel מתקדם', 'excel ברמה גבוהה', 'אקסל ברמה גבוהה', 'excel - advanced', 'שליטה מלאה באקסל'] },
  { id: 'gsheets', name: 'Google Sheets', group: 'sheets', aliases: ['google sheets', 'גוגל שיטס'] },
  { id: 'vba', name: 'VBA', group: 'sheets', aliases: ['vba', 'macros', 'מאקרו'] },

  // נתונים ותכנות
  { id: 'sql', name: 'SQL', group: 'data', aliases: ['sql', 'mysql', 'postgres', 'postgresql', 'bigquery', 'snowflake', 'ms sql', 'tsql', 't-sql'] },
  { id: 'python', name: 'Python', group: 'code', aliases: ['python', 'פייתון', 'pandas', 'numpy', 'jupyter'] },
  { id: 'r', name: 'R', group: 'code', aliases: ['r studio', 'rstudio', ' r,', ' r ', '(r)', 'r/python', 'python/r', 'python or r'] },
  { id: 'matlab', name: 'MATLAB', group: 'code', aliases: ['matlab', 'מטלב'] },
  { id: 'stats', name: 'סטטיסטיקה', group: 'stats', aliases: ['statistics', 'statistical', 'סטטיסטיקה', 'סטטיסטי', 'regression', 'רגרסיה', 'hypothesis'] },
  { id: 'ab', name: 'A/B Testing', group: 'stats', aliases: ['a/b', 'ab test', 'ab testing', 'experiments', 'ניסויים'] },
  { id: 'ml', name: 'Machine Learning', group: 'stats', aliases: ['machine learning', 'למידת מכונה', 'ml models'] },
  { id: 'dataanalysis', name: 'ניתוח נתונים', group: 'data', aliases: ['data analysis', 'analyzing data', 'analytical', 'ניתוח נתונים', 'ניתוח נתוני', 'ניתחתי נתונים', 'ניתחתי נתוני', 'ניתוח מידע', 'אנליטי', 'אנליטית', 'יכולות אנליטיות', 'analytics'] },

  // ניהול פרויקטים
  { id: 'pm', name: 'ניהול פרויקטים', group: 'pm', aliases: ['project management', 'managing projects', 'ניהול פרויקטים', 'ניהול פרוייקטים', 'ניהול פרויקט', 'pmo'] },
  { id: 'msproject', name: 'MS Project', group: 'pmtools', aliases: ['ms project', 'microsoft project', 'מיקרוסופט פרוג׳קט', 'גאנט', 'gantt'] },
  { id: 'jira', name: 'Jira', group: 'pmtools', aliases: ['jira', 'ג׳ירה', "ג'ירה", 'confluence'] },
  { id: 'monday', name: 'Monday', group: 'pmtools', aliases: ['monday.com', 'monday', 'מאנדיי', 'asana', 'trello', 'clickup', 'notion'] },
  { id: 'agile', name: 'Agile / Scrum', group: 'pm', aliases: ['agile', 'scrum', 'אג׳ייל', "אג'ייל", 'סקראם', 'kanban', 'sprint'] },
  { id: 'stakeholders', name: 'עבודה מול ממשקים', group: 'soft', aliases: ['stakeholder', 'stakeholders', 'cross-functional', 'cross functional', 'ממשקים', 'עבודה מול גורמים', 'ממשקי עבודה', 'בעלי עניין'] },

  // מוצר
  { id: 'product', name: 'ניהול מוצר', group: 'product', aliases: ['product management', 'product manager', 'ניהול מוצר', 'מנהל מוצר', 'מנהלת מוצר', 'roadmap', 'רודמאפ'] },
  { id: 'prd', name: 'אפיון (PRD)', group: 'product', aliases: ['prd', 'product requirements', 'writing requirements', 'specifications', 'אפיון', 'אפיונים', 'כתיבת דרישות', 'user stories'] },
  { id: 'ux', name: 'UX / מחקר משתמשים', group: 'product', aliases: ['ux', 'user research', 'figma', 'פיגמה', 'wireframe', 'חוויית משתמש', 'מחקר משתמשים'] },

  // הנדסת תעשייה וניהול / תפעול
  { id: 'or', name: 'חקר ביצועים / אופטימיזציה', group: 'ie', aliases: ['operations research', 'optimization', 'אופטימיזציה', 'חקר ביצועים', 'linear programming', 'תכנון לינארי'] },
  { id: 'simulation', name: 'סימולציה', group: 'ie', aliases: ['simulation', 'סימולציה', 'arena', 'anylogic'] },
  { id: 'lean', name: 'Lean / Six Sigma', group: 'ie', aliases: ['lean', 'six sigma', 'שש סיגמא', 'kaizen', 'קאיזן', '5s'] },
  { id: 'process', name: 'שיפור תהליכים', group: 'ie', aliases: ['process improvement', 'process optimization', 'שיפור תהליכים', 'ייעול תהליכים', 'מיפוי תהליכים', 'process mapping', 'bpm'] },
  { id: 'supply', name: 'שרשרת אספקה / לוגיסטיקה', group: 'ops', aliases: ['supply chain', 'שרשרת אספקה', 'logistics', 'לוגיסטיקה', 'רכש', 'procurement', 'inventory', 'מלאי'] },
  { id: 'planning', name: 'תכנון ובקרת ייצור', group: 'ops', aliases: ['production planning', 'תכנון ייצור', 'תכנון ובקרה', 'בקרת ייצור', 'demand planning', 'תכנון ביקושים', 'forecasting', 'חיזוי'] },
  { id: 'quality', name: 'איכות', group: 'ops', aliases: ['quality assurance', 'quality control', 'הבטחת איכות', 'בקרת איכות', 'iso 9001', 'iso'] },
  { id: 'erp', name: 'ERP (SAP / Priority)', group: 'erp', aliases: ['erp', 'sap', 'priority', 'פריוריטי', 'oracle erp', 'netsuite'] },
  { id: 'costing', name: 'תמחיר / תקציב', group: 'fin', aliases: ['budget', 'budgeting', 'תקציב', 'תמחיר', 'costing', 'cost analysis', 'עלויות'] },
  { id: 'finmodel', name: 'מודלים פיננסיים', group: 'fin', aliases: ['financial model', 'financial modeling', 'מודל פיננסי', 'מודלים פיננסיים', 'fp&a', 'p&l'] },

  // שיווק ועסקים
  { id: 'ga', name: 'Google Analytics', group: 'mkt', aliases: ['google analytics', 'ga4', 'mixpanel', 'amplitude'] },
  { id: 'mktanalytics', name: 'אנליטיקה שיווקית', group: 'mkt', aliases: ['marketing analytics', 'campaign', 'campaigns', 'קמפיין', 'קמפיינים', 'ppc', 'seo', 'performance marketing', 'funnel', 'משפך'] },
  { id: 'crm', name: 'CRM', group: 'mkt', aliases: ['crm', 'salesforce', 'hubspot', 'סיילספורס'] },
  { id: 'kpi', name: 'KPIs / מדדים', group: 'data', aliases: ['kpi', 'kpis', 'metrics', 'מדדים', 'מדדי ביצוע'] },

  // רכים ושפות
  { id: 'english', name: 'אנגלית', group: 'lang', aliases: ['english', 'אנגלית'] },
  { id: 'presentation', name: 'הצגה ופרזנטציות', group: 'soft', aliases: ['presentation', 'powerpoint', 'פאוורפוינט', 'מצגות', 'פרזנטציה'] },
  { id: 'communication', name: 'תקשורת בין-אישית', group: 'soft', aliases: ['communication skills', 'interpersonal', 'יחסי אנוש', 'תקשורת בין אישית', 'כושר ביטוי'] },
  { id: 'multitask', name: 'ריבוי משימות', group: 'soft', aliases: ['multitask', 'multi-task', 'ריבוי משימות', 'סדר וארגון', 'organizational skills', 'יכולת ארגון'] },
];

// משפחות שנחשבות קרובות זו לזו (התאמה חלקית חלשה יותר)
const RELATED_GROUPS = {
  viz: ['sheets', 'data'], sheets: ['viz', 'data'], data: ['viz', 'code', 'stats'], code: ['data', 'stats'], stats: ['code', 'data'],
  pm: ['pmtools', 'product'], pmtools: ['pm'], product: ['pm', 'ux'],
  ie: ['ops', 'stats'], ops: ['ie', 'erp'], erp: ['ops'], fin: ['sheets'], mkt: ['data'], soft: [], lang: [],
};

const GROUP_LABEL = {
  viz: 'ויזואליזציה ו-BI', sheets: 'גיליונות', data: 'נתונים', code: 'תכנות', stats: 'סטטיסטיקה',
  pm: 'ניהול פרויקטים', pmtools: 'כלי ניהול', product: 'מוצר', ie: 'הנדסת תעשייה', ops: 'תפעול',
  erp: 'ERP', fin: 'פיננסים', mkt: 'שיווק', soft: 'כישורים רכים', lang: 'שפות',
};

// כישורים רכים ושפה שוקלים פחות בציון
const GROUP_WEIGHT = { soft: 0.4, lang: 0.6 };

function norm(text) {
  return ' ' + String(text || '').toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ') + ' ';
}

function hasAlias(t, alias) {
  const a = alias.toLowerCase();
  // באנגלית מוודאים גבולות מילה; בעברית מספיק שהמחרוזת מופיעה (בגלל תחיליות כמו ב/ו/ה)
  if (/^[a-z0-9 .\/&+#()-]+$/.test(a) && !a.startsWith(' ')) {
    const esc = a.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
    return new RegExp('(^|[^a-z0-9])' + esc + '($|[^a-z0-9])').test(t);
  }
  return t.includes(a);
}

function extractSkills(text) {
  const t = norm(text);
  const found = new Set();
  for (const s of SKILLS) if (s.aliases.some(a => hasAlias(t, a))) found.add(s.id);
  // Excel מתקדם מכסה גם Excel רגיל
  if (found.has('excel_adv')) found.add('excel');
  return found;
}

const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

// מזהה אילו כישורים במשרה הם "יתרון" ולא דרישת חובה
const NICE_MARKERS = ['יתרון', 'advantage', 'nice to have', 'a plus', 'is a plus', 'bonus', 'preferred', 'מהווה יתרון', 'רצוי'];

function splitRequirements(text) {
  const lines = String(text || '').split(/\n|•|·|;|•/);
  const must = new Set(), nice = new Set();
  for (const line of lines) {
    const skills = extractSkills(line);
    if (!skills.size) continue;
    const isNice = NICE_MARKERS.some(m => line.toLowerCase().includes(m));
    skills.forEach(id => (isNice ? nice : must).add(id));
  }
  nice.forEach(id => { if (must.has(id)) nice.delete(id); });
  return { must, nice };
}

// ---------- סיווג תחום ----------
const CATEGORIES = [
  { id: 'pm', label: 'ניהול פרויקטים', priority: 1,
    title: ['project manager', 'project coordinator', 'project lead', 'pmo', 'program coordinator', 'מנהל פרויקט', 'מנהלת פרויקט', 'מנהל/ת פרויקט', 'מנהל.ת פרויקט', 'רכז פרויקט', 'רכזת פרויקט', 'רכז/ת פרויקט', 'מתאם פרויקט', 'מתאמת פרויקט', 'implementation', 'הטמעה'],
    desc: ['ניהול פרויקטים', 'project management', 'לוחות זמנים', 'timelines', 'milestones', 'אבני דרך'] },
  { id: 'product', label: 'מוצר', priority: 1,
    title: ['product manager', 'product owner', 'associate product', 'product operations', 'product ops', 'מנהל מוצר', 'מנהלת מוצר', 'מנהל/ת מוצר', 'מנהל.ת מוצר', 'אחראי מוצר'],
    desc: ['roadmap', 'רודמאפ', 'prd', 'אפיון מוצר', 'user stories'] },
  { id: 'analyst', label: 'אנליסט', priority: 2,
    title: ['analyst', 'אנליסט', 'אנליסטית', 'אנליסט/ית', 'bi developer', 'bi', 'data scientist', 'insights', 'analytics'],
    desc: ['data analysis', 'ניתוח נתונים', 'dashboards', 'דשבורד', 'sql', 'power bi', 'tableau'] },
  { id: 'ops', label: 'תפעול / הנדסת תעשייה', priority: 3,
    title: ['operations', 'תפעול', 'מהנדס תעשייה', 'מהנדסת תעשייה', 'מהנדס/ת תעשייה', 'industrial engineer', 'process engineer', 'מהנדס תהליכים', 'מהנדסת תהליכים', 'supply chain', 'שרשרת אספקה', 'planner', 'מתכנן', 'מתכננת', 'לוגיסטיקה', 'logistics', 'איכות', 'quality', 'efficiency', 'ייעול', 'procurement', 'רכש', 'business operations'],
    desc: ['הנדסת תעשייה וניהול', 'industrial engineering', 'שיפור תהליכים', 'process improvement', 'lean', 'תכנון ייצור', 'supply chain'] },
];

const ANALYST_SUBTYPES = [
  { id: 'bi', label: 'BI', words: ['bi', 'power bi', 'tableau', 'business intelligence', 'bi analyst', 'bi developer'] },
  { id: 'product', label: 'מוצר', words: ['product analyst', 'אנליסט מוצר', 'אנליסטית מוצר', 'product analytics'] },
  { id: 'marketing', label: 'שיווק', words: ['marketing analyst', 'אנליסט שיווק', 'marketing analytics', 'performance', 'campaign'] },
  { id: 'business', label: 'עסקי', words: ['business analyst', 'אנליסט עסקי', 'אנליסטית עסקית', 'אנליסט/ית עסקי'] },
  { id: 'finance', label: 'פיננסי', words: ['financial analyst', 'fp&a', 'אנליסט פיננסי', 'אנליסטית פיננסית', 'כלכלן', 'כלכלנית'] },
  { id: 'data', label: 'דאטה', words: ['data analyst', 'אנליסט דאטה', 'אנליסט נתונים', 'אנליסטית נתונים', 'data scientist'] },
  { id: 'ops', label: 'תפעולי', words: ['operations analyst', 'אנליסט תפעול', 'supply chain analyst'] },
];

function classify(title, desc) {
  const t = norm(title), d = norm(desc);
  let best = null;
  for (const c of CATEGORIES) {
    let score = 0;
    if (c.title.some(w => hasAlias(t, w))) score += 3;
    score += c.desc.filter(w => hasAlias(d, w)).length * 0.5;
    if (score > 0 && (!best || score > best.score || (score === best.score && c.priority < best.cat.priority))) best = { cat: c, score };
  }
  // משרה שלא זוהתה לפי שם אבל התיאור מתאים לתואר → נספרת ככזו
  const cat = best && best.score >= 1 ? best.cat : null;
  let subtype = null;
  if (cat && cat.id === 'analyst') {
    const all = t + ' ' + d;
    const st = ANALYST_SUBTYPES.find(s => s.words.some(w => hasAlias(t, w))) || ANALYST_SUBTYPES.find(s => s.words.some(w => hasAlias(all, w)));
    subtype = st ? st.label : null;
  }
  return {
    id: cat ? cat.id : 'other',
    label: cat ? cat.label + (subtype ? ' · ' + subtype : '') : 'אחר',
    priority: cat ? cat.priority : 4,
    viaDescription: !!(cat && best.score < 3),
  };
}

// ---------- ניסיון ובכירות ----------
// בכירות נבדקת לפי שם התפקיד בלבד: בתיאורים מופיעות מילים כמו "lead" גם במשרות ג׳וניור
function experience(title, text) {
  const t = norm(text), tt = norm(title);
  const junior = ['junior', "ג'וניור", 'ג׳וניור', 'entry level', 'entry-level', 'graduate', 'בוגר', 'בוגרת', 'בוגרי', 'ללא ניסיון', 'no experience', 'סטודנט', 'student', 'intern', 'התמחות', 'משרת כניסה', 'first job'];
  const senior = ['senior', 'סניור', 'בכיר', 'בכירה', 'lead', 'team lead', 'head of', 'director', 'vp', 'ראש צוות', 'ראש תחום', 'principal', 'staff'];
  const studentOnly = ['משרת סטודנט', 'student position', 'סטודנט/ית בלבד', 'חלקית', 'part time', 'part-time', 'משמרות'];

  let years = null;
  const patterns = [
    /(\d+)\s*\+?\s*(?:-\s*\d+\s*)?(?:years|yrs|year)/,
    /(\d+)\s*\+?\s*(?:-\s*\d+\s*)?שנות\s*ניסיון/,
    /ניסיון\s*(?:של\s*)?(?:לפחות\s*)?(?:מוכח\s*)?(?:של\s*)?(\d+)\s*\+?\s*שנ/,
    /(\d+)\s*\+?\s*שנים\s*(?:לפחות\s*)?(?:ניסיון|בתפקיד)/,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) { years = parseInt(m[1], 10); break; }
  }
  if (years === null) {
    if (/שנת ניסיון|year of experience|1 year/.test(t)) years = 1;
    else if (/שנתיים/.test(t)) years = 2;
  }
  if (years !== null && years > 15) years = null;

  const isJunior = junior.some(w => hasAlias(t, w));
  const isSenior = senior.some(w => hasAlias(tt, w));
  const notFullTime = studentOnly.some(w => t.includes(w));

  let level, fit;
  if (isSenior && !isJunior) { level = 'בכיר'; fit = 0.1; }
  else if (years === null) { level = isJunior ? 'ג׳וניור / ללא ניסיון' : 'לא צוין'; fit = isJunior ? 1 : 0.8; }
  else if (years === 0) { level = 'ללא ניסיון'; fit = 1; }
  else if (years === 1) { level = 'עד שנה'; fit = 0.8; }
  else if (years === 2) { level = '2 שנים'; fit = 0.5; }
  else { level = years + '+ שנים'; fit = years === 3 ? 0.3 : 0.15; }

  const temporary = ['maternity', 'temporary', 'contract', 'חופשת לידה', 'זמני', 'זמנית', 'מילוי מקום'].some(w => t.includes(w));
  return { years, level, fit, isJunior, isSenior, notFullTime, temporary };
}

// ---------- תואר ----------
function degreeFit(text) {
  const t = norm(text);
  if (['הנדסת תעשייה', 'תעשייה וניהול', 'industrial engineering', 'industrial & management', 'ie degree'].some(w => t.includes(w))) return { fit: 1, label: 'מבקשים בדיוק את התואר שלך' };
  if (['הנדסה', 'engineering', 'כלכלה', 'economics', 'מדעי הנתונים', 'statistics', 'סטטיסטיקה', 'מתמטיקה', 'quantitative', 'כמותי', 'stem'].some(w => t.includes(w))) return { fit: 0.85, label: 'תואר רלוונטי (הנדסה/כמותי)' };
  if (['b.sc', 'bsc', 'b.a', 'ba ', 'תואר ראשון', "bachelor", 'degree', 'תואר אקדמי', 'אקדמאי'].some(w => t.includes(w))) return { fit: 0.75, label: 'תואר אקדמי, התואר שלך עונה' };
  return { fit: 0.7, label: 'לא צוינה דרישת תואר' };
}

// ---------- מיקום ----------
const CITIES = [
  { name: 'תל אביב', region: 'ta', words: ['תל אביב', 'תל-אביב', 'ת"א', 'ת״א', 'tel aviv', 'tel-aviv', 'רמת החייל', 'יפו'] },
  { name: 'רמת גן', region: 'core', words: ['רמת גן', 'רמת-גן', 'ramat gan', 'בורסה', 'הבורסה'] },
  { name: 'גבעתיים', region: 'core', words: ['גבעתיים', 'givatayim'] },
  { name: 'בני ברק', region: 'core', words: ['בני ברק', 'bnei brak'] },
  { name: 'הרצליה', region: 'core', words: ['הרצליה', 'herzliya', 'herzlia'] },
  { name: 'פתח תקווה', region: 'core', words: ['פתח תקווה', 'פתח תקוה', 'פ"ת', 'petah tikva', 'petach tikva', 'petah tikva'] },
  { name: 'חולון', region: 'core', words: ['חולון', 'holon'] },
  { name: 'בת ים', region: 'core', words: ['בת ים', 'bat yam'] },
  { name: 'אור יהודה', region: 'core', words: ['אור יהודה', 'or yehuda'] },
  { name: 'קריית אונו', region: 'core', words: ['קריית אונו', 'קרית אונו', 'kiryat ono'] },
  { name: 'ראשון לציון', region: 'center', words: ['ראשון לציון', 'ראשל"צ', 'rishon'] },
  { name: 'ראש העין', region: 'center', words: ['ראש העין', 'rosh haayin', "rosh ha'ayin"] },
  { name: 'יהוד', region: 'center', words: ['יהוד', 'yehud'] },
  { name: 'רעננה', region: 'center', words: ['רעננה', "ra'anana", 'raanana'] },
  { name: 'כפר סבא', region: 'center', words: ['כפר סבא', 'kfar saba'] },
  { name: 'הוד השרון', region: 'center', words: ['הוד השרון', 'hod hasharon'] },
  { name: 'נס ציונה', region: 'center', words: ['נס ציונה', 'ness ziona', 'nes ziona'] },
  { name: 'רחובות', region: 'center', words: ['רחובות', 'rehovot'] },
  { name: 'לוד', region: 'center', words: ['לוד', 'lod', 'airport city', 'איירפורט סיטי'] },
  { name: 'שוהם', region: 'center', words: ['שוהם', 'shoham'] },
  { name: 'מודיעין', region: 'center', words: ['מודיעין', "modi'in", 'modiin'] },
  { name: 'נתניה', region: 'center', words: ['נתניה', 'netanya'] },
  { name: 'ירושלים', region: 'far', words: ['ירושלים', 'jerusalem'] },
  { name: 'חיפה', region: 'far', words: ['חיפה', 'haifa'] },
  { name: 'יקנעם', region: 'far', words: ['יקנעם', 'yokneam'] },
  { name: 'קיסריה', region: 'far', words: ['קיסריה', 'caesarea'] },
  { name: 'באר שבע', region: 'far', words: ['באר שבע', 'beer sheva', "be'er sheva"] },
  { name: 'מגדל העמק', region: 'far', words: ['מגדל העמק', 'migdal haemek'] },
  { name: 'אשדוד', region: 'far', words: ['אשדוד', 'ashdod'] },
];
const REGION = {
  ta: { label: 'תל אביב', fit: 1 },
  core: { label: 'סובב ת"א', fit: 0.92 },
  center: { label: 'מרכז', fit: 0.78 },
  far: { label: 'מחוץ למרכז', fit: 0.3 },
  remote: { label: 'מהבית', fit: 0.9 },
  unknown: { label: 'לא ידוע', fit: 0.6 },
};

function detectCity(text) {
  const t = norm(text);
  for (const c of CITIES) if (c.words.some(w => hasAlias(t, w))) return { city: c.name, region: c.region };
  if (/remote|מהבית|עבודה מרחוק/.test(t)) return { city: 'מהבית', region: 'remote' };
  return { city: '', region: 'unknown' };
}

function regionOf(city) {
  if (!city) return 'unknown';
  return detectCity(city).region;
}

// ---------- שכר ----------
// הערכה גסה לשכר ברוטו חודשי למשרת ג׳וניור באזור המרכז (₪). זו לא הבטחה, רק נקודת ייחוס.
const SALARY = {
  pm: [12000, 16000], product: [15000, 21000], analyst: [13000, 18000], ops: [12000, 16000], other: [10000, 14000],
};
const ANALYST_SALARY = { 'BI': [13000, 18000], 'מוצר': [15000, 20000], 'שיווק': [12000, 16000], 'עסקי': [13000, 17000], 'פיננסי': [12000, 16000], 'דאטה': [14000, 19000], 'תפעולי': [12000, 16000] };

function estimateSalary(cat, text) {
  // אם השכר כתוב במשרה, משתמשים בו
  const m = String(text || '').replace(/,/g, '').match(/(\d{4,5})\s*(?:-|–|עד)\s*(\d{4,5})\s*(?:₪|ש"ח|שח|nis|ils)/i)
    || String(text || '').replace(/,/g, '').match(/(?:₪|ש"ח|nis|ils)\s*(\d{4,5})\s*(?:-|–)\s*(\d{4,5})/i);
  if (m) return { min: +m[1], max: +m[2], source: 'מופיע במשרה' };
  let range = SALARY[cat.id] || SALARY.other;
  const sub = cat.label.split(' · ')[1];
  if (cat.id === 'analyst' && sub && ANALYST_SALARY[sub]) range = ANALYST_SALARY[sub];
  return { min: range[0], max: range[1], source: 'הערכה' };
}

// ---------- ציון התאמה ----------
function analyze(job, profile) {
  const text = [job.title, job.company, job.location, job.description].join('\n');
  const cvSkills = new Set([...extractSkills(profile.cv || ''), ...(profile.extraSkills || [])]);
  const { must, nice } = splitRequirements(job.description || '');
  // כישורים שמופיעים בכותרת נחשבים דרישה
  extractSkills(job.title || '').forEach(id => { must.add(id); nice.delete(id); });

  const cvGroups = new Set([...cvSkills].map(id => SKILL_BY_ID[id].group));
  const evalSkill = (id) => {
    const s = SKILL_BY_ID[id];
    if (cvSkills.has(id)) return { id, name: s.name, state: 'have', credit: 1 };
    const sameGroup = [...cvSkills].filter(c => SKILL_BY_ID[c].group === s.group && s.group !== 'soft' && s.group !== 'lang');
    if (sameGroup.length) return { id, name: s.name, state: 'similar', credit: 0.65, via: sameGroup.map(c => SKILL_BY_ID[c].name) };
    const related = (RELATED_GROUPS[s.group] || []).filter(g => cvGroups.has(g));
    if (related.length) {
      const via = [...cvSkills].filter(c => related.includes(SKILL_BY_ID[c].group)).slice(0, 2).map(c => SKILL_BY_ID[c].name);
      return { id, name: s.name, state: 'partial', credit: 0.3, via };
    }
    return { id, name: s.name, state: 'missing', credit: 0 };
  };

  const mustRes = [...must].map(evalSkill);
  const niceRes = [...nice].map(evalSkill);

  let num = 0, den = 0;
  for (const r of mustRes) { const w = GROUP_WEIGHT[SKILL_BY_ID[r.id].group] || 1; num += w * r.credit; den += w; }
  for (const r of niceRes) { const w = 0.4 * (GROUP_WEIGHT[SKILL_BY_ID[r.id].group] || 1); num += w * r.credit; den += w; }
  // החלקה: כשהמשרה מזכירה מעט כישורים, הציון נמשך לאמצע ולא קופץ ל-100%
  const skillScore = (num + 0.5 * 1.5) / (den + 1.5);

  const cat = classify(job.title, job.description);
  const exp = experience(job.title, text);
  const deg = degreeFit(job.description);
  const loc = job.location ? detectCity(job.location) : detectCity(text);
  const region = REGION[loc.region];

  // ציון התאמה כללי
  let score = 0.55 * skillScore + 0.2 * exp.fit + 0.1 * deg.fit + 0.15 * region.fit;
  if (exp.notFullTime) score *= 0.85;
  const match = Math.round(score * 100);

  // סיכוי לעבור סינון ראשוני: מושפע מאוד מניסיון ומדרישות חובה חסרות
  const missingMust = mustRes.filter(r => r.state === 'missing' && !['soft', 'lang'].includes(SKILL_BY_ID[r.id].group));
  let screen = 0.5 * skillScore + 0.35 * exp.fit + 0.15 * deg.fit;
  screen -= Math.min(0.3, missingMust.length * 0.08);
  if (exp.isSenior) screen = Math.min(screen, 0.15);
  const screenPct = Math.max(3, Math.min(90, Math.round(screen * 100)));

  let verdict;
  if (exp.isSenior && !exp.isJunior) verdict = { level: 'no', text: 'לא מומלץ: משרה בכירה' };
  else if (exp.years >= 3) verdict = { level: 'no', text: 'דורשת ' + exp.years + '+ שנות ניסיון' };
  else if (match >= 70 && screenPct >= 50 && exp.fit >= 0.8) verdict = { level: 'yes', text: 'כדאי להגיש' };
  else if (match >= 55) verdict = { level: 'maybe', text: 'שווה לנסות, עם התאמת קו״ח' };
  else verdict = { level: 'no', text: 'התאמה נמוכה' };

  const reasons = [];
  if (cat.viaDescription && cat.id !== 'other') reasons.push('זוהתה כמשרת ' + cat.label + ' לפי התיאור, לא לפי שם התפקיד');
  if (exp.isJunior) reasons.push('מתאימה לג׳וניור / בוגרים');
  if (exp.years >= 2) reasons.push('דורשת ' + exp.years + '+ שנות ניסיון');
  if (exp.notFullTime) reasons.push('נראית כמשרה חלקית או משרת סטודנט');
  if (exp.temporary) reasons.push('משרה זמנית (למשל החלפת חופשת לידה). לפעמים זו דרך טובה להיכנס לחברה');
  if (missingMust.length) reasons.push('חסרים כישורי חובה: ' + missingMust.map(r => r.name).join(', '));
  const sim = [...mustRes, ...niceRes].filter(r => r.state === 'similar');
  if (sim.length) reasons.push('יש לך כישורים דומים: ' + sim.map(r => r.via[0] + ' ≈ ' + r.name).join(', '));

  return {
    match, screenPct, verdict, category: cat, experience: exp, degree: deg,
    city: loc.city, region: loc.region, regionLabel: region.label,
    salary: estimateSalary(cat, job.description),
    skills: { must: mustRes, nice: niceRes }, reasons,
    // מיון חכם: קודם לפי תחום מועדף, ומשרות שלא מומלצות יורדות לסוף
    sortKey: (verdict.level === 'no' ? 5000 : 0) + cat.priority * 1000 - match - (loc.region === 'ta' ? 5 : 0),
  };
}

// ---------- התאמת קורות חיים ----------
const WEAK_STARTS = ['אחראי על', 'אחראית על', 'עזרתי', 'סייעתי', 'השתתפתי', 'היה לי', 'responsible for', 'helped', 'assisted', 'worked on', 'participated', 'was involved'];
const STRONG_VERBS_HE = 'הובלתי, ניתחתי, פיתחתי, בניתי, ייעלתי, שיפרתי, הטמעתי, תכננתי, ניהלתי, אפיינתי';
const STRONG_VERBS_EN = 'Led, Analyzed, Built, Developed, Improved, Optimized, Implemented, Designed, Managed, Reduced';

function tailorCV(cv, job, prof) {
  const jobSkills = extractSkills((job.title || '') + '\n' + (job.description || ''));
  // prof = הכישורים בפועל (כולל מה שהוספת/הסרת ידנית)
  const cvSkills = prof ? new Set(prof.extraSkills) : extractSkills(cv);
  const res = analyze(job, prof || { cv });
  const all = [...res.skills.must, ...res.skills.nice];

  // מילות מפתח: מה יש, מה דומה (ואיך לנסח בכנות), מה חסר
  const keywords = all.map(r => {
    const s = SKILL_BY_ID[r.id];
    let tip = '';
    if (r.state === 'have') tip = 'השתמשי במונח "' + s.name + '" כפי שהוא כתוב במשרה, ושימי אותו גבוה בקו״ח';
    else if (r.state === 'similar') tip = 'אל תכתבי "' + s.name + '" אם לא עבדת איתו. אפשר להדגיש את ' + r.via.join(', ') + ' ולציין במכתב הפנייה שזה כלי מקביל שקל לך ללמוד';
    else if (r.state === 'partial') tip = 'אין התאמה ישירה. אפשר להבליט ניסיון קרוב (' + r.via.join(', ') + ') בלי לטעון לידע ב-' + s.name;
    else tip = 'חסר. לא להוסיף לקו״ח. אפשר לשקול קורס קצר אם זה חוזר בהרבה משרות';
    return { ...r, tip };
  });

  // שורות/בולטים מקו״ח, מדורגים לפי רלוונטיות למשרה
  const lines = String(cv || '').split('\n').map(l => l.trim()).filter(l => l.length > 15);
  const bullets = lines.map(line => {
    const ls = extractSkills(line);
    const hits = [...ls].filter(id => jobSkills.has(id));
    const tips = [];
    const low = line.toLowerCase().replace(/^[-•*·\s]+/, '');
    if (WEAK_STARTS.some(w => low.startsWith(w))) tips.push('פתיחה חלשה. עדיף פועל פעיל (' + (/[a-z]/.test(low[0]) ? STRONG_VERBS_EN : STRONG_VERBS_HE) + ')');
    const isList = /^[^:]{0,20}:/.test(low) || low.split(' ').length < 6;
    if (!/\d/.test(line) && hits.length && !isList) tips.push('אין מספר. אם יש תוצאה אמיתית שאפשר למדוד (אחוז, זמן, כמות), כדאי להוסיף');
    const simHere = keywords.filter(k => k.state === 'similar' && k.via.some(v => ls.has(Object.keys(SKILL_BY_ID).find(id => SKILL_BY_ID[id].name === v))));
    if (simHere.length) tips.push('המשרה מבקשת ' + simHere.map(k => k.name).join(', ') + '. הבולט הזה מראה כלי מקביל, אז כדאי להבליט אותו');
    return { line, hits: hits.map(id => SKILL_BY_ID[id].name), score: hits.length, tips };
  }).filter(b => b.score > 0 || b.tips.length).sort((a, b) => b.score - a.score);

  // רשימת כישורים מסודרת לפי רלוונטיות, רק כאלה שיש לך באמת
  const ordered = [...cvSkills].sort((a, b) => (jobSkills.has(b) ? 1 : 0) - (jobSkills.has(a) ? 1 : 0)).map(id => SKILL_BY_ID[id].name);

  return { keywords, bullets, skillsLine: ordered, result: res };
}

window.Engine = { SKILLS, SKILL_BY_ID, GROUP_LABEL, REGION, extractSkills, analyze, tailorCV, detectCity, regionOf, classify };
