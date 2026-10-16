"""Builds data/price-long.js: the MLS® HPI benchmark price of every area, every month since January 2005,
for S2 "Benchmark price over time".

Usage: python3 scripts/price-history-from-gvr.py <folder of GVR HPI Benchmark Summary Excel files> [out.js]
Files are named like GVR-HPI-Benchmark-2016-09.xls(x) (the portal's own names work too: they start with "2016-09-").
Old .xls files need the xlrd package, or convert them first: soffice --headless --convert-to xlsx *.xls

How past prices are worked out:
- GVR re-benchmarked its prices in May 2022, so prices printed in older files don't match how GVR describes those
  months today. The chart follows today's figures, so its 1, 3, 5 and 10-year changes match GVR's own.
- From files since May 2022: each file's price, plus the months it implies from its 1/3/6-month and 1/3/5/10-year
  changes (newest file first). This reaches back to May 2012.
- Earlier months (and any month those files can't reach): older files, scaled to the newer figures using the nearest
  months both have. Area-only jumps before 2012 (GVR redrawing an area) are joined so they don't show as a price move.
Only rerun this when GVR re-benchmarks again. New months come from each month's report (history.price).
"""
import glob, json, os, re, statistics, sys
import pandas as pd

TYPES = {'Composite': 'composite'}
CUT = '2022-05'
FIRST = '2005-01'


def kadd(k, n):
    y, m = map(int, k.split('-')); m += n; y += (m - 1) // 12; m = (m - 1) % 12 + 1
    return f'{y}-{m:02d}'


def mi(k):
    return int(k[:4]) * 12 + int(k[5:]) - 1


def read(folder):
    files = {}
    for f in glob.glob(os.path.join(folder, '*.xls*')):
        m = re.search(r'(\d{4})-(\d{2})', os.path.basename(f))
        if m and (m.group(0) not in files or f.endswith('.xlsx')): files[m.group(0)] = f
    real, chg = {}, {}
    for k, f in sorted(files.items()):
        d = pd.read_excel(f, header=None)
        hi = d.index[d[0].astype(str).str.strip() == 'Data Type'][0]
        H = [str(x).replace('\n', ' ').strip() for x in d.iloc[hi]]; c = H.index
        cT, cV, cP, cB = c('Data Type'), c('Data Value'), c('Property Type'), c('Benchmark Value')
        lag = [(1, c('One Month')), (3, c('Three Months')), (6, c('Six Months')), (12, c('One Year')), (36, c('Three Years')), (60, c('Five Years')), (120, c('Ten Years'))]
        for _, r in d.iloc[hi + 1:].iterrows():
            if r[cT] not in ('Board', 'Area', 'Municip') or r[cP] not in TYPES: continue
            a = 'Greater Vancouver' if r[cT] == 'Board' else str(r[cV]).strip()
            try: p = float(r[cB])
            except (TypeError, ValueError): continue
            if p != p or p <= 0: continue
            real.setdefault(a, {})[k] = p
            for n, ci in lag:
                try: cc = float(r[ci])
                except (TypeError, ValueError): continue
                if cc == cc: chg.setdefault(a, {}).setdefault(k, {})[n] = cc
    return real, chg, max(files)


def view(R, C, lo, hi):
    # Every month reachable from files in [lo, hi]: the newest file wins, then the shortest gap.
    V = {}
    for F in sorted((k for k in R if lo <= k <= hi), reverse=True):
        V.setdefault(F, R[F])
        for n, c in sorted(C.get(F, {}).items()):
            V.setdefault(kadd(F, -n), R[F] / (1 + c / 100))
    return V


def build(folder):
    real, chg, END = read(folder)
    months, k = [], FIRST
    while k <= END: months.append(k); k = kadd(k, 1)
    out = {}
    for a, R in real.items():
        if END not in R: continue
        C = chg.get(a, {})
        N, O = view(R, C, CUT, '9999'), view(R, C, '0000', kadd(CUT, -1))
        both = sorted((x for x in N if x in O), key=mi); S = {}
        for k in months:
            if k in N: S[k] = N[k]; continue
            if k not in O: continue
            lo = [x for x in both if x < k]; hi = [x for x in both if x > k]
            if not lo and not hi: continue
            if not lo: r = statistics.median(N[x] / O[x] for x in hi[:12])
            elif not hi: r = N[lo[-1]] / O[lo[-1]]
            else:
                p, q = lo[-1], hi[0]; rp, rq = N[p] / O[p], N[q] / O[q]
                r = rp + (rq - rp) * (mi(k) - mi(p)) / (mi(q) - mi(p))
            S[k] = O[k] * r
        for i, k in enumerate(months):  # a single missing month: halfway between its neighbours
            if k not in S and 0 < i < len(months) - 1 and months[i - 1] in S and months[i + 1] in S: S[k] = (S[months[i - 1]] + S[months[i + 1]]) / 2
        out[a] = S
    GV = out['Greater Vancouver']
    for a, S in out.items():
        if a == 'Greater Vancouver': continue
        ks = sorted(S, key=mi)
        for i in range(len(ks) - 1, 0, -1):
            k0, k1 = ks[i - 1], ks[i]
            if k1 > '2012-05' or k0 not in GV or k1 not in GV: continue
            ja, jg = S[k1] / S[k0] - 1, GV[k1] / GV[k0] - 1
            if abs(ja - jg) > 0.05:
                f = (S[k1] / (1 + jg)) / S[k0]
                for kk in ks[:i]: S[kk] *= f
    # Stored in hundreds of dollars, one number per month from FIRST; null where a month is missing.
    res = {}
    for a, S in sorted(out.items()):
        res[a] = [round(S[k] / 100) if k in S else None for k in months]
        while res[a] and res[a][0] is None: res[a].pop(0)
    starts = {a: kadd(END, -(len(v) - 1)) for a, v in res.items()}
    # GVR's own 10-year change, to prove the line agrees with it
    for a in ('Greater Vancouver',):
        v = res[a]; ten = chg[a][END].get(120)
        mine = (v[-1] / v[-121] - 1) * 100
        print(f'{a}: 10-year change {mine:.2f}% (GVR says {ten}%)')
    return {'note': 'MLS® HPI benchmark price (composite), hundreds of dollars, one value per month ending at "end". Built by scripts/price-history-from-gvr.py from GVR HPI Benchmark Summary files; past months follow GVR\'s current (May 2022) benchmark.',
            'end': END, 'start': starts, 'p': res}


if __name__ == '__main__':
    data = build(sys.argv[1])
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'data', 'price-long.js')
    with open(out, 'w') as f:
        f.write('// Generated by scripts/price-history-from-gvr.py from GVR HPI Benchmark Summary files. Do not edit by hand.\n')
        f.write('export default ' + json.dumps(data, separators=(',', ':')) + ';\n')
    print('wrote', out, len(data['p']), 'areas, ending', data['end'])
