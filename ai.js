// ניתוח עם Claude (אופציונלי). דורש מפתח API אישי שהמשתמשת מזינה בעצמה; המפתח נשמר רק במכשיר.
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.127.0/+esm';
const MODEL = 'claude-opus-5-5';

const HONESTY = `כללי יושר מחייבים:
- אסור להמציא ניסיון, כישורים, כלים, תארים, מספרים או תוצאות שלא מופיעים בקורות החיים.
- מותר רק לנסח מחדש עובדות שכבר כתובות, ולהשתמש במונחים מהמשרה כשהם מתארים נכון את מה שכתוב.
- כשלא ברור אם למועמדת יש כישור, סמני אותו כ"צריך אישור" ואל תניחי שיש.
- כתבי בעברית, בגוף שני נקבה.`;

let cached = { key: null, client: null };
async function client(apiKey) {
  if (cached.key !== apiKey) {
    const { default: Anthropic } = await import(SDK_URL);
    // האפליקציה רצה כולה בדפדפן, בלי שרת. המפתח של המשתמשת נשלח ישירות ל-Anthropic
    cached = { key: apiKey, client: new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) };
  }
  return cached.client;
}

async function ask(apiKey, system, user, schema) {
  const c = await client(apiKey);
  const res = await c.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (res.stop_reason === 'refusal') throw new Error('הבקשה נדחתה על ידי המודל');
  if (res.stop_reason === 'max_tokens') throw new Error('התשובה נקטעה. נסי שוב');
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text);
}

const str = { type: 'string' };
const strArr = { type: 'array', items: str };

// תפקידים שהמועמדת אולי לא חשבה עליהם, לפי קורות החיים
export async function suggestRoles(apiKey, cv, targets) {
  const schema = {
    type: 'object', additionalProperties: false, required: ['summary', 'roles'],
    properties: {
      summary: str,
      roles: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false,
          required: ['title_he', 'title_en', 'why', 'evidence', 'gaps', 'search_terms', 'fit'],
          properties: {
            title_he: str, title_en: str, why: str, evidence: strArr, gaps: strArr, search_terms: strArr,
            fit: { type: 'integer', minimum: 0, maximum: 100 },
          },
        },
      },
    },
  };
  return ask(apiKey,
    `את יועצת קריירה לבוגרי הנדסת תעשייה וניהול בישראל, עם היכרות עם שוק העבודה בתל אביב והמרכז.\n${HONESTY}`,
    `קורות החיים שלי:\n<cv>\n${cv}\n</cv>\n\nאני מכוונת בעיקר ל: ${targets}.\n` +
    `הציעי 6-8 תפקידים ברמת ג׳וניור שמתאימים לקורות החיים שלי, כולל תפקידים שאולי לא חשבתי עליהם (מחוץ לרשימה שלי). ` +
    `לכל תפקיד: למה הוא מתאים, אילו פרטים מקורות החיים תומכים בזה (ציטוט קצר), מה חסר, ומונחי חיפוש בעברית ובאנגלית למשרות כאלה. ` +
    `summary: 2-3 משפטים על החוזקות שלי כמועמדת.`,
    schema);
}

// התאמת קורות חיים למשרה: מילות מפתח ושיפור ניסוח, בלי להמציא
export async function tailor(apiKey, cv, job) {
  const schema = {
    type: 'object', additionalProperties: false, required: ['keywords', 'bullets', 'summary_line'],
    properties: {
      keywords: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['keyword', 'status', 'evidence', 'advice'],
          properties: {
            keyword: str,
            status: { type: 'string', enum: ['exact', 'reword', 'confirm', 'missing'] },
            evidence: str, advice: str,
          },
        },
      },
      bullets: {
        type: 'array',
        items: {
          type: 'object', additionalProperties: false, required: ['original', 'improved', 'keywords_used'],
          properties: { original: str, improved: str, keywords_used: strArr },
        },
      },
      summary_line: str,
    },
  };
  return ask(apiKey,
    `את מומחית לקורות חיים ולמערכות סינון אוטומטיות (ATS).\n${HONESTY}`,
    `קורות החיים שלי:\n<cv>\n${cv}\n</cv>\n\nהמשרה:\n<job>\n${job.title}\n${job.company || ''}\n${job.description || ''}\n</job>\n\n` +
    `1. keywords: מילות המפתח החשובות במשרה (כלים, כישורים, מונחים מקצועיים). לכל אחת status: ` +
    `exact = מופיעה בקו״ח כמו שהיא; reword = יש לי את זה לפי הקו״ח אבל בניסוח אחר (evidence = הציטוט מהקו״ח); ` +
    `confirm = ייתכן שיש לי אבל הקו״ח לא מראה את זה; missing = אין לי. advice: מה לעשות, בלי להמציא.\n` +
    `2. bullets: 3-6 שורות מהקו״ח שכדאי לשפר למשרה הזו. improved חייב לכלול רק עובדות מהשורה המקורית, בניסוח חזק יותר ועם המונחים של המשרה כשהם נכונים.\n` +
    `3. summary_line: משפט פתיחה קצר לקו״ח, מותאם למשרה, רק על בסיס מה שכתוב.`,
    schema);
}
