import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

const RIGHT_PAD = 14

/**
 * منحنى الرصيد كخلفية لقسم الإجمالي (مثل شاشات الأسهم): مساحة متدرّجة تُرسم عند الظهور ثم ومضة تجري على الخط،
 * والتمرير بالإصبع (أو الماوس) يختار يومًا — `onScrub(i)` — ويرجع null عند الرفع.
 * يُركَّب داخل عنصر relative؛ يملأه بالكامل خلف المحتوى.
 */
export function BalanceChart({ values, onScrub }: { values: number[]; onScrub: (index: number | null) => void }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<SVGPathElement>(null)
  const runRef = useRef<SVGPathElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [scrub, setScrub] = useState<number | null>(null)
  const drag = useRef({ active: false, x: 0, scrubbing: false })

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = values.length
  const { w, h } = size
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * (w - RIGHT_PAD) : w - RIGHT_PAD)
  const y = (v: number) => h * 0.3 + (1 - (v - min) / range) * h * 0.6
  const up = n === 0 || values[n - 1] >= values[0]
  const rgb = up ? '62,224,143' : '255,95,109'
  const path = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const key = `${n}-${values[0]}-${values[n - 1]}-${w}`

  // رسم الخط من البداية ثم تشغيل الومضة الجارية (تُعاد مع كل تغيير بالفترة أو البيانات).
  useEffect(() => {
    const line = lineRef.current
    const run = runRef.current
    if (!line || !run || !w) return
    const len = line.getTotalLength()
    line.style.strokeDasharray = `${len}`
    line.style.setProperty('--qb-len', `${len}`)
    line.style.animation = 'none'
    void line.getBoundingClientRect()
    line.style.animation = 'qb-line-draw 1.4s cubic-bezier(0.22,1,0.36,1) both'
    const seg = Math.min(90, len * 0.18)
    run.style.strokeDasharray = `${seg} ${len}`
    run.style.setProperty('--qb-run', `${-(len + seg)}`)
    run.style.opacity = '0'
    run.style.animation = 'none'
    const t = window.setTimeout(() => {
      run.style.opacity = '1'
      run.style.animation = 'qb-line-run 2.6s cubic-bezier(0.45,0,0.2,1) 0.2s infinite'
    }, 1400)
    return () => window.clearTimeout(t)
  }, [key, w])

  function indexAt(clientX: number): number {
    const r = boxRef.current!.getBoundingClientRect()
    const i = Math.round(((clientX - r.left) / (w - RIGHT_PAD)) * (n - 1))
    return Math.max(0, Math.min(n - 1, i))
  }
  function set(i: number | null) {
    setScrub(i)
    onScrub(i)
  }
  function onDown(e: ReactPointerEvent) {
    drag.current = { active: true, x: e.clientX, scrubbing: false }
  }
  function onMove(e: ReactPointerEvent) {
    if (n < 2) return
    if (e.pointerType === 'mouse' && !drag.current.active) {
      set(indexAt(e.clientX))
      return
    }
    const d = drag.current
    if (!d.active) return
    // يبدأ الاختيار بعد سحب أفقي واضح — حتى تبقى الضغطة العادية على عناصر القسم تعمل.
    if (!d.scrubbing) {
      if (Math.abs(e.clientX - d.x) < 6) return
      d.scrubbing = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    set(indexAt(e.clientX))
  }
  function onEnd() {
    drag.current.active = false
    drag.current.scrubbing = false
    if (scrub !== null) set(null)
  }

  return (
    <div
      ref={boxRef}
      data-own-gesture
      className="absolute inset-0 z-0"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      onPointerLeave={onEnd}
      aria-hidden="true"
    >
      {w > 0 && n > 1 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="pointer-events-none absolute inset-0 overflow-visible">
          <defs>
            <linearGradient id="qb-bal-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={`rgba(${rgb},0.22)`} />
              <stop offset="1" stopColor={`rgba(${rgb},0)`} />
            </linearGradient>
            <linearGradient id="qb-bal-fade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0.15" />
              <stop offset="0.3" stopColor="#fff" stopOpacity="1" />
            </linearGradient>
            <mask id="qb-bal-mask">
              <rect width={w} height={h} fill="url(#qb-bal-fade)" />
            </mask>
            <filter id="qb-bal-glow">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g mask="url(#qb-bal-mask)">
            <path key={`a-${key}`} d={`${path}L${x(n - 1)},${h}L0,${h}Z`} fill="url(#qb-bal-fill)" style={{ animation: 'fade-in 900ms 300ms both' }} />
            <path ref={lineRef} d={path} fill="none" stroke={`rgba(${rgb},0.75)`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <path ref={runRef} d={path} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={2.4} strokeLinecap="round" filter="url(#qb-bal-glow)" style={{ opacity: 0 }} />
          </g>
          {scrub === null ? (
            <>
              <circle cx={x(n - 1)} cy={y(values[n - 1])} r={4} fill={`rgba(${rgb},0.5)`} style={{ animation: 'qb-dot-pulse 1.8s ease-out infinite' }} />
              <circle cx={x(n - 1)} cy={y(values[n - 1])} r={3.5} fill={`rgb(${rgb})`} stroke="var(--color-bg)" strokeWidth={2} />
            </>
          ) : (
            <>
              <line x1={x(scrub)} x2={x(scrub)} y1={0} y2={h} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
              <circle cx={x(scrub)} cy={y(values[scrub])} r={5} fill="#fff" stroke={`rgb(${rgb})`} strokeWidth={2.5} />
            </>
          )}
        </svg>
      )}
    </div>
  )
}
