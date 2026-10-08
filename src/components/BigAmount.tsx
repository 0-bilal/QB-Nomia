import { useCountUp } from '../hooks/useCountUp'

interface BigAmountProps {
  value: number
  hidden?: boolean
  /** حجم الجزء الصحيح بالبكسل — الكسور والعملة تتناسب معه. */
  size?: number
  color?: string
  animate?: boolean
  className?: string
}

/**
 * رقم مالي بطل بنمط تطبيقات البنوك 2026: الجزء الصحيح كبير وعريض، والهللات
 * والعملة أصغر وأخفت بجانبه — بدل سطر واحد بنفس الحجم.
 */
export function BigAmount({ value, hidden = false, size = 40, color, animate = true, className = '' }: BigAmountProps) {
  const animated = useCountUp(value)
  const v = animate ? animated : value
  const negative = v < 0
  const abs = Math.abs(Math.round(v * 100) / 100)
  const whole = Math.floor(abs).toLocaleString('en-US')
  const cents = Math.round((abs - Math.floor(abs)) * 100)

  return (
    <div dir="ltr" className={`num inline-flex items-baseline font-bold leading-none ${className}`} style={{ color }}>
      {hidden ? (
        <span style={{ fontSize: size, letterSpacing: '0.08em' }}>••••••</span>
      ) : (
        <>
          {negative && <span style={{ fontSize: size * 0.8, marginInlineEnd: 2 }}>−</span>}
          <span style={{ fontSize: size, letterSpacing: '-0.035em' }}>{whole}</span>
          <span style={{ fontSize: size * 0.48, opacity: 0.5, marginInlineStart: 1 }}>.{String(cents).padStart(2, '0')}</span>
        </>
      )}
      <span className="font-sans" style={{ fontSize: Math.max(12, size * 0.34), opacity: 0.55, marginInlineStart: size * 0.18, fontWeight: 500 }}>
        ر.س
      </span>
    </div>
  )
}
