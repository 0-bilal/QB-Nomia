import { useEffect, useState } from 'react'
import { dismissUndoToast, subscribeUndoToast, triggerUndo, type UndoToastState } from '../lib/undoToast'

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function UndoToastHost() {
  const [state, setState] = useState<UndoToastState | null>(null)

  useEffect(() => subscribeUndoToast(setState), [])

  if (!state) return null

  return (
    <div dir="rtl" className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-5">
      <div
        className="pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-3 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)]"
        style={{ animation: 'toast-in 220ms cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <div className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[var(--color-text)]">{state.message}</div>
        <button
          onClick={() => triggerUndo()}
          className="qb-press flex-shrink-0 rounded-full px-3.5 py-1.75 text-[12px] font-bold"
          style={{ background: 'var(--color-accent)', color: '#0A0A0C' }}
        >
          تراجع
        </button>
        <button
          onClick={() => dismissUndoToast()}
          aria-label="إغلاق"
          className="qb-press flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-text-3)]"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}
