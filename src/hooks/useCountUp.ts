import { useEffect, useRef, useState } from 'react'

/** عدّاد ناعم (count-up) يتحرك من القيمة السابقة للجديدة كل ما تتغير — حسب هوية الحركة بالمخطط (2.5). */
export function useCountUp(value: number, duration = 900): number {
  const [shown, setShown] = useState(value)
  const fromRef = useRef(value)
  const shownRef = useRef(value)

  useEffect(() => {
    // تقليل الحركة: نفس الحلقة بمدة صفرية فتقفز للقيمة النهائية بأول إطار.
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const total = reduce ? 0 : duration
    fromRef.current = shownRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = total > 0 ? Math.min(1, (now - start) / total) : 1
      const eased = 1 - Math.pow(1 - t, 4)
      const next = fromRef.current + (value - fromRef.current) * eased
      shownRef.current = next
      setShown(next)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return shown
}
