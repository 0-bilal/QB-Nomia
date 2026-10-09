import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { formatAmount } from '../lib/format'
import { haptic } from '../lib/haptics'
import { MONTHS_AR } from '../lib/txFilters'
import { useCountUp } from '../hooks/useCountUp'
import { categoryColor } from '../lib/categoryStats'
import type { CategoryShare, MonthFlow } from '../lib/monthFlow'
import type { Category } from '../types'
import { CategoryIconBox } from './CategoryVisual'

const INCOME = 'var(--color-income)'
const EXPENSE = 'var(--color-expense)'
const RIGHT_PAD = 14
const CHART_PAD = 6

/** مبلغ بعدّاد تصاعدي عند الظهور، والعملة بجانبه بخط أصغر. أثناء التمرير على السبارك يتغيّر فورًا. */
function Amount({ value, hidden, instant, size, color }: { value: number; hidden: boolean; instant: boolean; size: number; color?: string }) {
  const counted = useCountUp(value, 1000)
  const v = instant || Math.abs(counted - value) < 0.005 ? value : Math.round(counted)
  return (
    <div className="num font-bold leading-tight" style={{ fontSize: size, color, textShadow: '0 2px 12px rgba(5,5,6,0.9)' }}>
      {hidden ? '•••••' : formatAmount(v)}
      <span className="font-sans text-[0.6em] font-medium text-[var(--color-text-3)]" style={{ marginInlineStart: 4 }}>
        ر.س
      </span>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-3)]">
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: color }} />
      {label}
    </div>
  )
}

function Column({ value, max, color, delay }: { value: number; max: number; color: string; delay: number }) {
  return (
    <div className="flex h-[96px] w-[30px] items-end overflow-hidden rounded-[10px] bg-white/[0.04]">
      <div
        className="qb-col-grow w-full rounded-[10px]"
        style={{
          height: `${max > 0 ? Math.max(value > 0 ? 4 : 0, (value / max) * 100) : 0}%`,
          background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 55%, transparent))`,
          animationDelay: `${delay}ms`,
        }}
      />
    </div>
  )
}

/**
 * «تدفّق هذا الشهر»: عمودان للدخل والمصروف + الأرقام، وخلف البطاقة سبارك بخطّين تراكميين (أخضر للدخل، أحمر للمصروف)
 * من أول الشهر لليوم. السحب الأفقي على البطاقة يختار يومًا فتتغيّر الأرقام والأعمدة والصافي لذلك اليوم.
 */
export function MonthFlowCard({ flow, hidden, monthIndex }: { flow: MonthFlow; hidden: boolean; monthIndex: number }) {
  const n = flow.income.length
  const [scrub, setScrub] = useState<number | null>(null)
  const i = scrub ?? n - 1
  const income = flow.income[i] ?? 0
  const expense = flow.expense[i] ?? 0
  const net = income - expense
  const colMax = Math.max(income, expense)

  const chartRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, x: 0, scrubbing: false })

  function indexAt(clientX: number): number {
    const r = chartRef.current!.getBoundingClientRect()
    const idx = Math.round(((clientX - r.left) / Math.max(1, r.width - RIGHT_PAD)) * (n - 1))
    return Math.max(0, Math.min(n - 1, idx))
  }
  function pick(idx: number | null) {
    setScrub((prev) => {
      if (idx !== null && idx !== prev) haptic('select')
      return idx
    })
  }
  function onDown(e: ReactPointerEvent) {
    drag.current = { active: true, x: e.clientX, scrubbing: false }
  }
  function onMove(e: ReactPointerEvent) {
    if (n < 2) return
    if (e.pointerType === 'mouse' && !drag.current.active) return pick(indexAt(e.clientX))
    const d = drag.current
    if (!d.active) return
    // يبدأ الاختيار بعد سحب أفقي واضح — حتى يبقى التمرير العمودي للشاشة طبيعيًا.
    if (!d.scrubbing) {
      if (Math.abs(e.clientX - d.x) < 6) return
      d.scrubbing = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    pick(indexAt(e.clientX))
  }
  function onEnd() {
    drag.current.active = false
    drag.current.scrubbing = false
    setScrub(null)
  }

  const netColor = net < 0 ? EXPENSE : INCOME
  return (
    <div
      data-own-gesture
      data-month-flow
      className="relative select-none overflow-hidden rounded-[22px] border border-[var(--color-border)]"
      style={{
        background: 'radial-gradient(90% 70% at 100% 0%, rgba(255,255,255,0.06), transparent 60%), linear-gradient(165deg, var(--color-surface-elevated), var(--color-bg))',
        touchAction: 'pan-y',
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onEnd}
      onPointerCancel={onEnd}
      onPointerLeave={onEnd}
    >
      {/* السبارك ينتهي قبل العمودين مباشرة: نقطة «اليوم» تلتقي بالعمودين اللي يمثّلان قيمة اليوم. */}
      <div ref={chartRef} className="pointer-events-none absolute left-0 right-[92px] top-[52px] bottom-[50px]">
        {n > 1 && <FlowSpark flow={flow} scrub={scrub} />}
      </div>
      {/* تعتيم بيضاوي خلف الأرقام فقط حتى تبقى مقروءة فوق الخطوط */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(34% 42% at 62% 46%, rgba(18,18,21,0.82), rgba(18,18,21,0.4) 60%, transparent 100%)' }} />

      <div className="pointer-events-none relative px-4 pt-4">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="text-[13px] font-medium text-[var(--color-text-2)]">تدفّق هذا الشهر</div>
          <div className="text-[11px] text-[var(--color-text-3)]">دخل مقابل مصروف</div>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex items-end gap-2">
            <Column value={income} max={colMax} color={INCOME} delay={120} />
            <Column value={expense} max={colMax} color={EXPENSE} delay={200} />
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <Legend color={INCOME} label="الدخل" />
              <Amount value={income} hidden={hidden} instant={scrub !== null} size={20} color={INCOME} />
            </div>
            <div>
              <Legend color={EXPENSE} label="المصروف" />
              <Amount value={expense} hidden={hidden} instant={scrub !== null} size={20} color={EXPENSE} />
            </div>
          </div>
        </div>
        <div className="h-[22px]" />
      </div>

      <div
        className="pointer-events-none relative flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2.5"
        style={{ background: 'rgba(10,10,12,0.7)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      >
        <div className="text-[12px] text-[var(--color-text-3)]">
          {scrub === null ? (
            'الصافي حتى اليوم'
          ) : (
            <>
              الصافي حتى <span className="num">{scrub + 1}</span> {MONTHS_AR[monthIndex]}
            </>
          )}
        </div>
        <div className="num text-[15px] font-bold" style={{ color: netColor, transition: 'color 200ms' }}>
          {hidden ? (
            '•••••'
          ) : (
            <span dir="ltr">
              {net > 0 ? '+' : net < 0 ? '−' : ''}
              {formatAmount(Math.abs(net))}
            </span>
          )}
          <span className="font-sans text-[0.62em] font-medium text-[var(--color-text-3)]" style={{ marginInlineStart: 4 }}>
            ر.س
          </span>
        </div>
      </div>
    </div>
  )
}

/** الخطّان التراكميان: الزمن من اليسار (أول الشهر) لليمين (اليوم)، بمقياس مشترك. */
function FlowSpark({ flow, scrub }: { flow: MonthFlow; scrub: number | null }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const incRef = useRef<SVGPathElement>(null)
  const expRef = useRef<SVGPathElement>(null)
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

  const n = flow.income.length
  const { w, h } = size
  const top = Math.max(1, ...flow.income, ...flow.expense) * 1.08
  const x = (i: number) => (i / (n - 1)) * w
  const y = (v: number) => h - CHART_PAD - (v / top) * (h - CHART_PAD * 2)
  const pathOf = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const incPath = pathOf(flow.income)
  const expPath = pathOf(flow.expense)
  const key = `${n}-${flow.income[n - 1]}-${flow.expense[n - 1]}-${w}`

  // رسم الخطّين بالتتابع: الدخل ثم المصروف بعده بلحظة.
  useEffect(() => {
    if (!w) return
    ;[incRef.current, expRef.current].forEach((line, k) => {
      if (!line) return
      const len = line.getTotalLength()
      line.style.strokeDasharray = `${len}`
      line.style.setProperty('--qb-len', `${len}`)
      line.style.animation = 'none'
      void line.getBoundingClientRect()
      line.style.animation = `qb-line-draw 1.3s cubic-bezier(0.22,1,0.36,1) ${250 + k * 160}ms both`
    })
  }, [key, w])

  const dot = (vals: number[], idx: number, color: string, pulse: boolean, delay: number) => (
    <g key={`${color}-${idx}-${pulse}`} style={{ animation: pulse ? `qb-pop 500ms var(--ease-spring) ${delay}ms both` : undefined, transformOrigin: `${x(idx)}px ${y(vals[idx])}px` }}>
      {pulse && <circle cx={x(idx)} cy={y(vals[idx])} r={4} fill={color} opacity={0.5} style={{ animation: `qb-dot-pulse 1.8s ease-out ${delay + 400}ms infinite` }} />}
      <circle cx={x(idx)} cy={y(vals[idx])} r={pulse ? 3.5 : 4.5} fill={pulse ? color : '#fff'} stroke={pulse ? 'var(--color-bg)' : color} strokeWidth={pulse ? 2 : 2.5} />
    </g>
  )

  return (
    <div ref={boxRef} className="absolute inset-0" aria-hidden="true">
      {w > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 overflow-visible">
          <defs>
            <linearGradient id="qb-flow-inc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(62,224,143,0.2)" />
              <stop offset="1" stopColor="rgba(62,224,143,0)" />
            </linearGradient>
            <linearGradient id="qb-flow-exp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(255,95,109,0.2)" />
              <stop offset="1" stopColor="rgba(255,95,109,0)" />
            </linearGradient>
          </defs>
          <path key={`ai-${key}`} d={`${incPath}L${w},${h}L0,${h}Z`} fill="url(#qb-flow-inc)" style={{ animation: 'fade-in 900ms 700ms both' }} />
          <path key={`ae-${key}`} d={`${expPath}L${w},${h}L0,${h}Z`} fill="url(#qb-flow-exp)" style={{ animation: 'fade-in 900ms 850ms both' }} />
          <path ref={incRef} d={incPath} fill="none" stroke={INCOME} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path ref={expRef} d={expPath} fill="none" stroke={EXPENSE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {scrub === null ? (
            <>
              {dot(flow.income, n - 1, INCOME, true, 1300)}
              {dot(flow.expense, n - 1, EXPENSE, true, 1450)}
            </>
          ) : (
            <>
              <line x1={x(scrub)} x2={x(scrub)} y1={-8} y2={h + 8} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
              {dot(flow.income, scrub, INCOME, false, 0)}
              {dot(flow.expense, scrub, EXPENSE, false, 0)}
            </>
          )}
        </svg>
      )}
    </div>
  )
}

/** بلاطة مضغوطة: الأيقونة بجانب الرقم، وسطر صغير تحتها بموعد الدفعة القادمة. */
export function SummaryTile({
  color,
  icon,
  label,
  value,
  footer,
  onClick,
  wide,
  style,
}: {
  color: string
  icon: ReactNode
  label: string
  value: ReactNode
  footer: ReactNode
  onClick: () => void
  wide?: boolean
  style?: CSSProperties
}) {
  return (
    <button onClick={onClick} className={`qb-card qb-press p-3.5 text-right ${wide ? 'col-span-2' : ''}`} style={style}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[13px]" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[11.5px] text-[var(--color-text-3)]">{label}</div>
          <div className="num text-[17px] font-bold leading-tight">{value}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--color-text-3)]">
        <span style={{ color }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </span>
        <span className="truncate">{footer}</span>
      </div>
    </button>
  )
}

const RING_R = 26
const RING_C = 2 * Math.PI * RING_R

function OtherIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M6 12h.01M12 12h.01M18 12h.01" />
    </svg>
  )
}

/** «أين ذهبت أموالك» كحلقات: كل فئة أيقونتها داخل حلقة تمتلئ بنسبتها من مصروف الشهر. */
export function CategoryRings({ rows, hidden }: { rows: CategoryShare<Category & { spent: number }>[]; hidden: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-4">
      {rows.map((r, i) => {
        const color = r.item ? categoryColor(r.item) : 'var(--color-text-3)'
        const pct = Math.round(r.share * 100)
        return (
          <div key={r.item?.id ?? 'other'} className="qb-rise flex flex-col items-center gap-1.5" style={{ '--i': i } as CSSProperties}>
            <div className="relative h-16 w-16">
              <svg width="64" height="64" viewBox="0 0 64 64" className="absolute inset-0" style={{ transform: 'rotate(-90deg) scaleY(-1)' }}>
                <circle cx="32" cy="32" r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4.5" />
                <circle
                  cx="32"
                  cy="32"
                  r={RING_R}
                  fill="none"
                  stroke={color}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(2, RING_C * r.share)} ${RING_C}`}
                  className="qb-ring-fill"
                  style={{ '--qb-ring-len': `${Math.max(2, RING_C * r.share)}`, animationDelay: `${180 + i * 70}ms` } as CSSProperties}
                />
              </svg>
              <div className="absolute inset-[11px] flex items-center justify-center">
                {r.item ? (
                  <CategoryIconBox category={r.item} size={42} iconSize={18} radius={21} />
                ) : (
                  <span className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/[0.06] text-[var(--color-text-3)]">
                    <OtherIcon />
                  </span>
                )}
              </div>
            </div>
            <div className="max-w-full truncate text-[12px] font-semibold" style={{ color: r.item ? 'var(--color-text)' : 'var(--color-text-2)' }}>
              {r.item?.name ?? 'أخرى'}{' '}
              <span dir="ltr" className="num text-[11px] font-normal text-[var(--color-text-3)]">
                {pct}%
              </span>
            </div>
            <div className="num -mt-1 text-[12.5px] font-semibold text-[var(--color-text-2)]">
              {hidden ? '•••' : formatAmount(r.spent)}
              <span className="font-sans text-[0.75em] font-medium text-[var(--color-text-3)]" style={{ marginInlineStart: 3 }}>
                ر.س
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
