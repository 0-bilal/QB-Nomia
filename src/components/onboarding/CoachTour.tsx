import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { haptic } from '../../lib/haptics'
import { setTourPending, useTourPending } from '../../lib/onboarding'

interface TourStep {
  target: string
  title: string
  body: string
  round?: boolean
  pad?: number
}

const STEPS: TourStep[] = [
  { target: 'balance', title: 'إجمالي رصيدك', body: 'مجموع حساباتك. اسحب على المنحنى تشوف رصيدك في أي يوم، واضغط على العنوان تختار الحسابات المحسوبة.' },
  { target: 'setup', title: 'خطوات التشغيل', body: 'البطاقة تبقى هنا لين تخلّص الخطوات، وتعرض اللي باقي لك. بعدها تختفي لحالها.' },
  { target: 'actions', title: 'سجّل بسرعة', body: 'مصروف، دخل، تحويل، أو كل حركاتك. كل شيء يحدّث الرصيد والتقارير لحاله.' },
  { target: 'plus', title: 'زر الإضافة', body: 'من أي شاشة: اضغط + واختر النوع، أو اسحب منه مباشرة للنوع اللي تبيه.', round: true, pad: 6 },
  { target: 'nav', title: 'تنقّل بسرعة', body: 'الحسابات، السلف والديون، والمزيد: فيه التقارير والفئات والمزامنة. واسحب يمين ويسار بين التبويبات.', round: true, pad: 4 },
]

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const find = (id: string) => document.querySelector<HTMLElement>(`[data-tour="${id}"]`)

/** جولة الرئيسية — مرة وحدة بعد الإعداد الأول (أو من «عن التطبيق»). */
export function CoachTour() {
  const pending = useTourPending()
  const [steps, setSteps] = useState<TourStep[]>([])
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cardH, setCardH] = useState(170)
  const card = useRef<HTMLDivElement>(null)

  // ننتظر دخول الرئيسية وحركاتها قبل ما نقيس العناصر.
  useEffect(() => {
    if (!pending) return
    const t = window.setTimeout(() => {
      setSteps(STEPS.filter((s) => find(s.target)))
      setI(0)
    }, 700)
    return () => clearTimeout(t)
  }, [pending])

  const step = steps[i]

  const measure = useCallback(() => {
    if (!step) return
    const el = find(step.target)
    if (!el) return
    const r = el.getBoundingClientRect()
    const pad = step.pad ?? 8
    setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
  }, [step])

  useEffect(() => {
    if (!step) return
    find(step.target)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const t = window.setTimeout(measure, 380)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [step, measure])

  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight)
  }, [i, rect])

  if (!pending || !step || !rect) return null

  function end() {
    setTourPending(false)
    setSteps([])
    setRect(null)
  }
  function next() {
    haptic('tick')
    if (i < steps.length - 1) setI(i + 1)
    else end()
  }

  const vh = window.innerHeight
  const below = rect.top + rect.height / 2 < vh / 2
  const cardTop = below ? Math.min(rect.top + rect.height + 14, vh - cardH - 16) : Math.max(16, rect.top - 14 - cardH)

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[90]" onClick={next}>
      <div className="qb-ob-spot" style={{ ...rect, borderRadius: step.round ? 999 : 24 }} />
      <div
        ref={card}
        role="dialog"
        aria-label={step.title}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-x-[18px] z-[91] mx-auto max-w-[440px] rounded-[22px] border border-[var(--color-border-strong)] p-3.5"
        style={{
          top: cardTop,
          background: 'rgba(28,28,33,.94)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          boxShadow: '0 20px 40px -12px #000',
          transition: 'top 600ms var(--ease-out-expo)',
        }}
      >
        <div className="text-[11px] font-semibold text-[var(--color-text-3)]">
          <span className="num">{i + 1}</span> من <span className="num">{steps.length}</span>
        </div>
        <b key={`t${i}`} className="qb-rise mt-1 block text-[15px]">
          {step.title}
        </b>
        <p key={`p${i}`} className="qb-rise mt-1 text-[12px] leading-[1.75] text-[var(--color-text-2)]">
          {step.body}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((s, j) => (
              <i key={s.target} className="h-[5px] rounded-full" style={{ width: j === i ? 14 : 5, background: j === i ? 'var(--color-accent)' : 'var(--color-surface-high)', transition: 'width 300ms var(--ease-spring)' }} />
            ))}
          </div>
          <div className="flex items-center">
            {i < steps.length - 1 && (
              <button onClick={end} className="px-2 text-[12px] font-semibold text-[var(--color-text-3)]">
                تخطي الجولة
              </button>
            )}
            <button onClick={next} className="qb-press h-9 rounded-full px-4 text-[12.5px] font-bold" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
              {i < steps.length - 1 ? 'التالي' : 'خلصنا'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
