import os, sys, urllib.request, urllib.parse
from fontTools.ttLib import TTFont

D = os.path.join(os.environ['TEMP'], 'fontprobe')
os.makedirs(D, exist_ok=True)
BASE = 'https://raw.githubusercontent.com/google/fonts/main/'
CAND = {
    'PlayfairDisplay': 'ofl/playfairdisplay/PlayfairDisplay[wght].ttf',
    'EBGaramond': 'ofl/ebgaramond/EBGaramond[wght].ttf',
    'Cormorant': 'ofl/cormorant/Cormorant[wght].ttf',
    'CormorantGaramond': 'ofl/cormorantgaramond/CormorantGaramond[wght].ttf',
    'Spectral': 'ofl/spectral/Spectral-Regular.ttf',
    'Literata': 'ofl/literata/Literata[opsz,wght].ttf',
    'SourceSerif4': 'ofl/sourceserif4/SourceSerif4[opsz,wght].ttf',
    'Lora': 'ofl/lora/Lora[wght].ttf',
    'NotoSerif': 'ofl/notoserif/NotoSerif[wdth,wght].ttf',
    'PTSerif': 'ofl/ptserif/PT_Serif-Web-Regular.ttf',
    'Forum': 'ofl/forum/Forum-Regular.ttf',
    'Prata': 'ofl/prata/Prata-Regular.ttf',
    'Marcellus': 'ofl/marcellus/Marcellus-Regular.ttf',
    'Manrope': 'ofl/manrope/Manrope[wght].ttf',
    'Inter': 'ofl/inter/Inter[opsz,wght].ttf',
    'Cinzel': 'ofl/cinzel/Cinzel[wght].ttf',
    'Newsreader': 'ofl/newsreader/Newsreader[opsz,wght].ttf',
    'FiraSans': 'ofl/firasans/FiraSans-Regular.ttf',
    'Philosopher': 'ofl/philosopher/Philosopher-Regular.ttf',
    'OldStandardTT': 'ofl/oldstandardtt/OldStandard-Regular.ttf',
}
# BG-distinctive letters whose Bulgarian forms differ from Russian-style forms
LETTERS = 'вгджзийклнптцчшщюя'

def fetch(name, path):
    dst = os.path.join(D, name + '.ttf')
    if os.path.exists(dst) and os.path.getsize(dst) > 5000:
        return dst
    url = BASE + urllib.parse.quote(path, safe='/')
    try:
        urllib.request.urlretrieve(url, dst)
        return dst
    except Exception as e:
        return None

def probe(f):
    t = TTFont(f, lazy=True)
    cmap = t.getBestCmap()
    cyr = sum(1 for c in range(0x0410, 0x0450) if c in cmap)
    extra = {c: (c in cmap) for c in (0x045D, 0x0402)}
    if 'GSUB' not in t:
        return cyr, 'no GSUB', {}
    g = t['GSUB'].table
    feats = g.FeatureList.FeatureRecord
    bgr = []
    for sr in g.ScriptList.ScriptRecord:
        if sr.ScriptTag == 'cyrl':
            for lr in sr.Script.LangSysRecord:
                if lr.LangSysTag.strip() == 'BGR':
                    bgr = [feats[i].FeatureTag for i in lr.LangSys.FeatureIndex]
    # collect locl substitutions reachable from cyrl/BGR
    changed = {}
    if 'locl' in bgr:
        lookups = set()
        for sr in g.ScriptList.ScriptRecord:
            if sr.ScriptTag == 'cyrl':
                for lr in sr.Script.LangSysRecord:
                    if lr.LangSysTag.strip() == 'BGR':
                        for i in lr.LangSys.FeatureIndex:
                            if feats[i].FeatureTag == 'locl':
                                lookups.update(feats[i].Feature.LookupListIndex)
        rev = {v: k for k, v in cmap.items()}
        for li in lookups:
            lk = g.LookupList.Lookup[li]
            for st in lk.SubTable:
                if lk.LookupType == 7:
                    st = st.ExtSubTable
                m = getattr(st, 'mapping', None)
                if m:
                    for a, b in m.items():
                        if a in rev:
                            changed[chr(rev[a])] = b
    return cyr, bgr, changed

rows = []
for name, path in CAND.items():
    f = fetch(name, path)
    if not f:
        rows.append((name, 'DOWNLOAD FAILED')); continue
    try:
        cyr, bgr, changed = probe(f)
        rows.append((name, cyr, bgr, ''.join(sorted(changed))))
    except Exception as e:
        rows.append((name, 'ERR ' + str(e)[:80]))
for r in rows:
    print(r)
