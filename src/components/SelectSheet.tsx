import type { ReactNode } from 'react'

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5,13 10,18 19,6" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export interface SelectSheetItem {
  id: string
  icon: ReactNode
  iconColor: string
  iconBg: string
  title: string
  subtitle?: string
  trailing?: ReactNode
}

interface SelectSheetProps {
  open: boolean
  title: string
  items: SelectSheetItem[]
  selectedId?: string
  onSelect: (id: string) => void
  onClose: () => void
  emptyLabel?: string
  footer?: ReactNode
}

/** Sheet سفلي موحّد لاختيار عنصر من قائمة (حساب، فئة، مصدر دخل...) — يفتح من الأسفل بدل قوائم Pill المتفرقة، بهوية أقرب لتطبيقات البنوك. */
export function SelectSheet({ open, title, items, selectedId, onSelect, onClose, emptyLabel, footer }: SelectSheetProps) {
  if (!open) return null

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        style={{ animation: 'fade-in 180ms ease-out both' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        data-testid="select-sheet"
        className="relative flex max-h-[75vh] w-full max-w-[480px] flex-col rounded-t-[28px] border-x border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 260ms cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <div className="mx-auto mb-1 mt-2.5 h-1 w-9 flex-shrink-0 rounded-full bg-white/15" />

        <div className="flex flex-shrink-0 items-center justify-between px-5 py-3">
          <div className="text-[15px] font-bold">{title}</div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="qb-press flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-2)]"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {items.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--color-text-3)]">{emptyLabel ?? 'لا توجد عناصر'}</div>
          ) : (
            <div className="flex flex-col gap-2 pb-2">
              {items.map((item) => {
                const selected = item.id === selectedId
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className="qb-press flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-right"
                    style={
                      selected
                        ? { borderColor: item.iconColor, background: `${item.iconColor}14` }
                        : { borderColor: 'var(--color-border)', background: 'var(--color-surface)' }
                    }
                  >
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px]"
                      style={{ width: 40, height: 40, background: item.iconBg, color: item.iconColor }}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold">{item.title}</div>
                      {item.subtitle && <div className="truncate text-[11px] text-[var(--color-text-3)]">{item.subtitle}</div>}
                    </div>
                    {item.trailing && <div className="flex-shrink-0 text-[12.5px]">{item.trailing}</div>}
                    {selected && (
                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ background: item.iconColor, color: '#0A0A0C' }}>
                        <CheckIcon />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          {footer}
        </div>
        <div className="safe-bottom flex-shrink-0" />
      </div>
    </div>
  )
}
