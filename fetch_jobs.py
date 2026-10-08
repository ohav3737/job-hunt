"""אוסף משרות בישראל מלוחות המשרות הציבוריים של חברות (Greenhouse, Lever, Ashby, Workable, SmartRecruiters)
ושומר אותן ב-jobs.json, שהאפליקציה טוענת.

הרצה:  python3 fetch_jobs.py
"""
import concurrent.futures as cf
import html
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

# (מערכת, מזהה החברה במערכת, שם לתצוגה)
COMPANIES = [
    ('greenhouse', 'payoneer', 'Payoneer'),
    ('greenhouse', 'riskified', 'Riskified'),
    ('greenhouse', 'similarweb', 'Similarweb'),
    ('greenhouse', 'taboola', 'Taboola'),
    ('greenhouse', 'nice', 'NICE'),
    ('greenhouse', 'appsflyer', 'AppsFlyer'),
    ('greenhouse', 'melio', 'Melio'),
    ('greenhouse', 'yotpo', 'Yotpo'),
    ('greenhouse', 'via', 'Via'),
    ('greenhouse', 'wizinc', 'Wiz'),
    ('greenhouse', 'catonetworks', 'Cato Networks'),
    ('greenhouse', 'transmitsecurity', 'Transmit Security'),
    ('greenhouse', 'forter', 'Forter'),
    ('greenhouse', 'jfrog', 'JFrog'),
    ('greenhouse', 'nanit', 'Nanit'),
    ('greenhouse', 'optimove', 'Optimove'),
    ('greenhouse', 'axonius', 'Axonius'),
    ('greenhouse', 'orcasecurity', 'Orca Security'),
    ('greenhouse', 'island', 'Island'),
    ('greenhouse', 'torq', 'Torq'),
    ('greenhouse', 'playtikaltd', 'Playtika'),
    ('greenhouse', 'obligo', 'Obligo'),
    ('greenhouse', 'datarails', 'Datarails'),
    ('greenhouse', 'augury', 'Augury'),
    ('greenhouse', 'bigid', 'BigID'),
    ('greenhouse', 'connecteam', 'Connecteam'),
    ('greenhouse', 'gongio', 'Gong'),
    ('greenhouse', 'pagayais', 'Pagaya'),
    ('greenhouse', 'apiiro', 'Apiiro'),
    ('greenhouse', 'cymulate', 'Cymulate'),
    ('greenhouse', 'saltsecurity', 'Salt Security'),
    ('greenhouse', 'sweetsecurity', 'Sweet Security'),
    ('greenhouse', 'lightrun', 'Lightrun'),
    ('greenhouse', 'tomorrow', 'Tomorrow.io'),
    ('greenhouse', 'tavily', 'Tavily'),
    ('ashby', 'finout', 'Finout'),
    ('ashby', 'snappy', 'Snappy'),
    ('lever', 'cloudinary', 'Cloudinary'),
    # Comeet: המערכת שרוב הסטארטאפים בתל אביב מגייסים דרכה (מזהה = slug/uid)
    ('comeet', 'rapyd/73.00E', 'Rapyd'),
    ('comeet', 'coralogix/06.004', 'Coralogix'),
    ('comeet', 'team8/61.003', 'Team8'),
    ('comeet', 'kaltura/E2.00D', 'Kaltura'),
    ('comeet', 'upwind/49.004', 'Upwind'),
    ('comeet', 'kelatechnologies/2A.007', 'Kela'),
    ('comeet', 'exodigo/89.005', 'Exodigo'),
    ('comeet', 'deloitte/F7.00B', 'Deloitte'),
    ('comeet', 'naturalint/71.001', 'Natural Intelligence'),
    ('comeet', 'checkmarx/C0.008', 'Checkmarx'),
    ('comeet', 'justt/36.001', 'Justt'),
    ('comeet', 'superplay/28.003', 'SuperPlay'),
    ('comeet', 'wsc-sports/93.007', 'WSC Sports'),
    ('comeet', 'etoro/41.009', 'eToro'),
    ('comeet', 'port/59.004', 'Port'),
    ('comeet', 'zenity/19.000', 'Zenity'),
    ('comeet', 'cyera/17.008', 'Cyera'),
    ('comeet', 'minute/45.00A', 'Minute Media'),
    ('comeet', 'explorium/B4.00E', 'Explorium'),
    ('comeet', 'bizzabo/A5.000', 'Bizzabo'),
    ('comeet', 'riverside-fm/66.009', 'Riverside'),
    ('comeet', 'legitsecurity.com/37.004', 'Legit Security'),
    ('lever', 'walkme', 'WalkMe'),
    ('ashby', 'honeybook', 'HoneyBook'),
    ('ashby', 'moonactive', 'Moon Active'),
    ('ashby', 'viz.ai', 'Viz.ai'),
    ('ashby', 'unit', 'Unit'),
    ('workable', 'nuvei', 'Nuvei'),
    ('smartrecruiters', 'armis', 'Armis'),
]

ISRAEL = re.compile(
    r'israel|tel[ -]?aviv|herzliya|herzlia|ramat[ -]gan|petah|petach|haifa|jerusalem|ra.?anana|netanya|rehovot|'
    r'hod hasharon|yokneam|ness? ziona|or yehuda|bnei brak|kfar saba|rosh ha|holon|givatayim|airport city|modi.?in|'
    r'caesarea|beer sheva|rishon|\bTLV\b|\bIL\b|ישראל|תל אביב', re.I)

# משרות טכניות או בכירות שלא רלוונטיות לבוגרת תעשייה וניהול
EXCLUDE = re.compile(
    r'\b(senior|sr\.?|lead|leader|head|director|vp|vice president|principal|staff|chief|architect|'
    r'developer|devops|sre|firmware|hardware|embedded|qa|automation engineer|security researcher|'
    r'counsel|attorney|lawyer|nurse|physician|machine learning engineer|ml engineer)\b'
    r'|software engineer|backend|back-end|frontend|front-end|full[ -]?stack|data engineer|'
    r'security engineer|research engineer|team lead|group manager|r&d|'
    r'\bresearch(er)?\b|scientist|designer|animator|\bartist\b|technical writer|incident responder|'
    # מהנדס/ת: רק תעשייה, תהליכים, ייצור, איכות ותפעול נשארים
    r'(?<!industrial )(?<!process )(?<!production )(?<!manufacturing )(?<!quality )(?<!operations )\bengineer\b', re.I)


class _Text(HTMLParser):
    BLOCK = {'p', 'div', 'li', 'br', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'tr'}

    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in self.BLOCK:
            self.parts.append('\n')
        if tag == 'li':
            self.parts.append('- ')

    def handle_data(self, data):
        self.parts.append(data)


def to_text(raw):
    if not raw:
        return ''
    p = _Text()
    p.feed(html.unescape(raw))
    text = ''.join(p.parts)
    text = re.sub(r'[ \t\xa0]+', ' ', text)
    text = re.sub(r'\n\s*\n+', '\n', text)
    return text.strip()[:8000]


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (personal job search)'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)
    except Exception as e:
        print(f'  ! {url}: {e}')
        return None


def job(company, title, location, url, desc, posted=''):
    return {'title': title.strip(), 'company': company, 'location': (location or '').strip(), 'url': url,
            'description': to_text(desc), 'postedAt': (posted or '')[:10], 'source': 'אתר החברה'}


def greenhouse(slug, name):
    d = get(f'https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true') or {}
    return [job(name, j['title'], (j.get('location') or {}).get('name'), j['absolute_url'], j.get('content'), j.get('updated_at'))
            for j in d.get('jobs', [])]


def lever(slug, name):
    d = get(f'https://api.lever.co/v0/postings/{slug}?mode=json') or []
    out = []
    for j in d:
        lists = ''.join(f"<h3>{l.get('text', '')}</h3><ul>{l.get('content', '')}</ul>" for l in j.get('lists', []))
        posted = date.fromtimestamp(j['createdAt'] / 1000).isoformat() if j.get('createdAt') else ''
        out.append(job(name, j['text'], (j.get('categories') or {}).get('location'), j['hostedUrl'],
                       (j.get('description') or '') + lists + (j.get('additional') or ''), posted))
    return out


def ashby(slug, name):
    d = get(f'https://api.ashbyhq.com/posting-api/job-board/{slug}') or {}
    out = []
    for j in d.get('jobs', []):
        locs = [j.get('location') or ''] + [l.get('location', '') for l in j.get('secondaryLocations', [])]
        out.append(job(name, j['title'], ', '.join(l for l in locs if l), j.get('jobUrl'), j.get('descriptionHtml'), j.get('publishedAt')))
    return out


def workable(slug, name):
    d = get(f'https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true') or {}
    out = []
    for j in d.get('jobs', []):
        loc = ', '.join(filter(None, [j.get('city'), j.get('country')]))
        out.append(job(name, j['title'], loc, j.get('url') or j.get('shortlink'),
                       (j.get('description') or '') + (j.get('requirements') or ''), j.get('published_on')))
    return out


def smartrecruiters(slug, name):
    d = get(f'https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=100') or {}
    out = []
    for j in d.get('content', []):
        loc = j.get('location') or {}
        location = ', '.join(filter(None, [loc.get('city'), loc.get('country')]))
        if not ISRAEL.search(location):
            continue
        detail = get(f"https://api.smartrecruiters.com/v1/companies/{slug}/postings/{j['id']}") or {}
        sections = (detail.get('jobAd') or {}).get('sections') or {}
        desc = ''.join((sections.get(k) or {}).get('text', '') for k in ('jobDescription', 'qualifications', 'additionalInformation'))
        url = detail.get('postingUrl') or f"https://jobs.smartrecruiters.com/{slug}/{j['id']}"
        out.append(job(name, j['name'], location, url, desc, j.get('releasedDate')))
    return out


# ---------- AllJobs ----------
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

# חיפושים לפי תפקיד (מקבלים 2 עמודים) ולפי חברה (עמוד אחד)
ALLJOBS_ROLES = [
    'הנדסת תעשייה וניהול', 'מהנדס תעשייה וניהול', 'בוגר תעשייה וניהול', 'ללא ניסיון תואר',
    'מנהל פרויקטים', 'רכז פרויקטים', 'PMO', 'מנהל מוצר', 'Product Manager',
    'אנליסט', 'אנליסט BI', 'Power BI', 'אנליסט נתונים', 'Data Analyst', 'אנליסט עסקי', 'Business Analyst',
    'אנליסט שיווק', 'תכנון ובקרה', 'מהנדס תהליכים', 'שרשרת אספקה', 'תפעול', 'מתכנן ייצור', 'ייעול תהליכים', 'Junior', 'סטארטאפ', 'Operations', 'Product Operations', 'Customer Success',
]
ALLJOBS_COMPANIES = [
    # ביטחון ותעשייה
    'אלביט', 'תעשייה אווירית', 'אלתא', 'רפאל', 'תומר',
    # בנקים וכרטיסי אשראי
    'בנק לאומי', 'בנק הפועלים', 'בנק דיסקונט', 'מזרחי טפחות', 'הבינלאומי', 'ישראכרט', 'מקס',
    # ביטוח והשקעות
    'הראל', 'מגדל', 'כלל ביטוח', 'הפניקס', 'מנורה מבטחים', 'איילון', 'אלטשולר שחם', 'מור השקעות',
    # אנרגיה ותשתיות
    'חברת החשמל', 'דלק', 'פז', 'בזן', 'אנלייט', 'אורמת', 'אלקטרה', 'שיכון ובינוי', 'נתיבי ישראל',
    # מזון, קמעונאות וביגוד
    'שטראוס', 'תנובה', 'אסם', 'שופרסל', 'קסטרו', 'פוקס', 'דלתא גליל', 'גולף', 'טרמינל X', 'סופר-פארם',
    # הייטק ותעשייה גדולה
    # חברות השמה (רוב המשרות שלהן מתפרסמות דרך לוחות הדרושים)
    'נישה', 'דיאלוג', 'GotFriends', 'SQLink', 'אתוסיה', 'לוגון', 'מנפאואר', 'אדם מילוא', 'פרסונל',
    # חברות ייעוץ
    'דלויט', 'PwC', 'EY', 'KPMG', 'BDO', 'אקסנצ\'ר', 'ייעוץ ארגוני', 'יועץ ג\'וניור', 'ייעוץ אסטרטגי',
    'טבע', 'אינטל', 'אמדוקס', 'צ\'ק פוינט', 'סייברארק', 'מונדיי', 'וויקס', 'פייבר', 'נייס', 'אפלייד מטיריאלס', 'אל על',
]

# משרות שלא מתאימות: בכירות, טכניות, שירות ומכירות טלפוניות, עבודות שטח
ALLJOBS_EXCLUDE = re.compile(
    r'בכיר|ראש צוות|ראש תחום|ראש מחלקה|סמנכ|מנהל.?ת? אגף|דירקטור|\bVP\b|senior|team lead|'
    r'נהג|מלגז|מחסנא|עובד.? ייצור|עובדי ייצור|טכנאי|חשמלאי|מתכנת|מפתח|developer|אחות|אחיות|רופא|מורה|סייע|'
    r'שומר|מאבטח|ניקיון|טבח|מלצר|קופאי|מוקדנ|נציג|טלר|בנקאי|סוכנ|יועצ.? משכנתא|מתכנן.? פנסיוני|'
    r'סטודנט|משמרות|חלקית|מנהל.?ת? סניף|מנהל.?ת? חנות|מוכר|ספק|גיוס|גבי[יה]|חתמ|טלמרקט|שירות לקוחות|חמשל|קבלן|מפקח|בטיחות|מטפל|אח.?/.?ות|אחות|מכינ|מלקט|משרת ערב|יועצ.{0,3} מכיר|קוסמטיק|מתקין|שליח', re.I)


class AllJobsBlocked(Exception):
    pass


def alljobs_page(query, page):
    url = 'https://www.alljobs.co.il/SearchResultsGuest.aspx?' + urllib.parse.urlencode(
        {'page': page, 'position': '', 'type': '', 'freetxt': query, 'city': '', 'region': ''})
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9'})
    with urllib.request.urlopen(req, timeout=25) as r:
        s = r.read().decode('utf-8', 'ignore')
    if 'job-content-top' not in s and 'captcha' in s.lower():
        raise AllJobsBlocked()
    jobs = []
    for b in s.split('class="job-content-top"')[1:]:
        jid = re.search(r'UploadSingle\.aspx\?JobID=(\d+)', b)
        title = re.search(r'<h2[^>]*>(.*?)</h2>', b, re.S)
        if not jid or not title:
            continue
        title = html.unescape(re.sub('<[^>]+>', '', title.group(1))).strip()
        title = re.sub(r'^.{0,40}מגייס(?:ת|ים)?\s*:\s*', '', title)  # "תעשייה אווירית מגייסת: ..."
        comp = re.search(r'Employer/HP/Default\.aspx\?cid=\d+">([^<]+)</a>', b)
        company = html.unescape(comp.group(1)).strip() if comp else 'חברה חסויה'
        loc_block = re.search(r'job-content-top-location">(.*?)job-content-top-type', b, re.S)
        loc_html = loc_block.group(1) if loc_block else ''
        cities = [html.unescape(c).strip() for c in re.findall(r'city=\d+[^"]*"[^>]*>([^<]+)</a>', loc_html)]
        if not cities:
            m = re.search(r'</b>\s*([^<]+)', loc_html)
            cities = [html.unescape(m.group(1)).strip()] if m else []
        jtype = re.search(r'job-content-top-type"><b>[^<]*</b>([^<]*)', b)
        jtype = jtype.group(1).strip() if jtype else ''
        desc = re.search(r'job-content-top-desc[^>]*>(.*?)<div class="job-content-top-(?:links|social|buttons)', b, re.S) \
            or re.search(r'job-content-top-desc[^>]*>(.*)', b, re.S)
        days = re.search(r'job-content-top-date">\s*(\d+)\s*(ימים|שעות|דקות)', b)
        posted = date.today().isoformat()
        if days and days.group(2) == 'ימים':
            posted = (date.today() - timedelta(days=int(days.group(1)))).isoformat()
        jobs.append({'title': title, 'company': company, 'location': ', '.join(cities[:8]),
                     'url': f'https://www.alljobs.co.il/Search/UploadSingle.aspx?JobID={jid.group(1)}',
                     'description': to_text((desc.group(1) if desc else '')[:20000]),
                     'postedAt': posted, 'jobType': jtype, 'source': 'AllJobs'})
    return jobs


def fetch_alljobs():
    out = []
    searches = [(q, 2) for q in ALLJOBS_ROLES] + [(q, 1) for q in ALLJOBS_COMPANIES]
    for q, pages in searches:
        for page in range(1, pages + 1):
            try:
                found = alljobs_page(q, page)
            except AllJobsBlocked:
                print('  ! AllJobs ביקש אימות, עוצר את האיסוף ממנו')
                return out
            except Exception as e:
                print(f'  ! AllJobs "{q}": {e}')
                break
            out += found
            time.sleep(1.2)  # לא להעמיס על האתר
            if len(found) < 15:
                break
    kept = [j for j in out if not ALLJOBS_EXCLUDE.search(j['title']) and not ALLJOBS_EXCLUDE.search(j['jobType'] or '')]
    print(f'AllJobs: {len(kept)} רלוונטיות מתוך {len(out)}')
    return kept


# ---------- דרושים (Drushim) ----------
def _txt(x):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', x))).strip()


def _get_html(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'he-IL,he;q=0.9'})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode('utf-8', 'ignore')


def drushim_page(query, page):
    s = _get_html(f'https://www.drushim.co.il/jobs/search/{urllib.parse.quote(query)}/?page={page}')
    jobs = []
    for c in re.split(r'class="job-card-module-scss-module__\w+__card', s)[1:]:
        title = re.search(r'data-nagish="job-card-title"[^>]*>(.*?)</h3>', c, re.S)
        link = re.search(r'href="(/job/\d+/\w+/)"', c)
        if not title or not link:
            continue
        comp = re.search(r'__companyName"[^>]*>(.*?)</', c, re.S)
        company = _txt(comp.group(1)) if comp else ''
        if not company or 'חסוי' in company:
            company = 'חברה חסויה'
        meta = re.search(r'job-card-meta-module-scss-module__\w+__box"[^>]*>(.*?)</div>\s*<(?:p|div) class="job-card-module', c, re.S)
        meta = _txt(meta.group(1)) if meta else ''
        desc = re.search(r'__description"[^>]*>(.*?)</(?:p|div)>', c, re.S)
        exp = re.search(r'(\d+)\s*[-+]\s*(\d+)?\s*שנים|ללא נ[י]?סיון', meta)
        cities = re.split(r'\s*(?:\d+-\d+ שנים|\d+\+ שנים|ללא נ[י]?סיון|משרה|לפני|היום)', meta.replace('מספר מקומות', ''))[0]
        jobs.append({'title': _txt(title.group(1)), 'company': company, 'location': cities.strip(),
                     'url': 'https://www.drushim.co.il' + link.group(1),
                     'description': _txt(desc.group(1)) if desc else '', 'meta': meta,
                     'minYears': int(exp.group(1)) if exp and exp.group(1) else 0,
                     'postedAt': date.today().isoformat(), 'source': 'דרושים'})
    return jobs


def drushim_details(j):
    """מוסיף לתיאור את הטקסט המלא מדף המשרה."""
    try:
        s = _get_html(j['url'])
        parts = re.findall(r'job-content-section-module-scss-module__\w+__box"[^>]*>(.*?)</section>', s, re.S)
        full = '\n'.join(to_text(p) for p in parts)
        if len(full) > len(j['description']):
            j['description'] = full[:8000]
    except Exception:
        pass
    time.sleep(0.8)


def fetch_drushim(skip_keys):
    out = []
    searches = [(q, 2) for q in ALLJOBS_ROLES] + [(q, 1) for q in ALLJOBS_COMPANIES]
    for q, pages in searches:
        for page in range(1, pages + 1):
            try:
                found = drushim_page(q, page)
            except Exception as e:
                print(f'  ! דרושים "{q}": {e}')
                break
            out += found
            time.sleep(1.2)
            if len(found) < 15:
                break
    kept, seen = [], set(skip_keys)
    for j in out:
        key = (re.sub(r'\W+', '', j['title']).lower(), j['company'])
        if key in seen or j['url'] in seen or ALLJOBS_EXCLUDE.search(j['title']) or ALLJOBS_EXCLUDE.search(j['meta']):
            continue
        if j['minYears'] >= 3:  # מחפשות ג׳וניור
            continue
        seen |= {key, j['url']}
        kept.append(j)
    kept = [j for j in kept if FIELDS.search(j['title']) or DEGREE.search(j['description'])]
    for j in kept:
        drushim_details(j)
        # שומרים את רמת הניסיון מהכרטיס בתוך התיאור, כדי שהמנוע יזהה אותה
        if 'ללא' in j['meta']:
            j['description'] = 'ללא ניסיון\n' + j['description']
        elif j['minYears']:
            j['description'] = f"{j['minYears']} שנות ניסיון\n" + j['description']
        j.pop('meta'); j.pop('minYears')
    print(f'דרושים: {len(kept)} רלוונטיות מתוך {len(out)}')
    return kept


# ---------- JobMaster ----------
def jobmaster_page(query, page):
    # בלי התחברות JobMaster מציג רק את עמוד התוצאות הראשון
    s = _get_html('https://www.jobmaster.co.il/jobs/?q=' + urllib.parse.quote(query))
    jobs = []
    for c in s.split('class="CardStyle JobItem')[1:]:
        key = re.search(r"checknum\.asp\?key=(\d+)", c)
        title = re.search(r'class="CardHeader View_Job_Details"[^>]*>(.*?)</a>', c, re.S)
        if not key or not title:
            continue
        comp = re.search(r'CompanyNameLink"[^>]*>\s*<span>(.*?)</span>', c, re.S)
        loc = re.search(r'class="jobLocation">(.*?)</li>', c, re.S)
        jtype = re.search(r'class="jobType">(.*?)</li>', c, re.S)
        desc = re.search(r'jobShortDescription[^>]*>(.*?)</div>', c, re.S)
        jobs.append({'title': _txt(title.group(1)), 'company': _txt(comp.group(1)) if comp else 'חברה חסויה',
                     'location': _txt(loc.group(1)) if loc else '', 'jobType': _txt(jtype.group(1)) if jtype else '',
                     'url': f'https://www.jobmaster.co.il/jobs/checknum.asp?key={key.group(1)}',
                     'description': _txt(desc.group(1)) if desc else '', 'postedAt': date.today().isoformat(), 'source': 'JobMaster'})
    return jobs


def jobmaster_details(j):
    try:
        s = _get_html(j['url'])
        parts = re.findall(r'id="job(?:Description|Requirements)Content"[^>]*>(.*?)</div>', s, re.S)
        full = '\n'.join(to_text(p) for p in parts)
        if len(full) > len(j['description']):
            j['description'] = full
    except Exception:
        pass
    time.sleep(0.8)


def fetch_jobmaster(skip_keys):
    out = []
    searches = [(q, 1) for q in ALLJOBS_ROLES + ALLJOBS_COMPANIES]
    for q, pages in searches:
        for page in range(1, pages + 1):
            try:
                found = jobmaster_page(q, page)
            except Exception as e:
                print(f'  ! JobMaster "{q}": {e}')
                break
            out += found
            time.sleep(1.2)
            if len(found) < 8:
                break
    kept, seen = [], set(skip_keys)
    for j in out:
        key = (re.sub(r'\W+', '', j['title']).lower(), j['company'])
        if key in seen or ALLJOBS_EXCLUDE.search(j['title']) or ALLJOBS_EXCLUDE.search(j['jobType']):
            continue
        seen.add(key)
        kept.append(j)
    kept = [j for j in kept if FIELDS.search(j['title']) or DEGREE.search(j['description'])]
    for j in kept:
        jobmaster_details(j)
    print(f'JobMaster: {len(kept)} רלוונטיות מתוך {len(out)}')
    return kept


# ---------- Jobify360 (מרכז גם משרות מלינקדאין ומאתרי חברות) ----------
JOBIFY_SLUGS = ['data-analyst', 'bi-analyst', 'business-analyst', 'product-analyst', 'marketing-analyst',
                'product-manager', 'project-manager', 'project-coordinator', 'industrial-engineer',
                'operations-analyst', 'process-engineer', 'supply-chain', 'planner', 'junior']
JOBIFY_SOURCE = {'in': 'לינקדאין (דרך Jobify)', 'jk': 'Jobify', 'emp': 'אתר החברה (דרך Jobify)'}


def jobify_job(url):
    s = _get_html(url)
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try:
            d = json.loads(m.group(1))
        except ValueError:
            continue
        if not isinstance(d, dict) or d.get('@type') != 'JobPosting':
            continue
        loc = ((d.get('jobLocation') or {}).get('address') or {}).get('addressLocality') or ''
        return {'title': html.unescape(d.get('title', '')).strip(),
                'company': ((d.get('hiringOrganization') or {}).get('name') or 'חברה חסויה').strip(),
                'location': loc, 'url': url, 'description': to_text(d.get('description', '')),
                'postedAt': (d.get('datePosted') or '')[:10], 'jobType': d.get('employmentType') or '',
                'source': JOBIFY_SOURCE.get(url.rsplit('-', 1)[-1], 'Jobify')}
    return None


def fetch_jobify(skip_keys):
    links = set()
    for slug in JOBIFY_SLUGS:
        for page in (1, 2, 3):
            try:
                s = _get_html(f'https://jobify360.co.il/jobs/{slug}?page={page}')
            except Exception as e:
                print(f'  ! Jobify {slug}: {e}')
                break
            # משרות מ-AllJobs ומדרושים כבר נאספות ישירות
            links |= {u for u in re.findall(r'https://jobify360\.co\.il/jobs/[0-9_]+-(?:in|jk|emp)\b', s)}
            time.sleep(1)
    kept, seen = [], set(skip_keys)
    for url in sorted(links):
        try:
            j = jobify_job(url)
        except Exception:
            j = None
        time.sleep(0.8)
        if not j or not j['title']:
            continue
        key = (re.sub(r'\W+', '', j['title']).lower(), j['company'])
        if key in seen or ALLJOBS_EXCLUDE.search(j['title']) or EXCLUDE.search(j['title']) or j['jobType'] in ('PART_TIME', 'INTERN'):
            continue
        seen.add(key)
        kept.append(j)
    print(f'Jobify: {len(kept)} רלוונטיות מתוך {len(links)}')
    return kept


def comeet(slug, name):
    s = _get_html(f'https://www.comeet.com/jobs/{slug}')
    m = re.search(r'COMPANY_POSITIONS_DATA\s*=\s*(\[.*?\]);\s*\n', s, re.S) or re.search(r'COMPANY_POSITIONS_DATA\s*=\s*(\[.*?\]);', s, re.S)
    out = []
    for j in json.loads(m.group(1)) if m else []:
        loc = j.get('location') or {}
        location = ', '.join(filter(None, [loc.get('city'), loc.get('name'), 'Israel' if loc.get('country') == 'IL' else loc.get('country')]))
        details = ((j.get('custom_fields') or {}).get('details') or [])
        desc = ''.join(f"<h3>{d.get('name', '')}</h3>{d.get('value') or ''}" for d in details)
        url = j.get('url_active_page') or j.get('url_comeet_hosted_page')
        out.append(job(name, j.get('name', ''), location, url, desc, j.get('time_updated')))
    return out


PROVIDERS = {'comeet': comeet, 'greenhouse': greenhouse, 'lever': lever, 'ashby': ashby, 'workable': workable, 'smartrecruiters': smartrecruiters}


def fetch_company(entry):
    provider, slug, name = entry
    try:
        jobs = PROVIDERS[provider](slug, name)
    except Exception as e:
        print(f'  ! {name}: {e}')
        return []
    kept = [j for j in jobs if j['url'] and ISRAEL.search(j['location']) and not EXCLUDE.search(j['title'])]
    print(f'{name}: {len(kept)} רלוונטיות מתוך {len(jobs)}')
    return kept


CENTER = re.compile(
    r'תל[ -]?אביב|ת"א|יפו|רמת[ -]גן|גבעתיים|בני[ -]ברק|הרצליה|פתח[ -]תקו|חולון|בת[ -]ים|אור[ -]יהודה|קרי?ית[ -]אונו|'
    r'ראשון|ראש[ -]העין|יהוד|רעננה|כפר[ -]סבא|הוד[ -]השרון|נס[ -]ציונה|רחובות|לוד|שוהם|מודיעין|נתניה|רמת[ -]השרון|'
    r'גבעת[ -]שמואל|אזור|יבנה|באר[ -]יעקב|רמלה|כפר[ -]קאסם|אלעד|גני[ -]תקווה|סביון|איירפורט|מרכז|השרון|גוש[ -]דן|'
    r'tel[ -]?aviv|ramat[ -]gan|givatayim|bnei[ -]brak|herzli|petah|petach|holon|bat[ -]yam|or[ -]yehuda|kiryat[ -]ono|'
    r'rishon|rosh[ -]ha|yehud|ra.?anana|kfar[ -]saba|hod[ -]hasharon|ness?[ -]ziona|rehovot|\blod\b|airport city|shoham|'
    r'modi.?in|netanya|ramat[ -]hasharon|central|center|gush dan|remote|hybrid|מהבית', re.I)
FAR = re.compile(r'חיפה|ירושלים|באר[ -]שבע|כרמיאל|קרי?ית[ -](?:אתא|ים|ביאליק|חיים|מוצקין|שמונה|גת)|יקנעם|נצרת|עפולה|טבריה|אשדוד|אשקלון|'
                 r'דימונה|אילת|נתיבות|שדרות|צפת|עכו|נהריה|מגדל[ -]העמק|קיסריה|חדרה|זכרון|עמק|גליל|נגב|צפון|דרום|'
                 r'haifa|jerusalem|beer[ -]sheva|yokneam|caesarea|nazareth|ashdod|karmiel', re.I)


def in_center(location):
    if not location or CENTER.search(location):
        return True
    return not FAR.search(location)  # מיקום לא מזוהה ("ישראל", "מספר מקומות") נשאר


# ---------- התאמה אישית: תחומים ורמת ניסיון ----------
# תפקידים בתחומים שלך: ניהול פרויקטים, מוצר, אנליזה, תפעול/תעשייה, ייעוץ
FIELDS = re.compile(
    r'project|program|pmo|coordinator|implementation|product|analyst|analytics|\bbi\b|business intelligence|\bdata\b|insights|'
    r'operations|\bops\b|supply chain|logistics|procurement|planning|planner|process|efficiency|industrial|quality|'
    r'consult|strategy|pricing|revenue|fp&a|business partner|customer success|onboarding|junior|graduate|associate|'
    r'פרויקט|פרוייקט|רכז.{0,4}(?:תפעול|לוגיסט|רכש|תכנון|מערכות|נתונים|בקרה|תהליכ|הטמע|מוצר)|מתאמ.{0,4}(?:פרויקט|תפעול|לוגיסט|שינויי|הטמע)|הטמע|ניהול מוצר|מנהל.{0,3} מוצר|אנליסט|אנליז|נתונים|דאטה|תפעול|תפ"י|שרשרת|לוגיסט|רכש|תכנון|מתכנ|בקר|'
    r'תהליכ|ייעול|התייעלות|תעשי|מהנדס.{0,3} איכות|הבטחת איכות|ייעוץ (?:עסקי|ארגוני|ניהולי|אסטרטגי)|יועצ.{0,3} (?:ארגוני|עסקי|כלכלי|ניהולי|אסטרטג|תפעול)|אסטרטג|תמחיר|כלכלנ|מטה|ג\'וניור|ג׳וניור|בוגר', re.I)
DEGREE = re.compile(r'הנדסת תעשי|תעשייה וניהול|תעשיה וניהול|industrial engineering|industrial & management', re.I)
YEARS = re.compile(r'(\d+)\s*\+?\s*(?:-\s*\d+\s*)?(?:years|yrs|שנות ניסיון|שנים לפחות|שנות עבודה)|ניסיון\s*(?:של\s*)?(?:לפחות\s*)?(?:מוכח\s*)?(?:של\s*)?(\d+)\s*\+?\s*שנ', re.I)


def min_years(text):
    m = YEARS.search(text or '')
    if not m:
        return 0
    n = int(m.group(1) or m.group(2))
    return n if n <= 15 else 0


def fits_me(j):
    if EXCLUDE.search(j['title']) or ALLJOBS_EXCLUDE.search(j['title']):
        return False
    text = j['title'] + '\n' + j['description']
    if not (FIELDS.search(j['title']) or DEGREE.search(text)):
        return False
    return min_years(j['description']) < 3  # ג׳וניור / עד שנתיים ניסיון


def main():
    with cf.ThreadPoolExecutor(12) as ex:
        jobs = [j for batch in ex.map(fetch_company, COMPANIES) for j in batch]
    # כל אתר נסרק ברצף (בנימוס), אבל האתרים השונים נסרקים במקביל
    keys = {(re.sub(r'\W+', '', j['title']).lower(), j['company']) for j in jobs}
    with cf.ThreadPoolExecutor(4) as ex:
        futures = [ex.submit(fetch_alljobs), ex.submit(fetch_drushim, keys), ex.submit(fetch_jobmaster, keys), ex.submit(fetch_jobify, keys)]
        for fut in futures:
            try:
                jobs += fut.result()
            except Exception as e:
                print(f'  ! {e}')
    before = len(jobs)
    jobs = [j for j in jobs if fits_me(j)]
    print(f'הוסרו {before - len(jobs)} משרות מחוץ לתחומים שלך או עם 3+ שנות ניסיון')
    # מיקוד: תל אביב והמרכז. משרות שכל המיקומים שלהן רחוקים מהמרכז יורדות
    before = len(jobs)
    jobs = [j for j in jobs if in_center(j['location'])]
    print(f'הוסרו {before - len(jobs)} משרות מחוץ לאזור המרכז')
    # אותה משרה מתפרסמת לפעמים כמה פעמים: מסננים לפי קישור ולפי תפקיד+חברה
    seen, unique = set(), []
    for j in jobs:
        keys = {j['url'], (re.sub(r'\W+', '', j['title']).lower(), j['company'])}
        if not keys & seen:
            seen |= keys
            unique.append(j)
    out = Path(__file__).with_name('jobs.json')
    # אם מקור שלם לא החזיר כלום הפעם (חסימה זמנית, תקלה), משאירים את המשרות הקודמות שלו
    if out.exists():
        try:
            old = json.loads(out.read_text()).get('jobs', [])
        except ValueError:
            old = []
        now_sources = {j.get('source') for j in unique}
        kept_old = [j for j in old if j.get('source') not in now_sources]
        if kept_old:
            print(f'נשמרו {len(kept_old)} משרות קודמות ממקורות שלא הגיבו: {sorted({j.get("source") for j in kept_old})}')
            unique += kept_old
    out.write_text(json.dumps({'updated': datetime.now(timezone.utc).isoformat(timespec='minutes'), 'jobs': unique}, ensure_ascii=False, indent=1))
    print(f'\nנשמרו {len(unique)} משרות ב-{out.name}')


def refilter():
    """מפעיל מחדש את הסינון האישי על jobs.json הקיים, בלי לסרוק את האתרים."""
    out = Path(__file__).with_name('jobs.json')
    data = json.loads(out.read_text())
    before = len(data['jobs'])
    data['jobs'] = [j for j in data['jobs'] if fits_me(j) and in_center(j['location'])]
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f'נשארו {len(data["jobs"])} מתוך {before}')


if __name__ == '__main__':
    import sys
    refilter() if '--refilter' in sys.argv else main()
