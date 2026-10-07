/* Page 1 boot: single frame (?frame=&size=), grouped pairs (?group=a,b), or the full overview. Mock-up only. */
async function bootPage1(dir) {
  const q = new URLSearchParams(location.search)
  const root = document.getElementById('root')
  const osRm = matchMedia('(prefers-reduced-motion: reduce)').matches
  const rmOn = q.has('rm') || (osRm && !q.has('motion'))
  const cls = [q.has('settled') ? 'settled' : '', rmOn ? 'rm' : '', q.has('ann') ? 'ann' : ''].join(' ')
  const ann = q.has('ann'), anim = q.has('anim')
  // review aid: simulate Android system font scale (?fs=1.3) by scaling the four type tiers and their line heights
  const fs = parseFloat(q.get('fs') || '1')
  if (fs !== 1) { const r = document.documentElement.style; [['--t-cap', 12], ['--l-cap', 17], ['--t-read', 20], ['--l-read', 31], ['--t-cta', 22], ['--l-cta', 28], ['--t-pay', 26], ['--l-pay', 32]].forEach(([k, v]) => r.setProperty(k, (v * fs).toFixed(1) + 'px')) }
  const ib = parseInt(q.get('inset') || '24', 10)
  if (ib !== 24) { document.documentElement.style.setProperty('--ib', ib + 'px'); P1.INSET.bottom = ib }
  const S = P1.SIZES
  const pair = (id, o = {}) => `<div class="pair">${['full', 'floor'].map((k) => P1.frame(dir, id, k, { cls, ann, anim, ...o })).join('')}</div>`

  if (q.get('frame')) {
    document.body.style.background = 'transparent'
    root.innerHTML = P1.frame(dir, q.get('frame'), q.get('size') || 'full', { cls, ann, anim, scroll: q.get('scroll') ?? undefined, navActive: q.get('nav') || undefined })
  } else if (q.has('navs')) {
    const crop = (k, active, pressed) => `<div style="width:${S[k].w}px;height:132px;overflow:hidden;position:relative;margin-bottom:10px"><div data-nometrics="1" style="margin-top:-${S[k].h - 132}px">${P1.frame(dir, 'normal', k, { cls: 'settled', navActive: active, navPressed: pressed, scroll: 0 })}</div></div>`
    root.innerHTML = `<div style="padding:14px;display:flex;gap:26px;align-items:flex-start"><div>${['dnes', 'karta', 'krug', 'ritam', 'ti'].map((t) => crop('full', t, '')).join('')}</div><div>${crop('floor', 'dnes', '')}${crop('floor', 'ti', '')}${crop('full', 'dnes', 'karta')}</div></div>`
  } else if (q.get('group')) {
    const ids = q.get('group').split(',')
    const gs = q.get('scroll') ?? undefined
    root.innerHTML = `<div style="display:flex;gap:26px;padding:14px;align-items:flex-start">${ids.map((id) => pair(id, gs != null ? { scroll: gs } : {})).join('')}</div>`
  } else {
    const cells = P1.STATES.map(([id, label, desc]) => `<div class="cell"><div class="cl">${label}</div><div class="cs">${desc}</div>${pair(id)}</div>`).join('')
    const navCells = ['dnes', 'karta', 'krug', 'ritam', 'ti'].map((t) => `<div class="cell"><div class="cl">${P1.C('t' + t[0].toUpperCase() + t.slice(1))} aktivna</div><div style="width:384px;height:132px;overflow:hidden;position:relative">${P1.frame(dir, 'normal', 'full', { cls: 'settled', navActive: t, scroll: 0 }).replace('class="frame', 'data-nometrics="1" style="margin-top:-700px" class="frame')}</div></div>`).join('')
    root.innerHTML = `<div class="wrap">
      <h1>${dir.title}</h1>
      <p class="dek">${dir.concept}</p>
      <div class="controls"><button id="replay">Replay first-open entry</button><label><input type="checkbox" id="rm" ${rmOn ? 'checked' : ''}> reduced motion (defaults to your OS setting: ${osRm ? 'ON' : 'off'})</label><span>Mock-up only. Layout on the real device is the founder's call; this is a render of a drawing.</span></div>
      <h2>Първа поява след разкритието — живо (entry plays once; the only loop is the ember)</h2>
      <div class="states"><div id="live">${pair('normal', { anim: true })}</div><div class="dek" style="max-width:420px">${dir.motion}</div></div>
      <h2>Състояния — 384×832 (primary) и 360×780 (floor), с вградени insets (горе 32, долу 24)</h2>
      <div class="states">${cells}</div>
      <h2>Навигация — пет таба, активно състояние</h2>
      <div class="states">${navCells}</div>
      <div class="dek" style="margin-top:10px">${dir.navNote}</div>
      <h2>Копи — всеки низ със статус</h2><div id="copy"></div>
      <h2>Измервания (автоматични, от DOM)</h2><div id="metrics"></div><div id="fontproof" class="dek"></div>
    </div>`
    const live = document.getElementById('live')
    const replay = () => { live.innerHTML = pair('normal', { anim: true, cls: document.getElementById('rm').checked ? 'rm' : '' }); P1.settle(live) }
    document.getElementById('replay').onclick = replay
    document.getElementById('rm').onchange = replay
  }

  const fontOK = await P1.fontProof()
  const metrics = P1.settle(document.body)
  document.body.dataset.fontOk = String(fontOK)
  window.__metrics = metrics
  const mEl = document.getElementById('metrics')
  if (mEl) {
    mEl.innerHTML = `<table class="t"><tr><th>state</th><th>size</th><th>content h</th><th>exit top–bottom</th><th>nav top</th><th>exit clear of nav (first viewport)</th><th>horizontal overflow</th><th>reading h</th></tr>${metrics.filter((m) => m.exitTop != null || m.overflowX).map((m) => `<tr><td>${m.state}</td><td>${m.size}</td><td>${m.contentH}</td><td>${m.exitTop != null ? m.exitTop + '–' + m.exitBottom : '—'}</td><td>${m.navTop}</td><td class="${m.exitClear ? 'ok' : m.exitClear === false ? 'warn' : ''}">${m.exitClear == null ? '—' : m.exitClear ? 'yes' : 'NO, below the fold by ' + (m.exitBottom - m.navTop) + ' px'}</td><td>${m.overflowX || 'none'}</td><td>${m.readingH ?? ''}</td></tr>`).join('')}</table>`
    document.getElementById('copy').innerHTML = P1.copyTable()
    document.getElementById('fontproof').innerHTML = `Font proof: <b>${fontOK ? 'Spectral BG loaded (document.fonts.check true for 400 and 700)' : 'FAILED: silent fallback, type critique invalid'}</b>. Glyph probe (should read like Latin “m” and “g” forms in Bulgarian): <span style="font-size:34px;font-family:'Spectral BG'" lang="bg">тдшгп 0123456789</span>`
  }
  const probe = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).animationName + '/' + getComputedStyle(e).animationDuration : 'none' }
  document.body.dataset.prm = String(matchMedia('(prefers-reduced-motion: reduce)').matches)
  document.body.dataset.motion = ['.m-read', '.m-exit', '.m-moon', '.m-rest', '.ember'].map((x) => x + '=' + probe(x)).join(' ')
  document.body.dataset.ready = '1'
}
