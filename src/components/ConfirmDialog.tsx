import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  cancelLabel?: string
  color?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'إلغاء',
  color = 'var(--color-accent)',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[6px]"
        style={{ animation: 'fade-in 180ms ease-out both' }}
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-[330px] rounded-[32px] border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] p-6 text-center shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9)]"
        style={{ animation: 'qb-pop 340ms var(--ease-spring) both' }}
      >
        <div className="mb-2 text-[17px] font-semibold">{title}</div>
        <div className="mb-6 text-[13px] leading-relaxed text-[var(--color-text-2)]">{message}</div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="qb-press flex-1 rounded-full bg-white/[0.06] py-3 text-[13.5px] font-medium text-[var(--color-text)]"
          >
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="qb-press flex-1 rounded-full py-3 text-[13.5px] font-semibold text-[#0A0A0C]" style={{ background: color, boxShadow: `0 12px 26px -12px ${color}` }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
