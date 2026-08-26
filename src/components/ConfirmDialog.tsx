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
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
        style={{ animation: 'fade-in 180ms ease-out both' }}
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-[320px] rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 text-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]"
        style={{ animation: 'speed-dial-in 200ms ease-out both' }}
      >
        <div className="mb-1.5 text-[15px] font-bold">{title}</div>
        <div className="mb-5 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">{message}</div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-[var(--color-border)] py-2.75 text-[13px] font-semibold text-[var(--color-text-2)]"
          >
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-2xl py-2.75 text-[13px] font-bold text-[#04140D]" style={{ background: color }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
