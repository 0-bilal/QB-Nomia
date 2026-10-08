import type { CSSProperties, ReactNode } from 'react'
import { haptic } from '../lib/haptics'

/**
 * مكوّنات واجهة مشتركة لهوية "Nomia Mono" — كل الشاشات الفرعية تُبنى منها بدل تكرار
 * نفس الأنماط يدويًا بكل ملف: بطاقة بطل، عنوان قسم، بحث، شرائح فلترة، صفوف قوائم،
 * حالة فارغة، بلاطات إحصائية، وشارات.
 */

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,6 9,12 15,18" />
    </svg>
  )
}

/** بطاقة البطل أعلى الشاشة — سطح مرتفع بهالة الهوية، والمحتوى فوق نسيج النقاط. */
export function HeroCard({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`qb-card-elevated qb-rise p-5 ${className}`} style={style}>
      <div className="relative">{children}</div>
    </div>
  )
}

export function HeroLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-[12.5px] font-medium text-[var(--color-text-2)]">{children}</div>
}

export function SectionTitle({ title, action, onAction, hint, className = 'mb-3' }: { title: string; action?: string; onAction?: () => void; hint?: string; className?: string }) {
  return (
    <div className={`${className} px-1`}>
      <div className="flex items-center justify-between">
        <div className="qb-section-title">{title}</div>
        {action && (
          <button onClick={onAction} className="qb-press flex items-center gap-0.5 text-[12px] font-medium text-[var(--color-accent)]">
            {action}
            <ChevronIcon />
          </button>
        )}
      </div>
      {hint && <div className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--color-text-3)]">{hint}</div>}
    </div>
  )
}

export function SearchField({ value, onChange, placeholder, className = 'mb-4' }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={`flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[var(--color-text-3)] focus-within:border-[var(--color-accent-line)] ${className}`}>
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.5" y2="16.5" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent py-3 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-3)]"
        style={{ boxShadow: 'none' }}
      />
    </label>
  )
}

/** صف شرائح فلترة/تبويب — المختارة بلون العلامة الكامل، قابلة للتمرير أفقيًا. */
export function ChipRow<T extends string>({ options, value, onChange, className = 'mb-4' }: { options: [T, string][]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`-mx-5 flex gap-2 overflow-x-auto px-5 ${className}`}>
      {options.map(([key, label]) => (
        <button
          key={key}
          onClick={() => {
            haptic('tick')
            onChange(key)
          }}
          data-active={value === key}
          className="qb-chip qb-press flex-shrink-0 whitespace-nowrap px-4 py-2 text-[13px] font-medium"
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** مفتاح تبديل مقسّم (Segmented) بمؤشر منزلق — لخيارين أو ثلاثة متساوية. */
export function Segmented<T extends string>({ options, value, onChange, color = 'var(--color-accent)', className = 'mb-5' }: { options: [T, string][]; value: T; onChange: (v: T) => void; color?: string; className?: string }) {
  const index = Math.max(0, options.findIndex(([k]) => k === value))
  return (
    <div data-own-gesture className={`relative flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 ${className}`}>
      <div
        className="absolute bottom-1 top-1 rounded-full"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          right: `calc(4px + ${index} * (100% - 8px) / ${options.length})`,
          background: color,
          transition: 'right 380ms var(--ease-spring), background 240ms ease',
        }}
      />
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          onClick={() => {
            if (k !== value) haptic('select')
            onChange(k)
          }}
          className="relative z-10 flex-1 rounded-full py-2.5 text-[13px] font-semibold"
          style={{ color: value === k ? '#0a0a0c' : 'var(--color-text-2)', transition: 'color 200ms ease' }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function ListGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`qb-card overflow-hidden ${className}`}>{children}</div>
}

/** أيقونة دائرية ملوّنة بشفافية من لونها — الشارة الموحّدة بكل الصفوف. */
export function IconBubble({ color, children, size = 44, solid = false }: { color: string; children: ReactNode; size?: number; solid?: boolean }) {
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: solid ? color : `color-mix(in srgb, ${color} 15%, transparent)`,
        color: solid ? '#0a0a0c' : color,
      }}
    >
      {children}
    </div>
  )
}

interface ListItemProps {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  /** سطر إضافي أسفل الصف بكامل العرض (شريط تقدّم، شارات...). */
  footer?: ReactNode
  onClick?: () => void
  divider?: boolean
  chevron?: boolean
  muted?: boolean
}

export function ListItem({ leading, title, subtitle, trailing, footer, onClick, divider = false, chevron = false, muted = false }: ListItemProps) {
  const body = (
    <>
      <div className="flex w-full items-center gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">{title}</div>
          {subtitle && <div className="truncate text-[11.5px] text-[var(--color-text-3)]">{subtitle}</div>}
        </div>
        {trailing && <div className="flex-shrink-0 text-left">{trailing}</div>}
        {chevron && (
          <div className="flex-shrink-0 text-[var(--color-text-3)]">
            <ChevronIcon />
          </div>
        )}
      </div>
      {footer && <div className="mt-3 w-full">{footer}</div>}
    </>
  )
  const cls = `flex w-full flex-col px-4 py-3.5 text-right ${divider ? 'border-t qb-divider' : ''} ${muted ? 'opacity-55' : ''}`
  return onClick ? (
    <button onClick={onClick} className={`${cls} active:bg-white/[0.03]`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** بلاطة إحصائية صغيرة لشبكة Bento. */
export function StatTile({ label, value, color, icon, sub, onClick, className = '' }: { label: string; value: ReactNode; color?: string; icon?: ReactNode; sub?: ReactNode; onClick?: () => void; className?: string }) {
  const inner = (
    <>
      {icon && (
        <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${color ?? 'var(--color-accent)'} 15%, transparent)`, color: color ?? 'var(--color-accent)' }}>
          {icon}
        </span>
      )}
      <div className="mb-1 text-[11.5px] text-[var(--color-text-3)]">{label}</div>
      <div className="num truncate text-[17px] font-bold" style={{ color }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-[var(--color-text-3)]">{sub}</div>}
    </>
  )
  return onClick ? (
    <button onClick={onClick} className={`qb-card qb-press p-4 text-right ${className}`}>
      {inner}
    </button>
  ) : (
    <div className={`qb-card p-4 ${className}`}>{inner}</div>
  )
}

export function Badge({ children, color = 'var(--color-text-2)', solid = false }: { children: ReactNode; color?: string; solid?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={solid ? { background: color, color: '#0a0a0c' } : { background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      {children}
    </span>
  )
}

export function ProgressBar({ pct, color = 'var(--color-accent)', height = 8, track = 'rgba(255,255,255,0.06)' }: { pct: number; color?: string; height?: number; track?: string }) {
  return (
    <div className="overflow-hidden rounded-full" style={{ height, background: track }}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color, transition: 'width 700ms var(--ease-out-expo)' }} />
    </div>
  )
}

export function EmptyState({ icon, title, desc, actionLabel, onAction }: { icon?: ReactNode; title: string; desc?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="qb-card qb-rise flex flex-col items-center px-6 py-10 text-center">
      {icon && <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">{icon}</div>}
      <div className="text-[15px] font-semibold">{title}</div>
      {desc && <div className="mt-1 max-w-[260px] text-[12.5px] leading-relaxed text-[var(--color-text-3)]">{desc}</div>}
      {actionLabel && (
        <button onClick={onAction} className="qb-btn-primary mt-5 px-6 py-2.5 text-[13px]">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

/** زر إجراء ثانوي بشكل كبسولة ملوّنة شفافة (أعطه/استلم، شحن، تأكيد...). */
export function TintButton({ children, color, onClick, className = '', disabled }: { children: ReactNode; color: string; onClick: () => void; className?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`qb-press flex items-center justify-center gap-1.5 rounded-full py-3 text-[13.5px] font-semibold disabled:opacity-40 ${className}`}
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}
    >
      {children}
    </button>
  )
}

export function PlusIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

/** زر "+" دائري بلون العلامة لخانة يسار رأس الشاشة الفرعية. */
export function HeaderAddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="qb-press flex flex-shrink-0 items-center justify-center rounded-full"
      style={{ width: 40, height: 40, background: 'var(--color-accent)', color: 'var(--color-on-accent)', boxShadow: '0 10px 24px -10px rgba(255,255,255,0.35)' }}
    >
      <PlusIcon />
    </button>
  )
}

/** حلقة تقدّم دائرية (Gauge) — للميزانيات والأهداف وعدّاد الزيت؛ المحتوى يتوسّطها. */
export function RingProgress({ pct, size = 96, stroke = 10, color = 'var(--color-accent)', children }: { pct: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="relative flex flex-shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          style={{ transition: 'stroke-dashoffset 900ms var(--ease-out-expo), stroke 300ms ease', filter: `drop-shadow(0 0 6px color-mix(in srgb, ${color} 45%, transparent))` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}
