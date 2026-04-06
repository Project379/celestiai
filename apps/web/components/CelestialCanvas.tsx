'use client'

import { useEffect, useRef, useCallback } from 'react'

/* ═══════════════════════════════════════════════════════════════
   CONSTELLATION DATA — Real zodiac + iconic constellations
   Star offsets in px at 1920px reference width.
   ═══════════════════════════════════════════════════════════════ */
export interface ConstellationStar {
  dx: number; dy: number; mag: number; name?: string
}

export interface ConstellationData {
  id: string
  name: string
  latin: string
  description: string
  season: string
  brightestStar: string
  brightestStar: string
  element?: string
  L0: number; D0: number  // Ecliptic Longitude and Declination offset
  stars: ConstellationStar[]
  lines: [number, number][]
}

export const CONSTELLATIONS: ConstellationData[] = [
  {
    id: 'aries', name: 'Овен', latin: 'Aries', element: 'Огън',
    description: 'Първият зодиакален знак — символ на ново начало, смелост и водачество. Златното руно от древногръцката митология.',
    season: 'Пролет (март–април)', brightestStar: 'Хамал (α Arietis)',
    L0: 15, D0: 0.1,
    stars: [{ dx: 0, dy: 0, mag: 2.0, name: 'Хамал' }, { dx: 18, dy: -6, mag: 2.6, name: 'Шератан' }, { dx: 30, dy: -10, mag: 4.4 }, { dx: -12, dy: 8, mag: 5.2 }],
    lines: [[0, 1], [1, 2], [0, 3]],
  },
  {
    id: 'taurus', name: 'Телец', latin: 'Taurus', element: 'Земя',
    description: 'V-образната фигура на Хиадите с ярко-оранжевия Алдебаран — окото на бика. Плеядите (Седемте сестри) са наблизо.',
    season: 'Зима (април–май)', brightestStar: 'Алдебаран (α Tauri)',
    L0: 45, D0: -0.05,
    stars: [{ dx: 0, dy: 0, mag: 0.9, name: 'Алдебаран' }, { dx: -20, dy: -18, mag: 3.5 }, { dx: 18, dy: -12, mag: 3.4 }, { dx: -10, dy: 15, mag: 3.8 }, { dx: 25, dy: 10, mag: 3.6 }, { dx: -35, dy: -30, mag: 4.2 }],
    lines: [[1, 0], [0, 2], [0, 3], [0, 4], [1, 5]],
  },
  {
    id: 'gemini', name: 'Близнаци', latin: 'Gemini', element: 'Въздух',
    description: 'Кастор и Полукс — двата ярки „близнака" в горната част. Символ на двойственост, комуникация и любопитство.',
    season: 'Зима–Пролет (май–юни)', brightestStar: 'Полукс (β Geminorum)',
    L0: 75, D0: 0.0,
    stars: [{ dx: -8, dy: -30, mag: 1.6, name: 'Кастор' }, { dx: 8, dy: -25, mag: 1.1, name: 'Полукс' }, { dx: -12, dy: 0, mag: 3.5 }, { dx: 6, dy: 5, mag: 3.3 }, { dx: -15, dy: 30, mag: 3.6 }, { dx: 10, dy: 32, mag: 3.8 }],
    lines: [[0, 2], [2, 4], [1, 3], [3, 5], [0, 1], [2, 3]],
  },
  {
    id: 'cancer', name: 'Рак', latin: 'Cancer', element: 'Вода',
    description: 'Слабо съзвездие, но съдържа Ясли (Praesepe) — красив звезден куп, видим с просто око при тъмно небе.',
    season: 'Пролет (юни–юли)', brightestStar: 'Ал Тарф (β Cancri)',
    L0: 105, D0: -0.1,
    stars: [{ dx: 0, dy: 0, mag: 3.5 }, { dx: -15, dy: -12, mag: 4.0 }, { dx: 12, dy: -15, mag: 3.9 }, { dx: -10, dy: 18, mag: 4.3 }, { dx: 14, dy: 16, mag: 4.7 }],
    lines: [[1, 0], [0, 2], [0, 3], [0, 4]],
  },
  {
    id: 'leo', name: 'Лъв', latin: 'Leo', element: 'Огън',
    description: 'Сърпът (обърнат въпросителен знак) отбелязва гривата на лъва. Регул блести в сърцето му — една от четирите Кралски звезди.',
    season: 'Пролет (юли–август)', brightestStar: 'Регул (α Leonis)',
    L0: 135, D0: 0.0,
    stars: [{ dx: -20, dy: -25, mag: 3.5 }, { dx: -8, dy: -30, mag: 3.4 }, { dx: 5, dy: -18, mag: 2.6 }, { dx: 0, dy: 0, mag: 1.4, name: 'Регул' }, { dx: 25, dy: -5, mag: 3.3 }, { dx: 35, dy: 10, mag: 2.1, name: 'Денебола' }, { dx: 20, dy: 15, mag: 3.5 }],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
  },
  {
    id: 'virgo', name: 'Дева', latin: 'Virgo', element: 'Земя',
    description: 'Най-голямото зодиакално съзвездие. Спика — синьо-бялата звезда — е 15-ата най-ярка на нощното небе.',
    season: 'Лято (август–септември)', brightestStar: 'Спика (α Virginis)',
    L0: 165, D0: 0.05,
    stars: [{ dx: 0, dy: 0, mag: 1.0, name: 'Спика' }, { dx: -15, dy: -30, mag: 3.6 }, { dx: 10, dy: -25, mag: 3.4 }, { dx: -5, dy: -50, mag: 3.9 }, { dx: 20, dy: -45, mag: 4.0 }, { dx: -25, dy: -15, mag: 4.2 }],
    lines: [[0, 1], [0, 2], [1, 3], [2, 4], [1, 5], [1, 2]],
  },
  {
    id: 'libra', name: 'Везни', latin: 'Libra', element: 'Въздух',
    description: 'Единственото съзвездие на зодиака, което не е животно. Символизира баланс и справедливост — везните на Астрея.',
    season: 'Лято (септември–октомври)', brightestStar: 'Зубенешамали (β Librae)',
    L0: 195, D0: -0.05,
    stars: [{ dx: 0, dy: 0, mag: 2.6 }, { dx: 25, dy: -5, mag: 2.7 }, { dx: -10, dy: 25, mag: 3.3 }, { dx: 30, dy: 22, mag: 3.6 }],
    lines: [[0, 1], [0, 2], [1, 3], [2, 3]],
  },
  {
    id: 'scorpius', name: 'Скорпион', latin: 'Scorpius', element: 'Вода',
    description: 'Антарес — червеният свръхгигант в сърцето на скорпиона — съперничи на Марс по цвят. Извитата опашка сочи жилото.',
    season: 'Лято (октомври–ноември)', brightestStar: 'Антарес (α Scorpii)',
    L0: 225, D0: -0.15,
    stars: [{ dx: -15, dy: -30, mag: 3.0 }, { dx: -5, dy: -15, mag: 2.9 }, { dx: 0, dy: 0, mag: 0.9, name: 'Антарес' }, { dx: 8, dy: 15, mag: 2.8 }, { dx: 18, dy: 25, mag: 3.0 }, { dx: 25, dy: 35, mag: 2.7 }, { dx: 18, dy: 42, mag: 3.2 }, { dx: 28, dy: 45, mag: 2.5 }],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
  },
  {
    id: 'sagittarius', name: 'Стрелец', latin: 'Sagittarius', element: 'Огън',
    description: 'Астеризмът „Чайникът" е лесно разпознаваем. Стрелецът сочи към центъра на Млечния път — най-гъстата звездна област.',
    season: 'Лято–Есен (ноември–декември)', brightestStar: 'Каус Аустралис (ε Sagittarii)',
    L0: 255, D0: -0.2,
    stars: [{ dx: -15, dy: 15, mag: 2.8 }, { dx: -15, dy: -5, mag: 3.0 }, { dx: 0, dy: -15, mag: 2.7 }, { dx: 15, dy: -5, mag: 2.6, name: 'Каус Аустр.' }, { dx: 15, dy: 15, mag: 2.8 }, { dx: 0, dy: 20, mag: 3.2 }, { dx: 5, dy: -28, mag: 3.0 }, { dx: -8, dy: -25, mag: 3.4 }],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [2, 6], [2, 7]],
  },
  {
    id: 'capricorn', name: 'Козирог', latin: 'Capricornus', element: 'Земя',
    description: 'Морската коза — наполовина коза, наполовина риба. Едно от най-старите описани съзвездия, познато от древен Шумер.',
    season: 'Есен (декември–януари)', brightestStar: 'Денеб Алгеди (δ Capricorni)',
    L0: 285, D0: -0.1,
    stars: [{ dx: -20, dy: -10, mag: 3.6 }, { dx: -8, dy: -18, mag: 3.1 }, { dx: 10, dy: -12, mag: 3.7 }, { dx: 22, dy: 0, mag: 2.9 }, { dx: 10, dy: 15, mag: 3.8 }, { dx: -10, dy: 12, mag: 4.0 }],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  {
    id: 'aquarius', name: 'Водолей', latin: 'Aquarius', element: 'Въздух',
    description: 'Носителят на водата. Зигзагообразната линия символизира водния поток. Свързва се с мита за Ганимед.',
    season: 'Есен (януари–февруари)', brightestStar: 'Садалсууд (β Aquarii)',
    L0: 315, D0: 0.0,
    stars: [{ dx: 0, dy: -20, mag: 2.9, name: 'Садалсууд' }, { dx: 15, dy: -10, mag: 3.0 }, { dx: 5, dy: 0, mag: 3.3 }, { dx: 18, dy: 8, mag: 3.7 }, { dx: 0, dy: 18, mag: 3.5 }, { dx: 15, dy: 25, mag: 4.0 }, { dx: -10, dy: 30, mag: 4.2 }],
    lines: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [4, 6]],
  },
  {
    id: 'pisces', name: 'Риби', latin: 'Pisces', element: 'Вода',
    description: 'Две риби, свързани с лента. В митологията — Афродита и Ерос, превърнати в риби, за да избягат от Тифон.',
    season: 'Зима (февруари–март)', brightestStar: 'Ета Рибите (η Piscium)',
    L0: 345, D0: 0.1,
    stars: [{ dx: -25, dy: -10, mag: 3.6 }, { dx: -15, dy: -18, mag: 4.0 }, { dx: 0, dy: -8, mag: 3.8 }, { dx: 0, dy: 8, mag: 4.0 }, { dx: 15, dy: 15, mag: 3.7 }, { dx: 25, dy: 8, mag: 3.9 }, { dx: 30, dy: -5, mag: 4.1 }],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
  },
  // ─── Iconic non-zodiac constellations ───
  {
    id: 'orion', name: 'Орион', latin: 'Orion',
    description: 'Ловецът — най-разпознаваемото съзвездие. Три звезди в редица образуват „Пояса на Орион", видим от целия свят.',
    season: 'Зима (декември–март)', brightestStar: 'Ригел (β Orionis)',
    L0: 80, D0: -0.35,
    stars: [
      { dx: -25, dy: -40, mag: 0.4, name: 'Бетелгейзе' },
      { dx: 25, dy: -35, mag: 1.6, name: 'Белатрикс' },
      { dx: -8, dy: 0, mag: 1.7 }, { dx: 0, dy: 0, mag: 1.7 }, { dx: 8, dy: -2, mag: 2.2 },
      { dx: -20, dy: 40, mag: 2.1, name: 'Сейф' },
      { dx: 22, dy: 42, mag: 0.1, name: 'Ригел' },
    ],
    lines: [[0, 2], [2, 3], [3, 4], [4, 1], [0, 5], [1, 6], [2, 5], [4, 6]],
  },
  {
    id: 'ursa-major', name: 'Голяма мечка', latin: 'Ursa Major',
    description: 'Голямата кола (Плуга) — седемте звезди-астеризъм са навигационен ориентир от хилядолетия. Дубхе и Мерак сочат към Полярната.',
    season: 'Целогодишно', brightestStar: 'Алиот (ε Ursae Majoris)',
    L0: 150, D0: 0.55,
    stars: [
      { dx: -30, dy: -5, mag: 1.8, name: 'Дубхе' },
      { dx: -28, dy: 15, mag: 2.4, name: 'Мерак' },
      { dx: -5, dy: 18, mag: 2.4 },
      { dx: -2, dy: 2, mag: 3.3 },
      { dx: 15, dy: -2, mag: 1.8, name: 'Алиот' },
      { dx: 30, dy: -8, mag: 2.1, name: 'Мицар' },
      { dx: 45, dy: -15, mag: 1.9 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
  {
    id: 'cassiopeia', name: 'Касиопея', latin: 'Cassiopeia',
    description: 'Характерната W-форма е лесно разпознаваема и никога не залязва от България. Кралицата на трона — наказана за суета.',
    season: 'Целогодишно', brightestStar: 'Шедар (α Cassiopeiae)',
    L0: 20, D0: 0.6,
    stars: [
      { dx: -30, dy: 8, mag: 2.2, name: 'Шедар' },
      { dx: -15, dy: -12, mag: 2.3 },
      { dx: 0, dy: 5, mag: 2.5 },
      { dx: 15, dy: -12, mag: 2.7 },
      { dx: 30, dy: 8, mag: 3.4 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
]

/* ═══════════════════════════════════════════════════════════════
   PLANET POSITIONS — Simplified Keplerian mean longitudes
   ═══════════════════════════════════════════════════════════════ */
export interface PlanetVisual {
  id: string
  name: string
  latin: string
  color: string
  glowColor: string
  dimGlow: string    // pre-cached dim version of glowColor for gradient stop
  size: number
  longitude: number  // degrees on ecliptic
  screenX: number
  screenY: number
}

const PLANET_DEFS = [
  { id: 'mercury', name: 'Меркурий', latin: 'Mercury', period: 87.97, L0: 252.25, color: '#a78bfa', glowColor: 'rgba(167,139,250,0.4)', size: 2.5 },
  { id: 'venus', name: 'Венера', latin: 'Venus', period: 224.7, L0: 181.98, color: '#fbbf24', glowColor: 'rgba(251,191,36,0.5)', size: 3.5 },
  { id: 'mars', name: 'Марс', latin: 'Mars', period: 687.0, L0: 355.45, color: '#ef4444', glowColor: 'rgba(239,68,68,0.4)', size: 3 },
  { id: 'jupiter', name: 'Юпитер', latin: 'Jupiter', period: 4332.6, L0: 34.40, color: '#fb923c', glowColor: 'rgba(251,146,60,0.45)', size: 5 },
  { id: 'saturn', name: 'Сатурн', latin: 'Saturn', period: 10759.2, L0: 49.94, color: '#d4a76a', glowColor: 'rgba(212,167,106,0.4)', size: 4.5 },
]

function computePlanetPositions(w: number, h: number): PlanetVisual[] {
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0)
  const now = Date.now()
  const days = (now - J2000) / 86400000

  return PLANET_DEFS.map(p => {
    const longitude = ((p.L0 + (360 / p.period) * days) % 360 + 360) % 360
    // Map ecliptic longitude to a sinusoidal path across the viewport
    const t = longitude / 360
    const screenX = t * w * 0.9 + w * 0.05
    const screenY = h * 0.52 + Math.sin(t * Math.PI * 2) * h * 0.12
    const dimGlow = p.glowColor.replace(/[\d.]+\)$/, '0.1)')
    return { ...p, longitude, screenX, screenY, dimGlow }
  })
}

/* ─── Star color from blackbody temperature ─── */
function starColorFromTemp(temp: number): [number, number, number] {
  const t = temp / 100
  let r: number, g: number, b: number
  if (t <= 66) { r = 255 } else { r = Math.max(0, Math.min(255, 329.698727446 * Math.pow(t - 60, -0.1332047592))) }
  if (t <= 66) { g = Math.max(0, Math.min(255, 99.4708025861 * Math.log(t) - 161.1195681661)) } else { g = Math.max(0, Math.min(255, 288.1221695283 * Math.pow(t - 60, -0.0755148492))) }
  if (t >= 66) { b = 255 } else if (t <= 19) { b = 0 } else { b = Math.max(0, Math.min(255, 138.5177312231 * Math.log(t - 10) - 305.0447927307)) }
  return [r, g, b]
}

/* ─── Noise ─── */
function simplerNoise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return n - Math.floor(n)
}
function fbmNoise(x: number, y: number, octaves = 4): number {
  let value = 0, amplitude = 0.5, frequency = 1
  for (let i = 0; i < octaves; i++) { value += amplitude * simplerNoise(x * frequency, y * frequency); amplitude *= 0.5; frequency *= 2 }
  return value
}

/* ─── Star types ─── */
interface Star {
  x: number; y: number; z: number; size: number
  baseOpacity: number; twinkleSpeed: number; twinklePhase: number
  r: number; g: number; b: number
  // Pre-cached color strings to avoid per-frame string concatenation
  colorBase: string  // "r,g,b" portion for rgba() template
}

interface ShootingStar {
  x: number; y: number; vx: number; vy: number
  life: number; maxLife: number; size: number
  trail: { x: number; y: number }[]
}

/* ═══════════════════════════════════════════════════════════════ */

export interface CelestialCanvasProps {
  className?: string
  starCount?: number
  interactive?: boolean
  hoveredConstellationId?: string | null
  selectedConstellationId?: string | null
  /** External mouse position ref — if provided, canvas uses it instead of tracking its own */
  externalMouseRef?: React.RefObject<{ x: number; y: number } | null>
  /** Callback: writes constellation screen positions each frame for overlay positioning */
  onPositionsUpdate?: (positions: Map<string, { x: number; y: number; stars: { sx: number; sy: number }[] }>) => void
}

export function CelestialCanvas({
  className,
  starCount = 350,
  interactive = true,
  hoveredConstellationId = null,
  selectedConstellationId = null,
  externalMouseRef,
  onPositionsUpdate,
}: CelestialCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const internalMouseRef = useRef({ x: -1000, y: -1000 })
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const milkyWayRenderedRef = useRef(false)
  const stateRef = useRef({ hoveredConstellationId, selectedConstellationId, onPositionsUpdate })

  useEffect(() => {
    stateRef.current = { hoveredConstellationId, selectedConstellationId, onPositionsUpdate }
  }, [hoveredConstellationId, selectedConstellationId, onPositionsUpdate])

  const mouseRef = externalMouseRef || internalMouseRef

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!interactive || externalMouseRef) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    internalMouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }, [interactive, externalMouseRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    let w = 0, h = 0
    let bgGrad: CanvasGradient | null = null

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth; h = window.innerHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      milkyWayRenderedRef.current = false
      offscreenRef.current = null

      bgGrad = ctx.createLinearGradient(0, 0, 0, h)
      bgGrad.addColorStop(0, '#030712')   // near-black
      bgGrad.addColorStop(0.3, '#0a0f1e') // deep navy
      bgGrad.addColorStop(0.5, '#070b17')
      bgGrad.addColorStop(0.7, '#0c1120')
      bgGrad.addColorStop(1, '#030610')
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    if (interactive && !externalMouseRef) {
      canvas.addEventListener('mousemove', handleMouseMove)
    }

    /* ─── Star temperature distribution ─── */
    function randomStarTemp(): number {
      const r = Math.random()
      if (r < 0.03) return 25000 + Math.random() * 15000
      if (r < 0.10) return 7500 + Math.random() * 2500
      if (r < 0.25) return 6000 + Math.random() * 1500
      if (r < 0.40) return 5200 + Math.random() * 800
      if (r < 0.60) return 3700 + Math.random() * 1500
      return 2400 + Math.random() * 1300
    }

    /* ─── Generate background stars ─── */
    const stars: Star[] = []
    for (let i = 0; i < starCount; i++) {
      const z = Math.random()
      const temp = randomStarTemp()
      const [r, g, b] = starColorFromTemp(temp)
      const tempFactor = temp > 8000 ? 1.5 : temp > 5500 ? 1.2 : 1.0
      stars.push({
        x: Math.random() * 2000, y: Math.random() * 2000, z,
        size: (Math.random() * 1.4 + 0.2) * (0.5 + z * 0.7) * tempFactor,
        baseOpacity: Math.random() * 0.5 + 0.2,
        twinkleSpeed: Math.random() * 1.5 + 0.3,
        twinklePhase: Math.random() * Math.PI * 2,
        r, g, b,
        colorBase: `${r},${g},${b}`,
      })
    }

    /* ─── Shooting stars ─── */
    const shootingStars: ShootingStar[] = []
    let shootingTimer = 0

    /* ─── Planet positions ─── */
    const planets = computePlanetPositions(w, h)

    /* ─── Milky way renderer (cached) ─── */
    function renderMilkyWay(tw: number, th: number): HTMLCanvasElement {
      const off = document.createElement('canvas')
      off.width = Math.floor(tw / 4); off.height = Math.floor(th / 4)
      const octx = off.getContext('2d')
      if (!octx) return off
      const sw = off.width, sh = off.height
      const imageData = octx.createImageData(sw, sh)
      const data = imageData.data
      for (let py = 0; py < sh; py++) {
        for (let px = 0; px < sw; px++) {
          const nx = px / sw, ny = py / sh
          const bandCenter = nx * 0.6 + 0.2
          const distToBand = Math.abs(ny - bandCenter)
          const bandWidth = 0.12 + fbmNoise(nx * 3, ny * 3, 3) * 0.06
          const bandIntensity = Math.max(0, 1 - distToBand / bandWidth)
          const cloudiness = fbmNoise(nx * 8 + 0.5, ny * 8 + 0.5, 4)
          const intensity = bandIntensity * bandIntensity * cloudiness * 0.3
          const idx = (py * sw + px) * 4
          data[idx] = Math.floor(160 * intensity)
          data[idx + 1] = Math.floor(155 * intensity)
          data[idx + 2] = Math.floor(175 * intensity)
          data[idx + 3] = Math.floor(255 * intensity)
        }
      }
      octx.putImageData(imageData, 0, 0)
      return off
    }

    const constellationScale = Math.max(w, 1200) / 1920

    /* ─── Compute dynamic constellation layout ─── */
    const dynamicConstellations = CONSTELLATIONS.map(c => {
      const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0)
      const now = Date.now()
      const days = (now - J2000) / 86400000
      
      // Shift constellations realistically based on the year (1 orbit per earth year)
      const offset = (days / 365.25) * 360
      const longitude = ((c.L0 + offset) % 360 + 360) % 360
      
      // Map to standard layout viewport using the same sine wave as the planets
      const t = longitude / 360
      const screenX = t * w * 0.9 + w * 0.05
      
      // Modulate ecliptic wave
      const eclipticY = h * 0.52 + Math.sin(t * Math.PI * 2) * h * 0.12
      // Apply their true deviation from the ecliptic plus scale
      const screenY = eclipticY - (c.D0 * h * 0.4)
      
      return {
        ...c,
        vx: screenX,
        vy: screenY,
        // Pre-allocate mutable arrays for per-frame star position updates (avoids .map() allocation each frame)
        _screenStars: c.stars.map(s => ({ sx: 0, sy: 0, mag: s.mag, name: s.name })),
        _posStars: c.stars.map(() => ({ sx: 0, sy: 0 })),
      }
    })

    // Reuse a single Map for constellation positions — avoids GC pressure from creating one every frame
    const positionsMap = new Map<string, { x: number; y: number; stars: { sx: number; sy: number }[] }>()

    let animId: number
    let time = 0
    let paused = false

    // Pause rendering when tab is hidden — saves 100% of CPU when backgrounded
    const handleVisibility = () => {
      paused = document.hidden
      if (!paused) animId = requestAnimationFrame(animate)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const animate = () => {
      if (paused) return
      time += 0.006

      /* ─── Background gradient (deep navy-black, NO purple) ─── */
      if (bgGrad) {
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, w, h)
      }

      /* ─── Milky way (cached, warm) ─── */
      if (!milkyWayRenderedRef.current || !offscreenRef.current) {
        offscreenRef.current = renderMilkyWay(w, h)
        milkyWayRenderedRef.current = true
      }
      ctx.globalAlpha = 0.5
      ctx.drawImage(offscreenRef.current!, 0, 0, w, h)
      ctx.globalAlpha = 1

      /* ─── Mouse for parallax ─── */
      const mouse = mouseRef.current || { x: -1000, y: -1000 }
      const mx = mouse.x, my = mouse.y
      const mouseActive = interactive && mx > 0 && my > 0
      // Parallax offset based on mouse (center of screen = zero offset)
      const pxOffsetX = mouseActive ? (mx - w / 2) * 0.02 : 0
      const pxOffsetY = mouseActive ? (my - h / 2) * 0.02 : 0

      /* ─── Background stars (optimized: batched paths, pre-cached colors, squared distance) ─── */
      const PI2 = Math.PI * 2
      const mouseDistSq = 10000 // 100^2 for squared-distance check (avoids sqrt)

      for (const star of stars) {
        const px = pxOffsetX * star.z
        const py = pxOffsetY * star.z
        const sx = ((star.x + px) % w + w) % w
        const sy = ((star.y + py) % h + h) % h
        // Simplified twinkle: single sin is visually indistinguishable from dual-sin
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7
        let opacity = star.baseOpacity * twinkle
        let sz = star.size
        const cb = star.colorBase // pre-cached "r,g,b"

        // Mouse proximity glow — squared distance avoids expensive sqrt
        if (mouseActive) {
          const dx = sx - mx, dy = sy - my
          const distSq = dx * dx + dy * dy
          if (distSq < mouseDistSq) {
            const f = (1 - Math.sqrt(distSq) * 0.01) * 0.3
            opacity = Math.min(1, opacity + f)
            sz += f * 1.2
          }
        }

        // Glow for brighter stars — single pass instead of two
        if (sz > 1.2 && opacity > 0.35) {
          ctx.fillStyle = `rgba(${cb},${opacity * 0.1})`
          ctx.beginPath(); ctx.arc(sx, sy, sz * 3, 0, PI2); ctx.fill()
        }

        // Star core
        ctx.fillStyle = `rgba(${cb},${opacity})`
        ctx.beginPath(); ctx.arc(sx, sy, sz, 0, PI2); ctx.fill()

        // Diffraction spikes — only for the brightest stars
        if (sz > 1.8 && opacity > 0.5) {
          const spikeLen = sz * 3 * twinkle
          ctx.strokeStyle = `rgba(${cb},${opacity * 0.18})`
          ctx.lineWidth = 0.5
          ctx.beginPath()
          ctx.moveTo(sx - spikeLen, sy); ctx.lineTo(sx + spikeLen, sy)
          ctx.moveTo(sx, sy - spikeLen); ctx.lineTo(sx, sy + spikeLen)
          ctx.stroke()
        }
      }

      /* ═══ CONSTELLATIONS ═══ */
      positionsMap.clear()

      for (const c of dynamicConstellations) {
        const baseX = c.vx // now directly in px
        const baseY = c.vy
        const cx = baseX + pxOffsetX * 0.5
        const cy = baseY + pxOffsetY * 0.5
        const scale = constellationScale

        const isHovered = stateRef.current.hoveredConstellationId === c.id
        const isSelected = stateRef.current.selectedConstellationId === c.id

        // Compute screen positions of stars — reuse pre-allocated arrays
        const screenStars = c._screenStars
        const posStars = c._posStars
        for (let si = 0; si < c.stars.length; si++) {
          const s = c.stars[si]
          const ssx = cx + s.dx * scale
          const ssy = cy + s.dy * scale
          screenStars[si].sx = ssx
          screenStars[si].sy = ssy
          posStars[si].sx = ssx
          posStars[si].sy = ssy
        }

        positionsMap.set(c.id, { x: cx, y: cy, stars: posStars })

        // Draw connection lines
        const lineAlpha = isHovered || isSelected ? 0.55 : 0.15
        const lineColor = isHovered || isSelected
          ? 'rgba(200, 220, 255,' + lineAlpha + ')'
          : 'rgba(120, 140, 170,' + lineAlpha + ')'

        ctx.strokeStyle = lineColor
        ctx.lineWidth = isHovered || isSelected ? 1.2 : 0.6
        ctx.setLineDash(isHovered || isSelected ? [] : [4, 4])
        for (const [a, b] of c.lines) {
          const s1 = screenStars[a], s2 = screenStars[b]
          ctx.beginPath()
          ctx.moveTo(s1.sx, s1.sy); ctx.lineTo(s2.sx, s2.sy)
          ctx.stroke()
        }
        ctx.setLineDash([])

        // Draw constellation stars (brighter than background) — single glow pass
        for (const s of screenStars) {
          const brightness = Math.max(0.5, 1 - s.mag / 6)
          const sz = (3.5 - s.mag * 0.4) * scale * (isHovered || isSelected ? 1.3 : 1)
          const alpha = brightness * (isHovered || isSelected ? 1 : 0.75)

          // Single glow pass (reduced from 2)
          if (sz > 1.5) {
            ctx.fillStyle = `rgba(200,215,255,${alpha * 0.15})`
            ctx.beginPath(); ctx.arc(s.sx, s.sy, sz * 3, 0, PI2); ctx.fill()
          }

          // Star core
          ctx.fillStyle = `rgba(220,230,255,${alpha})`
          ctx.beginPath(); ctx.arc(s.sx, s.sy, Math.max(1, sz), 0, PI2); ctx.fill()
        }

        // Constellation name label (on hover/select)
        if (isHovered || isSelected) {
          ctx.save()
          ctx.font = `600 ${12 * scale}px -apple-system, BlinkMacSystemFont, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          // Find topmost star for label position
          const topStar = screenStars.reduce((a, b) => a.sy < b.sy ? a : b)
          const labelY = topStar.sy - 14 * scale
          // Background pill
          const textW = ctx.measureText(c.name).width
          const pillPad = 8 * scale
          ctx.fillStyle = 'rgba(10, 15, 30, 0.75)'
          const pillX = cx - textW / 2 - pillPad
          const pillY = labelY - 12 * scale
          const pillW = textW + pillPad * 2
          const pillH = 16 * scale
          ctx.beginPath()
          ctx.roundRect(pillX, pillY, pillW, pillH, 4)
          ctx.fill()
          ctx.strokeStyle = 'rgba(200, 220, 255, 0.3)'
          ctx.lineWidth = 0.5
          ctx.stroke()
          // Label text
          ctx.fillStyle = 'rgba(200, 220, 255, 0.9)'
          ctx.fillText(c.name, cx, labelY)
          ctx.restore()
        }
      }

      // Notify parent of constellation positions
      if (stateRef.current.onPositionsUpdate) {
        stateRef.current.onPositionsUpdate(positionsMap)
      }

      /* ═══ PLANETS along ecliptic (optimized: cached dim glow color) ═══ */
      ctx.save()
      ctx.font = `500 10px -apple-system, BlinkMacSystemFont, sans-serif`
      ctx.textAlign = 'center'
      for (const p of planets) {
        const px = p.screenX + pxOffsetX * 0.3
        const py = p.screenY + pxOffsetY * 0.3
        const pulse = Math.sin(time * 1.2 + p.longitude * 0.1) * 0.15 + 0.85
        const glowR = p.size * 8

        // Outer glow — use cached dimGlow string
        const grad = ctx.createRadialGradient(px, py, 0, px, py, glowR)
        grad.addColorStop(0, p.glowColor)
        grad.addColorStop(0.5, p.dimGlow)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(px, py, glowR, 0, PI2); ctx.fill()

        // Planet disc
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(px, py, p.size * pulse, 0, PI2); ctx.fill()

        // Bright core
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.beginPath(); ctx.arc(px, py, p.size * 0.4, 0, PI2); ctx.fill()

        // Label
        ctx.fillStyle = 'rgba(200, 210, 230, 0.5)'
        ctx.fillText(p.name, px, py + glowR + 12)
      }
      ctx.restore()

      /* ─── Shooting stars ─── */
      shootingTimer += 0.006
      if (shootingTimer > 5 + Math.random() * 15) {
        shootingTimer = 0
        const startX = Math.random() * w
        const startY = Math.random() * h * 0.5
        const angle = (Math.random() * 50 + 15) * (Math.PI / 180) * (Math.random() < 0.5 ? 1 : -1)
        const speed = 6 + Math.random() * 8
        shootingStars.push({
          x: startX, y: startY,
          vx: Math.cos(angle) * speed, vy: Math.abs(Math.sin(angle) * speed),
          life: 0, maxLife: 40 + Math.random() * 40,
          size: 0.8 + Math.random() * 1.2, trail: [],
        })
      }
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i]
        s.trail.unshift({ x: s.x, y: s.y })
        if (s.trail.length > 20) s.trail.pop()
        s.x += s.vx; s.y += s.vy; s.life++
        const progress = s.life / s.maxLife
        const headAlpha = progress < 0.3 ? progress / 0.3 : Math.max(0, 1 - (progress - 0.3) / 0.7)
        for (let t = 1; t < s.trail.length; t++) {
          const prev = s.trail[t - 1], curr = s.trail[t]
          const trailAlpha = headAlpha * (1 - t / s.trail.length) * 0.6
          if (trailAlpha <= 0) continue
          ctx.strokeStyle = `rgba(200, 215, 235, ${trailAlpha})`
          ctx.lineWidth = s.size * (1 - t / s.trail.length)
          ctx.lineCap = 'round'
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(curr.x, curr.y); ctx.stroke()
        }
        if (headAlpha > 0) {
          ctx.fillStyle = `rgba(255,255,255,${headAlpha * 0.6})`
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 1.5, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = `rgba(200,210,235,${headAlpha * 0.25})`
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2); ctx.fill()
        }
        if (s.life >= s.maxLife) shootingStars.splice(i, 1)
      }

      /* ─── Horizon haze ─── */
      const hazeGrad = ctx.createLinearGradient(0, h * 0.88, 0, h)
      hazeGrad.addColorStop(0, 'transparent')
      hazeGrad.addColorStop(1, 'rgba(8, 12, 25, 0.35)')
      ctx.fillStyle = hazeGrad
      ctx.fillRect(0, h * 0.88, w, h * 0.12)

      animId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (interactive && !externalMouseRef) canvas.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animId)
    }
  }, [starCount, interactive, handleMouseMove, externalMouseRef, mouseRef])

  return (
    <canvas
      ref={canvasRef}
      className={className ?? 'absolute inset-0'}
      aria-hidden="true"
    />
  )
}
