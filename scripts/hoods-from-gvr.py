"""Neighbourhood prices from GVR's "HPI Benchmark Summary" Excel file (GVR portal > Market stats > HPI Benchmark Summary Excel).
Usage: python3 scripts/hoods-from-gvr.py <this-month.xlsx> [<january.xlsx>] [report.json]
  this-month.xlsx  the month you are publishing, e.g. 2026-10-GVR Benchmark Summary Report.xlsx
  january.xlsx     January of the same year (for "since January"); leave out in January
  report.json      adds the result to that file as "hoods" (the month's report data for /admin)
Shape: {"Coquitlam": {"*": <the whole city>, "Burke Mountain": {"d": [price, 1m, 3m, 6m, 1y, 3y, 5y, 10y, sinceJan], "t": [...], "c": [...]}, ...}, ...}
d = detached, t = townhouse, c = apartment/condo. Changes are percentages. null = not published."""
import json, sys, re
import pandas as pd

# GVR neighbourhood codes (from the Stats Centre area list): the first three letters say which city each one is in.
CITY = {'VBD': 'Bowen Island', 'VBE': 'Burnaby East', 'VBN': 'Burnaby North', 'VBS': 'Burnaby South', 'VCQ': 'Coquitlam', 'VLD': 'Ladner',
        'VMR': 'Maple Ridge', 'VNV': 'North Vancouver', 'VNW': 'New Westminster', 'VPI': 'Pitt Meadows', 'VPM': 'Port Moody', 'VPQ': 'Port Coquitlam',
        'VRI': 'Richmond', 'VSC': 'Sunshine Coast', 'VSQ': 'Squamish', 'VTW': 'Tsawwassen', 'VVE': 'Vancouver East', 'VVW': 'Vancouver West',
        'VWH': 'Whistler', 'VWV': 'West Vancouver'}
HOODS = json.load(open(__file__.replace('hoods-from-gvr.py', 'gvr-neighbourhoods.json')))
TYPES = {'Single Family Detached': 'd', 'Townhouse': 't', 'Apartment': 'c'}
SUFFIX = re.compile(r'\s(BE|BN|BS|CQ|MR|NV|NW|PI|PM|PQ|RI|SQ|VE|VW|WV)$')

def load(path):
    d = pd.read_excel(path, header=None)
    i = d.index[d[0].astype(str).str.strip() == 'Data Type'][0]
    d = d.iloc[i + 1:, :12].copy()
    d.columns = ['lvl', 'name', 'type', 'price', 'idx', 'm1', 'm3', 'm6', 'y1', 'y3', 'y5', 'y10']
    d = d[d.lvl.astype(str).str.strip().isin(['SubArea', 'Municip'])]
    d['name'] = d.name.astype(str).str.strip(); d['type'] = d.type.astype(str).str.strip()
    return {(('*' if str(r.lvl).strip() == 'Municip' else '') + r.name, r.type): r for r in d.itertuples()}

def num(v, nd=2):
    try:
        v = float(v)
        return None if v != v else round(v, nd)
    except (TypeError, ValueError):
        return None

def nice(n):
    m = SUFFIX.search(n)
    return SUFFIX.sub('', n) if m else n

now = load(sys.argv[1])
jan = load(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].endswith(('.xls', '.xlsx')) else None
out = {}
for code, city in CITY.items():
    for n in ['*' + city] + HOODS.get(code, []):
        row = {}
        for tname, t in TYPES.items():
            r = now.get((n, tname))
            p = num(r.price, 0) if r is not None else None
            if not p: continue
            j = jan.get((n, tname)) if jan else None
            sj = round((p / float(j.price) - 1) * 100, 1) if j is not None and num(j.price) else None
            row[t] = [int(p)] + [num(getattr(r, k)) for k in ['m1', 'm3', 'm6', 'y1', 'y3', 'y5', 'y10']] + [sj]
        if row: out.setdefault(city, {})['*' if n[0] == '*' else nice(n)] = row

out = {c: v for c, v in out.items() if len(v) > 1}
count = sum(len(v) - 1 for v in out.values())
if count < 150: sys.exit(f'Only found {count} neighbourhoods. Is this the HPI Benchmark Summary Excel file?')
args = [a for a in sys.argv[2:] if a.endswith('.json')]
if args:
    rep = json.load(open(args[0])); rep['hoods'] = out; json.dump(rep, open(args[0], 'w'))
    print(f'Added {count} neighbourhoods in {len(out)} cities to {args[0]}')
else:
    print(json.dumps(out, separators=(',', ':')))
