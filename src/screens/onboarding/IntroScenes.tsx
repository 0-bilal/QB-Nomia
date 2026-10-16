import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * مشاهد قصص الترحيب — كل مشهد يُركَّب من جديد عند ظهوره (key) فتبدأ حركته
 * من الصفر. الأرقام والأسماء أمثلة توضيحية فقط، ما تقرأ أي بيانات حقيقية.
 */

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Svg({ size = 16, width = 2, children }: { size?: number; width?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

function soft(color: string, pct = 16) {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}

const CURVE = 'M0 120 C30 110 40 128 70 100 S110 92 130 70 S170 74 214 30'

const BALANCE = 12480

export function BalanceScene() {
  const [n, setN] = useState(() => (reduceMotion() ? BALANCE : 0))
  useEffect(() => {
    const target = BALANCE
    if (reduceMotion()) return
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1600)
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="qb-ob-mini">
      <div className="text-[11px] text-[var(--color-text-3)]">إجمالي حساباتك</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="num text-[34px] font-bold">{n.toLocaleString('en-US')}</span>
        <span className="text-[12px] text-[var(--color-text-3)]">ر.س</span>
      </div>
      <span className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: soft('var(--color-income)', 15), color: 'var(--color-income)' }}>
        <span dir="ltr" className="num">+1,240</span> هذا الشهر
      </span>
      <svg viewBox="0 0 214 150" preserveAspectRatio="none" className="absolute inset-x-0" style={{ bottom: 46, width: '100%', height: 150 }}>
        <defs>
          <linearGradient id="ob-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3ee08f" stopOpacity=".22" />
            <stop offset="1" stopColor="#3ee08f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${CURVE} V150 H0Z`} fill="url(#ob-area)" className="qb-ob-fade" style={{ animationDelay: '1.4s' }} />
        <path d={CURVE} fill="none" stroke="var(--color-income)" strokeWidth="2" strokeDasharray="420" strokeDashoffset="420" className="qb-ob-draw" />
        <path d={CURVE} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="28 420" className="qb-ob-run" />
        <circle cx="210" cy="32" r="4" fill="var(--color-income)" className="qb-ob-fade" style={{ animationDelay: '2s' }} />
      </svg>
      <div className="absolute inset-x-4 bottom-3.5 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="qb-ob-pop h-[26px] flex-1 rounded-[9px] bg-[var(--color-surface-high)]" style={{ animationDelay: `${0.2 + i * 0.12}s` }} />
        ))}
      </div>
    </div>
  )
}

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export function RecordScene() {
  const [still] = useState(reduceMotion)
  const [amount, setAmount] = useState(still ? '45' : '')
  const [hit, setHit] = useState<string | null>(null)
  const [cat, setCat] = useState(still)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (still) return
    const steps: [number, () => void][] = [
      [600, () => setHit('4')],
      [170, () => (setHit(null), setAmount('4'))],
      [380, () => setHit('5')],
      [170, () => (setHit(null), setAmount('45'))],
      [400, () => setCat(true)],
      [800, () => setHit('save')],
      [170, () => (setHit(null), setSaved(true))],
      [1600, () => setSaved(false)],
    ]
    const timers: number[] = []
    let at = 0
    for (const [ms, fn] of steps) timers.push(window.setTimeout(fn, (at += ms)))
    return () => timers.forEach(clearTimeout)
  }, [still])
  const keyStyle = (on: boolean) => ({
    background: on ? 'var(--color-accent)' : 'var(--color-surface)',
    color: on ? 'var(--color-on-accent)' : 'var(--color-text-2)',
    transform: on ? 'scale(.92)' : 'none',
    transition: 'background 150ms, color 150ms, transform 200ms var(--ease-spring)',
  })
  return (
    <div className="qb-ob-mini">
      {saved && (
        <div className="qb-ob-pop absolute left-1/2 top-11 z-10 -ml-[46px] flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[rgba(28,28,33,.94)] px-3 text-[12px] font-semibold">
          <span className="text-[var(--color-income)]">
            <Svg size={14} width={2.8}>
              <path d="M5 12l5 5L20 7" />
            </Svg>
          </span>
          انحفظت
        </div>
      )}
      <div className="flex h-[50px] items-center justify-center gap-1 text-[var(--color-expense)]">
        <span className="num text-[38px] font-bold">{amount}</span>
        <span className="qb-ob-blink h-[30px] w-[2px] bg-[var(--color-expense)]" />
        <span className="text-[12px] text-[var(--color-text-3)]">ر.س</span>
      </div>
      <div className="mb-2.5 mt-1.5 flex h-[26px] justify-center">
        {cat && (
          <span className="qb-ob-pop inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold" style={{ background: soft('var(--color-owed-by)'), color: 'var(--color-owed-by)' }}>
            مطاعم
          </span>
        )}
      </div>
      <div dir="ltr" className="grid grid-cols-3 gap-1.5">
        {PAD.map((k) => (
          <span key={k} className="num grid h-[34px] place-items-center rounded-[11px] text-[14px] font-semibold" style={keyStyle(hit === k)}>
            {k}
          </span>
        ))}
        <span
          className="col-span-3 grid h-[34px] place-items-center rounded-[11px] text-[12px] font-semibold"
          style={{
            background: hit === 'save' ? 'var(--color-expense)' : soft('var(--color-expense)', 18),
            color: hit === 'save' ? 'var(--color-on-accent)' : 'var(--color-expense)',
            transition: 'background 150ms, color 150ms',
          }}
        >
          حفظ
        </span>
      </div>
    </div>
  )
}

const RINGS: [string, string, number][] = [
  ['مطاعم', 'var(--color-owed-by)', 0.42],
  ['سيارة', 'var(--color-commitment)', 0.28],
  ['تسوّق', 'var(--color-transfer)', 0.18],
]
const RING_LEN = 2 * Math.PI * 22

export function InsightScene() {
  const [fill, setFill] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setFill(true), 60)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="qb-ob-mini">
      <div className="mb-2.5 text-[11px] text-[var(--color-text-3)]">تدفّق هذا الشهر</div>
      <div className="flex h-[110px] items-end gap-2.5 border-b border-[var(--color-border)] px-1.5">
        <div className="qb-ob-grow h-full flex-1 rounded-t-[10px] rounded-b-[4px]" style={{ background: soft('var(--color-income)', 70) }} />
        <div className="qb-ob-grow h-[62%] flex-1 rounded-t-[10px] rounded-b-[4px]" style={{ background: soft('var(--color-expense)', 70), animationDelay: '180ms' }} />
      </div>
      <div className="flex gap-2.5 px-1.5 pt-1.5 text-[10.5px] text-[var(--color-text-3)]">
        <div className="flex-1">
          دخل الشهر<b className="num block text-[14px] text-[var(--color-text)]">9,500</b>
        </div>
        <div className="flex-1">
          صرفت<b className="num block text-[14px] text-[var(--color-text)]">5,870</b>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {RINGS.map(([name, color, p], i) => (
          <div key={name} className="flex flex-col items-center gap-1 text-[10px] text-[var(--color-text-3)]">
            <svg viewBox="0 0 52 52" width="52" height="52" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="26" cy="26" r="22" fill="none" strokeWidth="5" stroke="var(--color-surface-high)" />
              <circle
                cx="26"
                cy="26"
                r="22"
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                stroke={color}
                strokeDasharray={RING_LEN}
                strokeDashoffset={fill ? RING_LEN * (1 - p) : RING_LEN}
                style={{ transition: `stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1) ${0.5 + i * 0.15}s` }}
              />
            </svg>
            {name}
          </div>
        ))}
      </div>
    </div>
  )
}

const PEOPLE: { initial: ReactNode; name: string; sub: string; amount: string; color: string }[] = [
  { initial: 'ع', name: 'عبدالله', sub: 'سلف لك', amount: '500', color: 'var(--color-owed-to)' },
  { initial: 'س', name: 'سعد', sub: 'سلف عليك', amount: '300', color: 'var(--color-owed-by)' },
  {
    initial: (
      <Svg>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
      </Svg>
    ),
    name: 'سلفة راتب',
    sub: 'باقي 3 أقساط',
    amount: '1,500',
    color: 'var(--color-commitment)',
  },
  {
    initial: (
      <Svg>
        <path d="M4 9h16l-1 10H5zM8 9V6a4 4 0 0 1 8 0v3" />
      </Svg>
    ),
    name: 'بقالة الحي',
    sub: 'دَين متجر',
    amount: '85',
    color: 'var(--color-text-2)',
  },
]

export function PeopleScene() {
  return (
    <div className="qb-ob-mini">
      <div className="mb-1 text-[11px] text-[var(--color-text-3)]">السلف والديون</div>
      {PEOPLE.map((p, i) => (
        <div key={p.name} className="qb-ob-slide flex items-center gap-2.5 border-b border-[var(--color-border)] py-[9px]" style={{ animationDelay: `${i * 150}ms` }}>
          <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[12px] text-[13px] font-bold" style={{ background: soft(p.color), color: p.color }}>
            {p.initial}
          </div>
          <div className="flex-1 text-[12.5px] font-semibold">
            {p.name}
            <small className="block text-[10px] font-normal text-[var(--color-text-3)]">{p.sub}</small>
          </div>
          <div className="num text-[13px] font-bold" style={{ color: i < 2 ? p.color : undefined }}>
            {p.amount}
          </div>
        </div>
      ))}
      <div
        className="qb-ob-pop mt-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-[rgba(28,28,33,.9)] px-3 text-[11.5px] font-semibold"
        style={{ animationDelay: '1.2s' }}
      >
        <Svg size={14}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" />
        </Svg>
        تذكير: موعد سداد سعد بكرة
      </div>
    </div>
  )
}

const CIPHER_CHARS = 'ABCDEFabcdef0123456789+/='
const PLAIN = 'قهوة · 45 ر.س'
const randChar = () => CIPHER_CHARS[(Math.random() * CIPHER_CHARS.length) | 0]

export function PrivacyScene() {
  const [still] = useState(reduceMotion)
  const [plain, setPlain] = useState(PLAIN)
  const [plainOn, setPlainOn] = useState(!still)
  const [cipher, setCipher] = useState(() => (still ? Array.from({ length: 80 }, randChar).join('') : ''))
  const [cells, setCells] = useState(still ? 9 : 0)
  const wire = useRef<SVGPathElement>(null)
  const pkt = useRef<SVGCircleElement>(null)

  useEffect(() => {
    if (still) return
    let alive = true
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    ;(async () => {
      await sleep(900)
      for (let r = 0; r < 10 && alive; r++) {
        setPlain([...PLAIN].map((c) => (c === ' ' || Math.random() >= r / 10 ? c : randChar())).join(''))
        await sleep(70)
      }
      setPlainOn(false)
      const path = wire.current
      if (!path) return
      const len = path.getTotalLength()
      for (let c = 0; c < 9 && alive; c++) {
        setCipher(Array.from({ length: 40 + c * 6 }, randChar).join(''))
        const t0 = performance.now()
        await new Promise<void>((done) => {
          const f = (now: number) => {
            if (!alive) return done()
            const p = Math.min(1, (now - t0) / 420)
            const pt = path.getPointAtLength(len * p)
            pkt.current?.setAttribute('cx', String(pt.x))
            pkt.current?.setAttribute('cy', String(pt.y))
            if (p < 1) requestAnimationFrame(f)
            else done()
          }
          requestAnimationFrame(f)
        })
        if (alive) setCells(c + 1)
      }
      pkt.current?.setAttribute('cx', '-10')
    })()
    return () => {
      alive = false
    }
  }, [still])

  const box = 'grid h-[74px] w-[74px] place-items-center rounded-[22px] border border-[var(--color-border-strong)] bg-[var(--color-surface)]'
  return (
    <div className="relative h-[330px] w-[300px]">
      <svg viewBox="0 0 300 330" className="absolute inset-0 h-full w-full overflow-visible">
        <path ref={wire} d="M262 40 C240 100 200 120 150 155 S70 220 38 290" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1.4" strokeDasharray="4 5" />
        <circle ref={pkt} r="3.5" cx="-10" cy="-10" fill="#fff" />
      </svg>
      <div className="absolute right-0 top-0 flex flex-col items-center gap-1.5 text-[10.5px] text-[var(--color-text-3)]">
        <div className={box}>
          <Svg size={26} width={1.8}>
            <rect x="6" y="2" width="12" height="20" rx="3" />
            <path d="M11 18h2" />
          </Svg>
        </div>
        جوالك
      </div>
      <div className="absolute right-[92px] top-[22px] whitespace-nowrap text-[11px] text-[var(--color-text-2)]" style={{ opacity: plainOn ? 1 : 0, transition: 'opacity 300ms' }}>
        {plain}
      </div>
      <div className="absolute left-1/2 top-[118px] -ml-[37px] flex flex-col items-center gap-1.5 text-[10.5px] text-[var(--color-text-3)]">
        <div className={`${box} qb-ob-halo border-0`} style={{ background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent-b))', color: 'var(--color-on-accent)' }}>
          <Svg size={28}>
            <rect x="4" y="11" width="16" height="10" rx="2.5" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </Svg>
        </div>
        تشفير بجوالك
      </div>
      <div dir="ltr" className="absolute bottom-1 right-0 w-[150px] break-all text-left font-mono text-[10px] leading-[1.5] text-[var(--color-text-3)]">
        {cipher}
      </div>
      <div className="absolute bottom-0 left-0 flex flex-col items-center gap-1.5 text-[10.5px] text-[var(--color-text-3)]">
        <div className={box}>
          <div className="grid h-full w-full grid-cols-3 gap-[3px] p-2">
            {Array.from({ length: 9 }, (_, i) => (
              <i key={i} className="rounded-[3px]" style={{ background: i < cells ? 'var(--color-income)' : 'var(--color-surface-high)', transition: 'background 300ms' }} />
            ))}
          </div>
        </div>
        جدولك في Google
      </div>
    </div>
  )
}
