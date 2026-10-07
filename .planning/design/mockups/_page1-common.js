/* Page 1 (Днес + nav bar) shared mock-up logic. Mock-up only. */
const P1 = (() => {
  const SIZES = { full: { w: 384, h: 832, label: '384×832' }, floor: { w: 360, h: 780, label: '360×780 floor' } }
  const INSET = { top: 32, bottom: 24 }, TAB_H = 56

  // ───────────── copy registry: every Bulgarian string used, with status ─────────────
  // status: existing (file:line) | approved (founder-approved, where) | PLACEHOLDER_COPY (needs founder)
  const COPY = {
    date:       { t: 'сряда, 7 октомври', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: BG_DATE_FORMAT, index.tsx:64 (bg-BG weekday+day+month, Europe/Sofia)', v: 'neutral date' },
    greet:      { t: 'Добър вечер, Николай Тонев.', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: composeWelcome + getDisplayName, welcome/compose.ts:157', v: 'Oracle, 2nd person ✓' },
    greetLong:  { t: 'Благословена нощ, Александра Константинова-Димитрова.', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: same builder, stress case (firstName+lastName)', v: 'Oracle ✓' },
    dateLong:   { t: 'понеделник, 29 септември', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: BG_DATE_FORMAT, longest weekday+month pair', v: '—' },
    disclose:   { t: 'Съдържанието е генерирано от изкуствен интелект.', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: lib/legal/compliance-copy.ts:18 (EU AI Act Art. 50)', v: 'neutral UI ✓' },
    cta:        { t: 'Питай Оракула', s: 'approved', src: 'bulgarian-skill founder-approved list', v: 'imperative, neutral ✓' },
    more:       { t: 'Повече детайли', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: index.tsx:621 (not on the approved list)', v: 'neutral ✓' },
    readMore:   { t: 'Прочети повече', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: index.tsx:958 (outlier-length expand)', v: 'neutral ✓' },
    phase:      { t: 'Растяща луна', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: lib/moon-phase.ts:110', v: '—' },
    phaseSub:   { t: '62% осветена · до пълнолуние: 3 дни и 4 часа', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: index.tsx:472 + formatDaysHours (i18n/format-days-hours.ts)', v: '—' },
    phaseLong:  { t: 'Изгряващ полумесец', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: lib/moon-phase.ts:85 (longest phase name, 19)', v: '—' },
    phaseSubLong:{ t: '14% осветена · до първа четвърт: 12 дни и 23 часа', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: index.tsx:472, worst-case numbers', v: '—' },
    meteor:     { t: 'Сега през небето минава потокът на Ета Аквариди. Погледни нагоре след полунощ.', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: welcome/compose.ts:152 meteorNote()', v: 'Oracle ✓' },
    signName:   { t: 'Везни', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: sign names, welcome/sign-quips.ts keys', v: '—' },
    quip:       { t: 'Везните са в баланс. За колко дълго - зависи от теб и от онзи имейл, на който все още не отговаряш.', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: welcome/sign-quips.ts:15 (hyphen " - " in source; other quips use «ние»: Лъв, Скорпион — flagged, not touched)', v: 'Oracle ✓ (this one)' },
    s1:         { t: 'Чета небето над теб…', s: 'PLACEHOLDER_COPY', src: 'reused: oracle-loading-v2.html COPY.stages[0] (that mock-up marks it PLACEHOLDER_COPY; brief §2.7 only judges it voice-compliant)', v: 'Oracle, «аз», present ✓' },
    s2:         { t: 'Свързвам местата, които се светват…', s: 'PLACEHOLDER_COPY', src: 'reused: oracle-loading-v2.html COPY.stages[1] (that mock-up marks it PLACEHOLDER_COPY; brief §2.7 only judges it voice-compliant)', v: 'Oracle ✓' },
    s3:         { t: 'Подреждам думите…', s: 'PLACEHOLDER_COPY', src: 'reused: oracle-loading-v2.html COPY.stages[2] (that mock-up marks it PLACEHOLDER_COPY; brief §2.7 only judges it voice-compliant)', v: 'Oracle ✓' },
    slow:       { t: 'Отнема по-дълго от обикновено…', s: 'PLACEHOLDER_COPY', src: 'reused: oracle-loading-v2.html COPY.slow, 10 s line (PLACEHOLDER_COPY there too)', v: 'neutral ✓' },
    plSun:      { t: 'Слънце във Везни', s: 'PLACEHOLDER_COPY', src: 'caption «<планета> в <знак>» with в→във (bg-grammar); sample chart', v: '—' },
    plMoon:     { t: 'Луна в Скорпион', s: 'PLACEHOLDER_COPY', src: 'same; sample chart', v: '—' },
    plAsc:      { t: 'Асцендент в Лъв', s: 'PLACEHOLDER_COPY', src: 'same; sample chart', v: '—' },
    unavail:    { t: 'Звездите са временно недостъпни. Опитай отново след малко.', s: 'approved', src: 'ratified AI-unavailable message. The code on Днес still says «Звездите мълчат - опитай отново след миг.» (index.tsx:400) — recommend the ratified one', v: 'ratified ✓' },
    retry:      { t: 'Опитай отново', s: 'PLACEHOLDER_COPY', src: 'retry label, neutral imperative', v: 'neutral ✓' },
    offNote:    { t: 'Няма връзка. Показва се запазеното от днес.', s: 'PLACEHOLDER_COPY', src: 'offline + cached reading; impersonal reflexive, no first person', v: 'neutral ✓' },
    offNone:    { t: 'Няма връзка с интернет.', s: 'PLACEHOLDER_COPY', src: 'offline + nothing cached', v: 'neutral ✓' },
    cap:        { t: 'Новото ти четене те чака утре.', s: 'PLACEHOLDER_COPY', src: 'regen cap reached (server: unavailable, reason regen_cap); Oracle voice, present tense', v: 'Oracle ✓ no gender' },
    capFallback:{ t: 'Финалните щрихи преди пълнолунието са в твои ръце.', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: welcome/compose.ts PHASE_OPENERS.waxing_gibbous (2nd sentence; 1st is dropped by the code)', v: 'Oracle ✓' },
    emptyBody:  { t: 'Картата ти още не е настроена. Въведи рождените си данни, за да видиш хороскопа, наталната карта и транзитите.', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: index.tsx:644', v: 'neutral ✓' },
    emptyCta:   { t: 'Въведи рождени данни', s: 'PLACEHOLDER_COPY', src: 'reused, existing in the app: index.tsx:645', v: 'neutral ✓' },
    tDnes:      { t: 'Днес', s: 'approved', src: 'tab label', v: '' },
    tKarta:     { t: 'Карта', s: 'approved', src: 'tab label', v: '' },
    tKrug:      { t: 'Кръг', s: 'approved', src: 'tab label', v: '' },
    tRitam:     { t: 'Ритъм', s: 'approved', src: 'tab label', v: '' },
    tTi:        { t: 'Ти', s: 'approved', src: 'tab label', v: '' },
  }
  const used = new Set()
  const C = (id) => { used.add(id); return COPY[id].t }

  // ───────────── real model output (4 captured live 2026-10-07; placeholders [taspect]/[house] filled by hand) ─────────────
  // Source: gemini-3.7-flash, level low, production prompt + code path (apps/web test/latency harness, one-off capture).
  const READING = {
    p1: 'Светлината на транзитното <b class="pl-mention">Слънце</b> разгръща хармоничен тригон към твоята рождена <b class="pl-mention">Венера</b> в седмия дом, пробуждайки дълбока нежност и копнеж за творческо вдъхновение.',
    p2: 'В същото време транзитният <b class="pl-mention">Юпитер</b> оформя секстил с наталната <b class="pl-mention">Луна</b> в десетия дом, което усилва твоята емоционална проницателност и лекота в общуването. Думите ти днес носят изключителна лечебна сила и привличат искрено доверие.',
    pay: 'Сподели съкровено чувство с близък човек и остави сърцето си да води всеки разговор с топла увереност.',
    anchor: { glyph: '♃', name: 'Юпитер' },
  }

  const SIGN_GLYPHS = { leo: ['M 3.5 14 A 4.5 4.5 0 1 0 12.5 14 A 4.5 4.5 0 1 0 3.5 14 Z', 'M12.5 14c0-6 3-10 5-10s3 2 3 4-2 4-4 3'],
    libra: ['M3 20h18', 'M3 15h18', 'M7 15a5 5 0 0 1 10 0'],
    scorpio: ['M4 20V8c0-3 3-4 4-1v13', 'M8 20V8c0-3 3-4 4-1v13', 'M12 20V8c0-3 3-4 4-1v8c0 3 2 5 4 4', 'M18 16l3 3-3 3'] }
  const glyph = (k, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${SIGN_GLYPHS[k].map((d) => `<path d="${d}"/>`).join('')}</svg>`

  // ───────────── seeded static stars (no twinkle: the ember is the only loop) ─────────────
  function stars(w, h) {
    let s = 7, out = ''
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 34; i++) { const z = r() < 0.2 ? 2 : 1.2; out += `<span class="star" style="left:${(r() * w).toFixed(0)}px;top:${(r() * h).toFixed(0)}px;width:${z}px;height:${z}px"></span>` }
    return out
  }

  // ───────────── building blocks ─────────────
  const moon = (px, o = {}) => `<div class="moon ${o.tap ? 'tap' : ''} ${o.anim ? 'm-moon' : ''}" style="width:${px}px;height:${px}px"><div class="halo"></div>${px > 100 ? '<div class="depth"></div>' : ''}<div class="orb"></div></div>`
  const exitLit = (label, o = {}) => `<div class="exit ${o.neutral ? 'neutral' : ''} ${o.anim ? 'm-exit' : ''}" data-exit><div class="eglow"></div><span class="etext">${label}<span class="ember"></span></span></div>`

  function loading(stage, slow) {
    const lit = (i) => (stage >= i ? 'lit' : '')
    const text = slow ? C('slow') : [C('s1'), C('s2'), C('s3')][stage]
    // caption «<планета> в <знак>» always on two lines: planet / «в знак» (same words, fixed break)
    const cap = (id) => { const t = C(id); const i = t.indexOf(' '); return `${t.slice(0, i)}<br>${t.slice(i + 1)}` }
    return `<div class="placements" style="margin-top:32px">
      <div class="pl ${lit(0)}"><div class="pl-glyph"><div class="pl-glow"></div>${glyph('libra')}</div><div class="pl-label">${cap('plSun')}</div></div>
      <div class="pl ${lit(1)}"><div class="pl-glyph"><div class="pl-glow"></div>${glyph('scorpio')}</div><div class="pl-label">${cap('plMoon')}</div></div>
      <div class="pl ${lit(2)}"><div class="pl-glyph"><div class="pl-glow"></div>${glyph('leo')}</div><div class="pl-label">${cap('plAsc')}</div></div>
    </div><div class="stagetext ${slow ? 'slow' : ''}">${text}</div>`
  }

  // ───────────── nav: two treatments, same ruled items (5 tabs, mixed-case 12 px labels, violet, never bronze) ─────────────
  const ICON = {
    tiPerson: '<circle cx="12" cy="7.6" r="3.6"/><path d="M4.5 20c0-4.4 3.4-7 7.5-7s7.5 2.6 7.5 7"/>', // no chart = no sign yet
    dnes: '<circle cx="12" cy="12" r="4.2"/><path d="M12 3v2.4M12 18.6V21M21 12h-2.4M5.4 12H3M18.2 5.8l-1.7 1.7M7.5 16.5l-1.7 1.7M18.2 18.2l-1.7-1.7M7.5 7.5L5.8 5.8"/>',
    karta: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4v2M12 18v2M20 12h-2M4 12h2"/>',
    krug: '<circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/>',
    ritam: '<path d="M2.5 12h4l2-6 3 12 2.5-9 1.5 3h6.5"/>',
    ti: SIGN_GLYPHS.libra.map((d) => `<path d="${d}"/>`).join(''), // the user's sign glyph (placeholder: current 24-box set)
  }
  const TABS = [['dnes', 'tDnes'], ['karta', 'tKarta'], ['krug', 'tKrug'], ['ritam', 'tRitam'], ['ti', 'tTi']]
  function nav(variant, active = 'dnes', pressed = '', noChart = false) {
    const tab = (id, lab, i) => {
      const on = id === active
      // A: violet point under the label (shipped device).  B: the horizon hairline lights above the active tab.
      const dotA = variant === 'A' ? `<span style="position:absolute;bottom:3px;width:3px;height:3px;border-radius:50%;background:var(--violet);box-shadow:0 0 7px 2px rgba(139,92,246,.7);opacity:${on ? 1 : 0}"></span>` : ''
      return `<div class="tab ${on ? 'on' : ''} ${pressed === id ? 'pressed' : ''}" data-tab="${id}"><svg viewBox="0 0 24 24">${id === 'ti' && noChart ? ICON.tiPerson : ICON[id]}</svg><span class="lab">${C(lab)}</span>${dotA}</div>`
    }
    const idx = TABS.findIndex((t) => t[0] === active)
    const horizon = variant === 'B'
      ? `<div class="nav-hz" style="position:absolute;top:-1px;height:3px;width:20%;left:${idx * 20}%;display:flex;justify-content:center"><span style="width:56px;height:1px;margin-top:1px;background:linear-gradient(to right,transparent,rgba(139,92,246,.95),transparent);box-shadow:0 0 8px 1px rgba(139,92,246,.7)"></span></div>` : ''
    return `<div class="nav" data-nav="${variant}"><div class="fade"></div><div class="row">${horizon}${TABS.map((t, i) => tab(t[0], t[1], i)).join('')}</div></div>`
  }

  // ───────────── state table (shared by both directions) ─────────────
  const STATES = [
    ['normal', 'Нормално', 'Reading arrived, chart present. Free and premium look identical here (verified: tier only changes the Oracle topic padlocks, oracle.tsx:66). A time-unknown chart also looks identical (birth_time only feeds houses/ASC; Днес uses sun sign + the horoscope).'],
    ['scrolled', 'Нормално, превъртяно докрай', 'Same state scrolled to the end: shows everything that lives below the first viewport.'],
    ['load0', 'Зареждане, t = 0 s', 'Staged words, no bar, no percentage. First placement lights with line 1.'],
    ['load1', 'Зареждане, t = 1.5 s', 'Second placement + line 2.'],
    ['load2', 'Зареждане, t = 3.0 s', 'Third placement + line 3 (shown for ~85% of measured calls).'],
    ['loadslow', 'Зареждане, t = 10 s', '“Taking longer” line (just above measured p95).'],
    ['fail', 'Неуспех (AI недостъпен)', 'Ratified message + the one neutral lit exit is retry. Oracle exit is withheld (the Oracle would fail too).'],
    ['offcached', 'Без връзка, запазено четене', 'Reading from the per-day AsyncStorage cache; one quiet line says why it may be stale. The Oracle exit is withheld (the Oracle needs the network); the single lit exit is the neutral retry.'],
    ['offnone', 'Без връзка, нищо запазено', 'No cache for today. Retry is the single lit exit.'],
    ['regencap', 'Достигнат лимит за обновяване', 'Server: {content:null, unavailable:true, reason:"regen_cap"} after birth-data edits. Shows the non-AI sky summary (no AI disclosure: not AI text) + one Oracle line.'],
    ['empty', 'Няма карта', 'chart === null: first run without birth data. Uses the invitation device, no chevron row.'],
    ['stress', 'Най-дългите реални низове', 'Full-name greeting, longest weekday date, «Изгряващ полумесец» + worst sub-label, active meteor shower.'],
  ]

  // ───────────── frame ─────────────
  function frame(dir, stateId, sizeKey, o = {}) {
    const { w, h } = SIZES[sizeKey]
    const scroll = o.scroll != null ? o.scroll : stateId === 'scrolled' ? 'end' : 0
    const body = dir.render(stateId, { w, h, sizeKey, anim: !!o.anim })
    const navActive = o.navActive || 'dnes'
    return `<div class="frame ${o.cls || ''}" style="width:${w}px;height:${h}px" data-dir="${dir.id}" data-state="${stateId}" data-size="${sizeKey}" data-scroll="${scroll}">
      <div class="bg"><div class="wash-warm"></div>${stars(w, h)}</div>
      <div class="statusbar"><span class="tnum">21:40</span><span><i></i></span></div>
      <div class="viewport"><div class="scroll" style="transform:translateY(0)">${body}</div></div>
      ${nav(dir.nav, navActive, o.navPressed || '', stateId === 'empty')}
      <div class="gesture"></div>
      ${o.ann ? `<div class="foldline" style="top:${h - TAB_H - INSET.bottom}px"><b>nav top (${h - TAB_H - INSET.bottom})</b></div>` : ''}
    </div>`
  }

  // after insertion: apply scroll, measure, collect metrics
  function settle(root) {
    const out = []
    root.querySelectorAll('.frame').forEach((f) => {
      if (f.dataset.nometrics) return
      const vp = f.querySelector('.viewport'), sc = f.querySelector('.scroll')
      const h = f.offsetHeight, w = f.offsetWidth
      const maxScroll = Math.max(0, sc.offsetHeight - vp.offsetHeight)
      let s = f.dataset.scroll === 'end' ? maxScroll : Number(f.dataset.scroll) || 0
      sc.style.transform = `translateY(${-s}px)`
      const fr = f.getBoundingClientRect()
      const navTop = h - TAB_H - INSET.bottom
      const ex = f.querySelector('[data-exit]')
      const m = { dir: f.dataset.dir, state: f.dataset.state, size: f.dataset.size, contentH: sc.offsetHeight, maxScroll, scrolled: Math.round(s), navTop }
      if (ex) { const r = ex.getBoundingClientRect(); m.exitTop = Math.round(r.top - fr.top); m.exitBottom = Math.round(r.bottom - fr.top); m.exitClear = s === 0 ? (m.exitBottom <= navTop) : null; m.exitUnderFade = s === 0 ? (m.exitBottom > h - 120) : null }
      // horizontal overflow: any content element whose box leaves the frame
      const bad = []
      sc.querySelectorAll('*').forEach((e) => { if (e.closest('.glow,.eglow,.halo,.depth,.pl-glow')) return; const r = e.getBoundingClientRect(); if (r.width && (r.right - fr.left > w + 0.5 || r.left - fr.left < -0.5)) bad.push(e.className || e.tagName) })
      m.overflowX = bad.length ? bad.slice(0, 3).join(',') : ''
      const reading = f.querySelector('[data-reading]')
      if (reading) { const r = reading.getBoundingClientRect(); m.readingH = Math.round(r.height); m.readingBottom = Math.round(r.bottom - fr.top) }
      out.push(m)
    })
    return out
  }

  function copyTable() {
    return `<table class="t"><tr><th>Bulgarian</th><th>Status</th><th>Source</th><th>Voice check</th></tr>${[...used].map((id) => {
      const c = COPY[id]; const st = c.s === 'PLACEHOLDER_COPY' ? '<span class="pc">PLACEHOLDER_COPY</span>' : '<b>approved</b>'
      return `<tr><td>${c.t}</td><td>${st}</td><td>${c.src}</td><td>${c.v}</td></tr>` }).join('')}</table>`
  }

  async function fontProof() {
    await document.fonts.load('400 20px "Spectral BG"'); await document.fonts.load('700 22px "Spectral BG"')
    return document.fonts.check('400 20px "Spectral BG"') && document.fonts.check('700 22px "Spectral BG"')
  }

  return { SIZES, INSET, TAB_H, STATES, COPY, C, used, READING, READINGS: READING, glyph, moon, exitLit, loading, nav, frame, settle, copyTable, fontProof, ICON, TABS }
})()
