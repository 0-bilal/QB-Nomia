import { useRef, type ReactNode } from 'react'
import { SparkLines, type SparkSeries } from '../../components/SparkLines'
import { useSparkScrub } from '../../hooks/useSparkScrub'
import { hasHistory } from '../../lib/debtHistory'
import { MONTHS_AR } from '../../lib/txFilters'
import { DEBT_META, softBg, type DebtTab } from './debtTypes'

function Svg({ size, strokeWidth = 1.9, children }: { size: number; strokeWidth?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

/** أيقونة كل نوع — نفس الأيقونة بالشريط والبطاقات والحركات. */
export function DebtKindIcon({ kind, size = 18, strokeWidth }: { kind: DebtTab; size?: number; strokeWidth?: number }) {
  switch (kind) {
    case 'overview':
      return (
        <Svg size={size} strokeWidth={strokeWidth}>
          <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
        </Svg>
      )
    case 'people':
      return (
        <Svg size={size} strokeWidth={strokeWidth}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
          <circle cx="17" cy="9" r="2.3" />
          <path d="M15.3 14.2c2.5.4 4.2 1.9 4.2 4.8" />
        </Svg>
      )
    case 'advance':
      return (
        <Svg size={size} strokeWidth={strokeWidth}>
          <rect x="2.5" y="6" width="14" height="10" rx="2" />
          <circle cx="9.5" cy="11" r="2" />
          <path d="M19 8.5 22 11.5 19 14.5" />
          <path d="M22 11.5h-5" />
        </Svg>
      )
    case 'violations':
      return (
        <Svg size={size} strokeWidth={strokeWidth}>
          <path d="M12 3.5 22 20.5H2Z" />
          <path d="M12 9.5V14" />
          <path d="M12 17h.01" />
        </Svg>
      )
    case 'stores':
      return (
        <Svg size={size} strokeWidth={strokeWidth}>
          <path d="M4 9.5 5.5 4h13L20 9.5" />
          <path d="M4 9.5h16v1a3 3 0 0 1-5.3 1.9A3 3 0 0 1 12 13.5a3 3 0 0 1-2.7-1.1A3 3 0 0 1 4 10.5Z" />
          <path d="M5.5 13v7h13v-7" />
          <path d="M10 20v-4h4v4" />
        </Svg>
      )
  }
}

/** مربع أيقونة النوع بخلفية بلونه. */
export function DebtKindBubble({ kind, size = 40, iconSize, muted = false }: { kind: DebtTab; size?: number; iconSize?: number; muted?: boolean }) {
  const color = DEBT_META[kind].color
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.35,
        background: muted ? 'var(--color-surface-high)' : softBg(color),
        color: muted ? 'var(--color-text-3)' : color,
      }}
    >
      <DebtKindIcon kind={kind} size={iconSize ?? Math.round(size * 0.46)} />
    </span>
  )
}

/** شارة صغيرة باسم النوع ولونه — على حركات "آخر الحركات" المختلطة. */
export function DebtKindTag({ kind }: { kind: DebtTab }) {
  const { color, label } = DEBT_META[kind]
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: softBg(color), color }}>
      <DebtKindIcon kind={kind} size={10} strokeWidth={2.2} />
      {label}
    </span>
  )
}

export interface HeroSpark {
  /** القيمة المختارة بالسحب (null = الآن). */
  scrub: number | null
  /** عنصر السبارك — يوضع في مكانه داخل البطاقة، أو null لو ما فيه سجل. */
  chart: ReactNode
}

/**
 * بطاقة "بطل" بتوهّج خافت بلون النوع — رأس كل تبويب.
 * مع `series` يظهر سبارك خلف الأرقام (يمتد لحافتي البطاقة)، والسحب الأفقي على البطاقة يختار أسبوعًا.
 */
export function DebtHero({
  color,
  children,
  className = '',
  series,
  dates,
  chartHeight = 64,
}: {
  color: string
  children: ReactNode | ((spark: HeroSpark) => ReactNode)
  className?: string
  series?: SparkSeries[]
  dates?: string[]
  chartHeight?: number
}) {
  const axisRef = useRef<HTMLDivElement>(null)
  const enabled = !!series && series.length > 0 && hasHistory(...series.map((s) => s.values))
  const { scrub, handlers } = useSparkScrub(enabled ? series[0].values.length : 0, axisRef)
  const chart = enabled ? (
    <div ref={axisRef} className="relative -ml-[18px] -mr-1" style={{ height: chartHeight }}>
      <SparkLines series={series} scrub={scrub} />
      {scrub !== null && dates?.[scrub] && (
        // تاريخ الأسبوع المختار — داخل منطقة الرسم حتى لا يتحرك شيء أثناء السحب.
        <span
          className="num absolute bottom-0 left-[18px] rounded-full border border-[var(--color-border)] bg-[rgba(10,10,12,0.75)] px-2.5 py-0.5 text-[10.5px] text-[var(--color-text-2)]"
          style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
        >
          {sparkDateLabel(dates[scrub])}
        </span>
      )}
    </div>
  ) : null
  return (
    <div className={`qb-card-elevated qb-rise select-none p-[18px] ${className}`} data-own-gesture={enabled || undefined} style={{ touchAction: 'pan-y' }} {...(enabled ? handlers : {})}>
      <span
        className="pointer-events-none absolute rounded-full"
        style={{ top: '-40%', left: 'auto', right: '-30%', width: 220, height: 220, background: color, filter: 'blur(60px)', opacity: 0.16 }}
        aria-hidden="true"
      />
      <div className="relative">{typeof children === 'function' ? children({ scrub, chart }) : children}</div>
    </div>
  )
}

/** «26 يونيو» لشارة الأسبوع المختار. */
function sparkDateLabel(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS_AR[Number(iso.slice(5, 7)) - 1]}`
}

/** ظل نص للأرقام فوق السبارك حتى تبقى مقروءة. */
export const NUM_SHADOW = '0 2px 14px rgba(5,5,6,0.9)'

export function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mx-1.5 mb-2.5 mt-6 flex items-baseline justify-between gap-2">
      <div className="text-[14px] font-semibold">{title}</div>
      {hint && <div className="truncate text-[11px] text-[var(--color-text-3)]">{hint}</div>}
    </div>
  )
}
