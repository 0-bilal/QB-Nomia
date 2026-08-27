import type { ReactNode } from 'react'

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,6 9,12 15,18" />
    </svg>
  )
}

interface PickerFieldProps {
  label: string
  icon: ReactNode
  iconColor: string
  iconBg: string
  title: string
  subtitle?: string
  trailing?: ReactNode
  placeholder?: boolean
  onClick: () => void
}

/** حقل نموذج قابل للنقر بشكل صف (أيقونة + عنوان/قيمة + محتوى ذيلي) يفتح Sheet اختيار — بديل موحّد لقوائم الأزرار الدائرية المتفرقة. */
export function PickerField({ label, icon, iconColor, iconBg, title, subtitle, trailing, placeholder, onClick }: PickerFieldProps) {
  return (
    <button type="button" onClick={onClick} className="qb-card qb-press flex w-full items-center gap-3 px-4 py-3 text-right">
      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
        style={{ width: 44, height: 44, background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[11px] font-semibold text-[var(--color-text-2)]">{label}</div>
        <div className={`truncate text-[14px] font-bold ${placeholder ? 'text-[var(--color-text-3)]' : ''}`}>{title}</div>
        {subtitle && <div className="truncate text-[11px] text-[var(--color-text-3)]">{subtitle}</div>}
      </div>
      {trailing && <div className="flex-shrink-0">{trailing}</div>}
      <div className="flex-shrink-0 text-[var(--color-text-3)]">
        <ChevronIcon />
      </div>
    </button>
  )
}
