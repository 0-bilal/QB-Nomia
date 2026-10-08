import { useEffect, useState } from 'react'
import { useData } from '../state/DataContext'
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
  const data = useData()

  useEffect(() => subscribeUndoToast(setState), [])

  if (!state) return null

  return (
    <div dir="rtl" className="pointer-events-none fixed inset-x-0 bottom-28 z-[80] flex justify-center px-5">
      <div
        className="pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-full border border-[var(--color-border-strong)] py-2 pe-2 ps-5 shadow-[0_20px_44px_-12px_rgba(0,0,0,0.9)]"
        style={{ animation: 'toast-in 360ms var(--ease-spring) both', background: 'rgba(30,30,36,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        <div className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[var(--color-text)]">{state.message}</div>
        <button
          onClick={() => triggerUndo(data)}
          className="qb-press flex-shrink-0 rounded-full px-4 py-2 text-[12.5px] font-semibold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
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
