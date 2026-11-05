import { useEffect, useRef, useState } from 'react'
import { haptic } from '../lib/haptics'

/** مدة الضغط المطوّل اللازمة — تمنع الإجراء بضغطة بالغلط. */
const HOLD_MS = 1500

/**
 * زر الإجراءات اللي ما تنعكس (DESIGN-SYSTEM §8.1): يتعبّى بلونه من اليمين أثناء الضغط المطوّل،
 * والرفع قبل الاكتمال يلغي. `color` لون دلالي (مثل var(--color-expense)).
 */
export function HoldToConfirm({ label, color, onConfirm, disabled = false }: { label: string; color: string; onConfirm: () => void; disabled?: boolean }) {
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const raf = useRef(0)

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  function start() {
    if (disabled) return
    haptic('tick')
    setHolding(true)
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / HOLD_MS)
      setProgress(p)
      if (p < 1) raf.current = requestAnimationFrame(step)
      else {
        setHolding(false)
        haptic('success')
        onConfirm()
      }
    }
    raf.current = requestAnimationFrame(step)
  }

  function stop() {
    if (!holding) return
    cancelAnimationFrame(raf.current)
    setHolding(false)
    setProgress(0)
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault()
        start()
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="relative mt-4 h-[52px] w-full touch-none select-none overflow-hidden rounded-[17px] text-center text-[14px] font-bold disabled:opacity-35"
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        color: holding ? 'var(--color-text)' : color,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 origin-right"
        style={{ background: color, transform: `scaleX(${progress})`, transition: holding ? 'none' : 'transform 300ms var(--ease-out-expo)' }}
      />
      <span className="relative">{label}</span>
    </button>
  )
}
