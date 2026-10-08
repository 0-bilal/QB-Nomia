import type { ReactNode } from 'react'

function ChevronBackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9,5 16,12 9,19" />
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
 * رأس صفحة موحّد لكل الشاشات الفرعية بهوية 2026: زر رجوع دائري زجاجي، وعنوان
 * عريض بلا كبسولة بجانبه، وخانة إجراء اختيارية بالطرف المقابل. اسحب من حافة
 * الشاشة اليمنى للرجوع (ScreenScroll) كبديل للزر.
 */
export function ScreenHeader({ title, onBack, cancelLabel, right, className = 'pt-8 pb-5' }: ScreenHeaderProps) {
  return (
    <div className={`safe-top relative z-10 flex items-center justify-between gap-3 px-5 ${className}`}>
      <div className="flex min-w-0 items-center gap-3">
        {onBack &&
          (cancelLabel ? (
            <button
              onClick={onBack}
              className="qb-glass-circle qb-press flex h-10 flex-shrink-0 items-center justify-center rounded-full border px-4 text-[13.5px] font-medium text-[var(--color-text-2)]"
            >
              {cancelLabel}
            </button>
          ) : (
            <button
              onClick={onBack}
              aria-label="رجوع"
              className="qb-glass-circle qb-press flex flex-shrink-0 items-center justify-center rounded-full border text-[var(--color-text)]"
              style={{ width: 40, height: 40 }}
            >
              <ChevronBackIcon />
            </button>
          ))}

        <h1 className="min-w-0 truncate text-[21px] font-semibold tracking-tight">{title}</h1>
      </div>

      {right}
    </div>
  )
}
