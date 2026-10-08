import type { ReactNode } from 'react'

interface ToggleRowProps {
  icon: ReactNode
  label: string
  desc: string
  enabled: boolean
  onToggle: () => void
  busy?: boolean
  errorMsg?: string
  className?: string
}

/** صف بطاقة بمفتاح تبديل (Toggle) — نمط مشترك مستخرج من BiometricToggleRow، يُستخدم لأي إعداد on/off بنفس الهوية (البصمة، إخفاء الأرصدة...). */
export function ToggleRow({ icon, label, desc, enabled, onToggle, busy, errorMsg, className = 'mb-3.5' }: ToggleRowProps) {
  return (
    <div className={`qb-card p-4 ${className}`}>
      <button type="button" onClick={onToggle} disabled={busy} className="qb-press flex w-full items-center justify-between text-right disabled:opacity-60">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-full"
            style={{ width: 38, height: 38, background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-medium">{label}</div>
            <div className="text-[11.5px] leading-relaxed text-[var(--color-text-3)]">{desc}</div>
          </div>
        </div>
        <div
          className="flex h-[30px] w-[52px] flex-shrink-0 items-center rounded-full p-[3px] transition-colors duration-300"
          style={{ background: enabled ? 'var(--color-accent)' : 'rgba(255,255,255,0.14)' }}
        >
          <div
            className="h-6 w-6 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-300"
            style={{ background: enabled ? '#0A0A0C' : '#fff', transform: enabled ? 'translateX(-22px)' : 'translateX(0)' }}
          />
        </div>
      </button>
      {errorMsg && <div className="mt-2.5 text-[11px] font-semibold" style={{ color: 'var(--color-expense)' }}>{errorMsg}</div>}
    </div>
  )
}
