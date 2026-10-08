// רץ ב-GitHub אחרי כל איסוף: מחשב התאמה למשרות החדשות ושולח התראת Push למכשירים שנרשמו.
// ההגדרות (מנוי ההתראות, רשימת הכישורים והסף) שמורות בסוד PUSH_CONFIG, לא במאגר הציבורי.
import fs from 'node:fs';
import vm from 'node:vm';
import webpush from 'web-push';

const config = JSON.parse(process.env.PUSH_CONFIG || 'null');
if (!config || !config.devices?.length) {
  console.log('אין מכשירים רשומים להתראות');
  process.exit(0);
}

// אותו מנוע התאמה שרץ באפליקציה
const sandbox = { window: {}, console };
vm.runInNewContext(fs.readFileSync('engine.js', 'utf8'), sandbox);
const Engine = sandbox.window.Engine;

const readJobs = path => { try { return JSON.parse(fs.readFileSync(path, 'utf8')).jobs || []; } catch { return []; } };
const prevUrls = new Set(readJobs(process.env.PREV_JOBS || '/tmp/prev-jobs.json').map(j => j.url));
let notified = [];
try { notified = JSON.parse(fs.readFileSync('notified.json', 'utf8')); } catch {}
const notifiedSet = new Set(notified);

const threshold = config.threshold || 95;
const profile = { cv: '', extraSkills: config.skills || [] };
// מקסימום התראות ביום (ברירת מחדל 4): רק המשרות הכי שוות, לא הצפה
let log = {};
try { log = JSON.parse(fs.readFileSync('notified-log.json', 'utf8')); } catch {}
const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
const room = Math.max(0, (config.maxPerDay || 4) - (log[day] || 0));
const worth = (j, a) => 0.55 * a.match + 0.45 * a.screenPct + (a.category.priority <= 2 ? 3 : 0);
const hits = readJobs('jobs.json')
  .filter(j => j.url && !prevUrls.has(j.url) && !notifiedSet.has(j.url))
  .map(j => ({ j, a: Engine.analyze(j, profile) }))
  .filter(x => x.a.match >= threshold && x.a.verdict.level === 'yes')
  .sort((x, y) => worth(y.j, y.a) - worth(x.j, x.a))
  .slice(0, room);

console.log(`משרות חדשות עם התאמה של ${threshold}% ומעלה: ${hits.length}`);
if (!hits.length) process.exit(0);

webpush.setVapidDetails('mailto:job-collector@users.noreply.github.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

const messages = hits.map(({ j, a }) => ({
  title: `🎯 ${a.match}% התאמה: ${j.title}`,
  body: [j.company, j.location || a.city].filter(Boolean).join(' · '),
  url: j.url,
}));

for (const device of config.devices) {
  for (const m of messages) {
    try {
      await webpush.sendNotification(device, JSON.stringify(m), { TTL: 6 * 3600, urgency: 'high' });
    } catch (e) {
      console.log(`  ! שליחה נכשלה (${e.statusCode || e.message})${e.statusCode === 410 ? ': המכשיר בוטל, צריך להירשם מחדש' : ''}`);
      break;
    }
  }
}

log[day] = (log[day] || 0) + hits.length;
fs.writeFileSync('notified-log.json', JSON.stringify(Object.fromEntries(Object.entries(log).slice(-30))));
fs.writeFileSync('notified.json', JSON.stringify([...notified, ...hits.map(x => x.j.url)].slice(-3000)));
console.log('נשלחו התראות');
