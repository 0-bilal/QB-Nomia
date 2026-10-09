import { useEffect, useId, useRef } from 'react'
import type { LockBackground as LockBg } from '../lib/lockPrefs'

/** شكل زخرفي للمنحنى (للمعاينة المصغّرة، أو لو ما فيه سجل رصيد كافٍ). */
const DEMO_CURVE = [60, 58, 62, 55, 57, 52, 54, 49, 51, 47, 50, 44, 46, 40, 43, 37, 41, 34, 30, 33, 26, 29, 22, 24, 18].map((v) => 100 - v)

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** شبكة نقاط تتموّج من مركز الشاشة (Canvas). */
function DotsWave({ mini }: { mini: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const g = c.getContext('2d')
    if (!g) return
    let raf = 0
    const t0 = performance.now()
    const still = prefersReducedMotion()
    const frame = (t: number) => {
      const r = c.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (c.width !== Math.round(r.width * dpr)) {
        c.width = Math.round(r.width * dpr)
        c.height = Math.round(r.height * dpr)
      }
      g.clearRect(0, 0, c.width, c.height)
      const gap = (mini ? 9 : 22) * dpr
      const cx = c.width / 2
      const cy = c.height * 0.38
      const time = still ? 0 : (t - t0) / 1000
      for (let y = gap / 2; y < c.height; y += gap) {
        for (let x = gap / 2; x < c.width; x += gap) {
          const d = Math.hypot(x - cx, y - cy) / dpr
          const wave = (Math.sin(d / (mini ? 10 : 26) - time * 2.2) + 1) / 2
          const fall = Math.max(0, 1 - d / (r.width * 0.9))
          g.fillStyle = `rgba(255,255,255,${(0.05 + wave * 0.22) * fall + 0.03})`
          g.beginPath()
          g.arc(x, y, (1 + wave * 1.1) * dpr * (mini ? 0.6 : 1), 0, Math.PI * 2)
          g.fill()
        }
      }
      if (!still) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [mini])
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />
}

/** منحنى الرصيد: الشكل فقط بدون أي رقم — يُرسم ثم تجري عليه ومضة. */
function Curve({ values, mini }: { values: number[]; mini: boolean }) {
  const uid = useId().replace(/:/g, '')
  const vals = values.length > 1 && values.some((v) => v !== values[0]) ? values : DEMO_CURVE
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const range = hi - lo || 1
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1)) * 400).toFixed(1)},${(200 - ((v - lo) / range) * 150 - 20).toFixed(1)}`).join('')
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[58%] w-full">
      <defs>
        <linearGradient id={`${uid}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.09" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d}L400,220L0,220Z`} fill={`url(#${uid}-f)`} />
      <path d={d} pathLength={1} className="qb-lock-curve" vectorEffect="non-scaling-stroke" />
      {!mini && <path d={d} pathLength={1} className="qb-lock-curve-run" vectorEffect="non-scaling-stroke" />}
    </svg>
  )
}

/**
 * خلفية شاشة القفل — أربعة أنماط يختارها المستخدم من الأمان والخصوصية.
 * `mini` للمعاينة المصغّرة في الإعدادات. `curve` يأخذ قيم الرصيد (الشكل فقط).
 * `ringsAt` موضع مركز الحلقات (نسبة من الارتفاع).
 */
export function LockBackground({ variant, mini = false, curve = [], ringsAt = 0.36 }: { variant: LockBg; mini?: boolean; curve?: number[]; ringsAt?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {variant === 'aurora' && (
        <>
          <span className="qb-lock-aurora-a" />
          <span className="qb-lock-aurora-b" />
          <span className="qb-lock-grain" />
        </>
      )}
      {variant === 'rings' && (
        <>
          <span className="qb-lock-aurora-a" style={{ opacity: 0.5 }} />
          {[0, 1, 2, 3].map((k) => (
            <span key={k} className="qb-lock-ring" style={{ top: `${ringsAt * 100}%`, animationDelay: `${k * 1.5}s` }} />
          ))}
        </>
      )}
      {variant === 'curve' && (
        <>
          <span className="qb-lock-aurora-a" style={{ opacity: 0.6 }} />
          <Curve values={curve} mini={mini} />
        </>
      )}
      {variant === 'dots' && <DotsWave mini={mini} />}
      {!mini && <span className="absolute inset-0" style={{ background: 'radial-gradient(70% 50% at 50% 38%, transparent, rgba(5,5,6,0.55) 100%)' }} />}
    </div>
  )
}
