import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

export interface SparkSeries {
  /** لون دلالي (متغيّر CSS أو قيمة). */
  color: string
  values: number[]
}

const PAD = 6

/**
 * خطوط سبارك تملأ عنصرها الأب (absolute): الزمن من اليسار (الأقدم) لليمين (الآن)، بمقياس مشترك يبدأ من الصفر.
 * عند الظهور تُرسم الخطوط بالتتابع ثم تظهر نقاط «الآن» وتنبض؛ ومع `scrub` يظهر خط عمودي ونقطة على كل خط.
 * `fit`: المقياس من أدنى قيمة لأعلاها بدل الصفر (للأرصدة). `fade`: يتلاشى الرسم من اليسار (خلف المحتوى).
 */
export function SparkLines({
  series,
  scrub,
  opacity = 1,
  dots = true,
  fit = false,
  fade = false,
}: {
  series: SparkSeries[]
  scrub?: number | null
  opacity?: number
  dots?: boolean
  fit?: boolean
  fade?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const boxRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(SVGPathElement | null)[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = series[0]?.values.length ?? 0
  const { w, h } = size
  const pad = Math.min(PAD, h / 6)
  const all = series.flatMap((s) => s.values)
  const lo = fit ? Math.min(...all) : 0
  const hi = fit ? Math.max(...all) : Math.max(1, ...all) * 1.08
  const range = hi - lo || 1
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * w : w)
  // خط مستوٍ (بدون تغيّر) بمقياس «fit» يُرسم بالمنتصف.
  const y = (v: number) => (fit && hi === lo ? h / 2 : h - pad - ((v - lo) / range) * (h - pad * 2))
  const paths = series.map((s) => s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(''))
  const key = `${n}-${series.map((s) => s.values[n - 1]).join(',')}-${w}-${h}`

  // رسم الخطوط بالتتابع (يُعاد عند تغيّر البيانات أو المقاس).
  useEffect(() => {
    if (!w) return
    lineRefs.current.forEach((line, k) => {
      if (!line) return
      const len = line.getTotalLength()
      line.style.strokeDasharray = `${len}`
      line.style.setProperty('--qb-len', `${len}`)
      line.style.animation = 'none'
      void line.getBoundingClientRect()
      line.style.animation = `qb-line-draw 1.3s cubic-bezier(0.22,1,0.36,1) ${250 + k * 160}ms both`
    })
  }, [key, w])

  const dot = (s: SparkSeries, idx: number, live: boolean, delay: number) => (
    <g key={`${s.color}-${idx}-${live}`} style={{ animation: live ? `qb-pop 500ms var(--ease-spring) ${delay}ms both` : undefined, transformOrigin: `${x(idx)}px ${y(s.values[idx])}px` }}>
      {live && <circle cx={x(idx)} cy={y(s.values[idx])} r={4} fill={s.color} opacity={0.5} style={{ animation: `qb-dot-pulse 1.8s ease-out ${delay + 400}ms infinite` }} />}
      <circle cx={x(idx)} cy={y(s.values[idx])} r={live ? 3.5 : 4.5} fill={live ? s.color : '#fff'} stroke={live ? 'var(--color-bg)' : s.color} strokeWidth={live ? 2 : 2.5} />
    </g>
  )

  return (
    <div ref={boxRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
      {w > 0 && n > 1 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 overflow-visible" style={{ opacity }}>
          <defs>
            {series.map((s, k) => (
              <linearGradient key={k} id={`${uid}-g${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" style={{ stopColor: s.color, stopOpacity: 0.2 }} />
                <stop offset="1" style={{ stopColor: s.color, stopOpacity: 0 }} />
              </linearGradient>
            ))}
            {fade && (
              <>
                <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
                  <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
                </linearGradient>
                <mask id={`${uid}-mask`}>
                  <rect width={w} height={h} fill={`url(#${uid}-fade)`} />
                </mask>
              </>
            )}
          </defs>
          <g mask={fade ? `url(#${uid}-mask)` : undefined}>
            {paths.map((d, k) => (
              <path key={`a${k}-${key}`} d={`${d}L${w},${h}L0,${h}Z`} fill={`url(#${uid}-g${k})`} style={{ animation: `fade-in 900ms ${700 + k * 150}ms both` }} />
            ))}
            {paths.map((d, k) => (
              <path key={`l${k}`} ref={(el) => void (lineRefs.current[k] = el)} d={d} fill="none" stroke={series[k].color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
          </g>
          {dots &&
            (scrub === null || scrub === undefined ? (
              series.map((s, k) => dot(s, n - 1, true, 1300 + k * 150))
            ) : (
              <>
                <line x1={x(scrub)} x2={x(scrub)} y1={-8} y2={h + 8} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
                {series.map((s) => dot(s, scrub, false, 0))}
              </>
            ))}
        </svg>
      )}
    </div>
  )
}
