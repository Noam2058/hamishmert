#!/usr/bin/env python3
"""מוריד מ'לוחות חי' (chaitables.com) את זמני הנץ הנראה (בכורי יוסף) ושומר ב-data/netz-chai.json.
שימוש: python3 tools/chai.py [קובץ HTML מקומי...]  – בלי קבצים: מוריד לשנה הנוכחית ולבאה."""
import json, re, sys, urllib.parse, urllib.request, datetime, os, html as H

CFG = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'data', 'chai-config.json'), encoding='utf-8'))
COLS = {'Tishrey': 7, 'Chesvan': 8, 'Kislev': 9, 'Teves': 10, 'Shvat': 11, 'Adar': 12, 'Adar I': 12, 'Adar II': 13,
        'Nisan': 1, 'Iyar': 2, 'Sivan': 3, 'Tamuz': 4, 'Av': 5, 'Elul': 6}

def url(year):
    q = dict(cgi_TableType='BY', cgi_country='Israel', cgi_USAcities1='1', cgi_USAcities2='0', cgi_searchradius='', cgi_Placename='?',
             cgi_eroslatitude='0.0', cgi_eroslongitude='0.0', cgi_eroshgt='0.0', cgi_geotz='2', cgi_exactcoord='OFF', cgi_MetroArea=CFG['metro'],
             cgi_types='0', cgi_RoundSecond='5', cgi_AddCushion='0', cgi_24hr='ON', cgi_typezman='-1', cgi_yrheb=str(year), cgi_optionheb='1',
             cgi_UserNumber='5765', cgi_Language='Hebrew', cgi_AllowShaving='OFF', cgi_sefira='OFF', cgi_nusach='OFF', cgi_Moladim='OFF')
    return 'http://www.chaitables.com/cgi-bin/ChaiTables.cgi/?' + urllib.parse.urlencode(q)

def parse(src):
    m = re.search(r'for the Year (\d{4})', src)
    year = int(m.group(1))
    rows = re.findall(r'(?is)<tr[^>]*>(.*?)</tr>', src)
    head = None; out = {}
    for r in rows:
        cells = [H.unescape(re.sub(r'(?s)<[^>]+>', '', c)).strip() for c in re.findall(r'(?is)<td[^>]*>(.*?)</td>', r)]
        if head is None:
            if 'Tishrey' in cells: head = cells
            continue
        if not cells or not re.fullmatch(r'\d{1,2}', cells[0] or ''): continue
        day = int(cells[0])
        for i, name in enumerate(head):
            if name not in COLS or i >= len(cells): continue
            v = cells[i]
            if re.fullmatch(r'\d{1,2}:\d\d:\d\d', v):
                out.setdefault(str(COLS[name]), [None] * 30)[day - 1] = v
    assert sum(1 for v in out.values() for x in v if x) > 340, 'too few times parsed'
    return year, out

def main():
    path = os.path.join(os.path.dirname(__file__), '..', 'data', 'netz-chai.json')
    try: data = json.load(open(path, encoding='utf-8'))
    except Exception: data = {}
    if data.get('metro') != CFG['metro']: data = {}
    data['metro'] = CFG['metro']; data['label'] = CFG.get('label', CFG['metro']); data.setdefault('years', {})
    srcs = [open(f, encoding='utf-8', errors='replace').read() for f in sys.argv[1:]]
    if not srcs:
        t = datetime.date.today(); hy = t.year + 3760 + (1 if t.month >= 9 else 0)
        for y in (hy, hy + 1):
            req = urllib.request.Request(url(y), headers={'User-Agent': 'Mozilla/5.0'})
            srcs.append(urllib.request.urlopen(req, timeout=60).read().decode('utf-8', 'replace'))
    for s in srcs:
        y, tab = parse(s); data['years'][str(y)] = tab; print('parsed', y, sum(1 for v in tab.values() for x in v if x))
    keep = sorted(data['years'])[-3:]  # שומרים 3 שנים אחרונות
    data['years'] = {k: data['years'][k] for k in keep}
    json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

if __name__ == '__main__': main()
