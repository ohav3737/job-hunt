"""אוסף משרות בישראל מלוחות המשרות הציבוריים של חברות (Greenhouse, Lever, Ashby, Workable, SmartRecruiters)
ושומר אותן ב-jobs.json, שהאפליקציה טוענת.

הרצה:  python3 fetch_jobs.py
"""
import concurrent.futures as cf
import html
import json
import re
import urllib.request
from datetime import date
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
            'description': to_text(desc), 'postedAt': (posted or '')[:10]}


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


PROVIDERS = {'greenhouse': greenhouse, 'lever': lever, 'ashby': ashby, 'workable': workable, 'smartrecruiters': smartrecruiters}


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


def main():
    with cf.ThreadPoolExecutor(12) as ex:
        jobs = [j for batch in ex.map(fetch_company, COMPANIES) for j in batch]
    seen, unique = set(), []
    for j in jobs:
        if j['url'] not in seen:
            seen.add(j['url'])
            unique.append(j)
    out = Path(__file__).with_name('jobs.json')
    out.write_text(json.dumps({'updated': date.today().isoformat(), 'jobs': unique}, ensure_ascii=False, indent=1))
    print(f'\nנשמרו {len(unique)} משרות ב-{out.name}')


if __name__ == '__main__':
    main()
