import type { ReactNode } from 'react'

/**
 * رأس التبويبات الرئيسية (الحسابات/السلف/المزيد) بنمط "العنوان الكبير" لتطبيقات 2026:
 * عنوان عريض + سطر فرعي خافت، وأزرار إجراء زجاجية بالطرف المقابل — يلتصق أعلى الشاشة
 * أثناء التمرير بخلفية متلاشية (qb-sticky-header-row).
 */
export function TabHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="safe-top qb-sticky-header-row mb-5 flex items-end justify-between gap-3 pb-1 pt-12">
      <div className="min-w-0">
        <h1 className="truncate text-[30px] font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle && <div className="mt-0.5 truncate text-[12.5px] text-[var(--color-text-3)]">{subtitle}</div>}
      </div>
      {actions && <div className="mb-1 flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

/** زر إجراء دائري زجاجي لرأس التبويب — نفس مقاس زر العين والجرس. */
export function HeaderIconButton({ onClick, label, children, accent = false }: { onClick: () => void; label: string; children: ReactNode; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`qb-press flex items-center justify-center rounded-full ${accent ? '' : 'qb-glass-circle border'}`}
      style={
        accent
          ? { width: 40, height: 40, background: 'var(--color-accent)', color: 'var(--color-on-accent)', boxShadow: '0 10px 24px -10px rgba(255,255,255,0.35)' }
          : { width: 40, height: 40, color: 'var(--color-text)' }
      }
    >
      {children}
    </button>
  )
}

export function PlusGlyph({ size = 19 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
