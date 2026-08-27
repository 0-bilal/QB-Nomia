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
 * رأس صفحة موحّد لكل الشاشات الفرعية: زر رجوع دائري بدل نص مجرّد،
 * عنوان في المنتصف، وخانة يمين اختيارية (زر إجراء أو نفس عرض زر الرجوع
 * للحفاظ على توسيط العنوان).
 */
export function ScreenHeader({ title, onBack, cancelLabel, right, className = 'pt-8 pb-5' }: ScreenHeaderProps) {
  return (
    <div className={`safe-top flex items-center justify-between px-5 ${className}`}>
      {onBack ? (
        cancelLabel ? (
          <button onClick={onBack} className="qb-press text-[13.5px] font-semibold text-[var(--color-text-2)]">
            {cancelLabel}
          </button>
        ) : (
          <button
            onClick={onBack}
            aria-label="رجوع"
            className="qb-press flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
            style={{ width: 38, height: 38 }}
          >
            <ChevronBackIcon />
          </button>
        )
      ) : (
        <div className="w-9.5" style={{ width: 38 }} />
      )}

      <div className="truncate text-[15px] font-bold">{title}</div>

      {right ?? <div className="w-9.5" style={{ width: 38 }} />}
    </div>
  )
}
