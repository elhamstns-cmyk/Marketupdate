"""Long-term price growth (3, 5 and 10 years) from a GVR monthly Stats Package PDF.
Usage: python3 scripts/growth-from-gvr.py <stats-package.pdf> [report.json]
Prints the "growth" object. With report.json, adds it to that file (the month's report data for /admin).
Shape: {"composite": {"Coquitlam": [3y, 5y, 10y], ...}, "detached": {...}, "townhome": {...}, "condo": {...}}"""
import json, re, subprocess, sys
TYPE = {'Residential / Composite': 'composite', 'Single Family Detached': 'detached', 'Townhouse': 'townhome', 'Apartment': 'condo'}
P = r'(-?[\d.]+)%'
ROW = re.compile(r'^\s*(?:(Residential / Composite|Single Family Detached|Townhouse|Apartment)\s+)?([A-Z][A-Za-z .]+?)\s+\$([\d,]+)\s+([\d.]+)' + (r'\s+' + P) * 7 + r'\s*$')
txt = subprocess.run(['pdftotext', '-layout', sys.argv[1], '-'], capture_output=True, text=True).stdout
growth, typ = {}, None
for line in txt.splitlines():
    r = ROW.match(line)
    if not r: continue
    if r.group(1): typ = TYPE[r.group(1)]
    area = r.group(2).strip()
    if not typ or area == 'Lower Mainland': continue
    growth.setdefault(typ, {}).setdefault(area, [float(r.group(9)), float(r.group(10)), float(r.group(11))])
if len(growth) != 4 or len(growth['composite']) < 15: sys.exit('Could not find the MLS HPI table with 3, 5 and 10 year changes.')
if len(sys.argv) > 2:
    rep = json.load(open(sys.argv[2])); rep['growth'] = growth; json.dump(rep, open(sys.argv[2], 'w'))
    print(f'Added growth for {len(growth["composite"])} areas to {sys.argv[2]}')
else: print(json.dumps(growth))
