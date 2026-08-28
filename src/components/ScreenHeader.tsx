import type { ReactNode } from 'react'

function ChevronBackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,5 8,12 15,19" />
    </svg>
  )
}

interface ScreenHeaderProps {
  title: string
  onBack?: () => void
  /** نص بدل الأيقونة الدائرية (لشاشات الإضافة اللي تتصرف كـ modal — "إلغاء" بدل "رجوع"). */
  cancelLabel?: string
  right?: ReactNode
  className?: string
}

/**
 * رأس صفحة موحّد لكل الشاشات الفرعية: زر رجوع/إلغاء دائري زجاجي ملاصق
 * لاسم الشاشة — نفس كبسولة العنوان الزجاجية المستخدمة بالشاشات الرئيسية
 * الأربع (الرئيسية/الحسابات/السلف/المزيد) وبنفس ارتفاع الأزرار — كمجموعة
 * واحدة على يمين الشاشة، وخانة يمين اختيارية (زر إجراء) على اليسار وحدها.
 */
export function ScreenHeader({ title, onBack, cancelLabel, right, className = 'pt-8 pb-5' }: ScreenHeaderProps) {
  return (
    <div className={`safe-top flex items-center justify-between px-5 ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        {onBack &&
          (cancelLabel ? (
            <button
              onClick={onBack}
              className="qb-glass-circle qb-press flex h-9.5 flex-shrink-0 items-center justify-center rounded-full border px-4 text-[13.5px] font-semibold text-[var(--color-text-2)]"
            >
              {cancelLabel}
            </button>
          ) : (
            <button
              onClick={onBack}
              aria-label="رجوع"
              className="qb-glass-circle qb-press flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-full border text-[var(--color-text)]"
              style={{ width: 38, height: 38 }}
            >
              <ChevronBackIcon />
            </button>
          ))}

        <div className="qb-glass-circle flex h-9.5 min-w-0 items-center truncate rounded-full border px-4 text-[15px] font-bold">{title}</div>
      </div>

      {right}
    </div>
  )
}
