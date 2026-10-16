import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** عناصر مشتركة لشاشات الإعداد الأول (الترحيب، جهّز محفظتك، معالج النسخة). */

export function ObIcon({ size = 18, width = 2, children }: { size?: number; width?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export function CheckIcon({ size = 13 }: { size?: number }) {
  return (
    <ObIcon size={size} width={3}>
      <path d="M5 12l5 5L20 7" />
    </ObIcon>
  )
}

/** زر أبيض بعرض كامل (54px، حواف 18). */
export function ObPrimary({ className = '', small = false, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { small?: boolean }) {
  return (
    <button
      {...rest}
      className={`qb-press flex w-full items-center justify-center gap-2 font-bold disabled:pointer-events-none disabled:opacity-35 ${small ? 'h-11 rounded-[15px] text-[13.5px]' : 'h-[54px] rounded-[18px] text-[15px]'} ${className}`}
      style={{ background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent-b))', color: 'var(--color-on-accent)', ...rest.style }}
    />
  )
}

export function ObGhost({ className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`qb-press flex h-11 items-center justify-center gap-2 rounded-[15px] border border-[var(--color-border-strong)] bg-white/[0.05] text-[13.5px] font-semibold disabled:opacity-35 ${className}`}
    />
  )
}

export function ObLink({ className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={`w-full py-3.5 text-[13px] font-semibold text-[var(--color-text-3)] ${className}`} />
}

/** تنبيه بلون الاشتراكات (تحذير) أو محايد. */
export function ObNote({ tone = 'neutral', icon, children }: { tone?: 'warn' | 'neutral'; icon: ReactNode; children: ReactNode }) {
  const warn = tone === 'warn'
  return (
    <div
      className="mt-3 flex gap-2.5 rounded-[18px] border p-3 text-[11.5px] leading-[1.75] text-[var(--color-text-2)]"
      style={
        warn
          ? { background: 'color-mix(in srgb, var(--color-subscription) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--color-subscription) 32%, transparent)' }
          : { background: 'rgba(255,255,255,.04)', borderColor: 'var(--color-border-strong)' }
      }
    >
      <span className="mt-0.5 flex-none" style={{ color: warn ? 'var(--color-subscription)' : 'var(--color-text-2)' }}>
        {icon}
      </span>
      <span>{children}</span>
    </div>
  )
}

/** حلقة التقدّم (جهّز محفظتك والبطاقة بالرئيسية). */
export function ProgressRing({ done, total, size = 70, stroke = 6 }: { done: number; total: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2 - 1
  const len = 2 * Math.PI * r
  const complete = total > 0 && done >= total
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="var(--color-surface-high)" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={complete ? 'var(--color-income)' : 'var(--color-accent)'}
          strokeDasharray={len}
          strokeDashoffset={len * (1 - (total ? done / total : 0))}
          style={{ transition: 'stroke-dashoffset 900ms var(--ease-spring), stroke 300ms' }}
        />
      </svg>
      <div className="num absolute inset-0 grid place-items-center font-bold" style={{ fontSize: size * 0.24 }}>
        {done}/{total}
      </div>
    </div>
  )
}

export const Icons = {
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M11 18h2" />
    </>
  ),
  sheet: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M3 9h18M3 15h18M9 3v18" />
    </>
  ),
  warn: <path d="M12 3 2 20h20zM12 10v4M12 17.5v.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  refresh: <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  upload: <path d="M12 3v12M7 8l5-5 5 5M5 21h14" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  paste: (
    <>
      <rect x="6" y="4" width="12" height="17" rx="2.5" />
      <path d="M9 4V3h6v1" />
    </>
  ),
  account: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  income: <path d="M12 3v18M17 7.5C17 5.6 14.8 4.5 12 4.5S7 5.6 7 7.5 9.2 10.5 12 11s5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3" />,
  budget: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5V12l6 4" />
    </>
  ),
  cloud: <path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4 4 0 0 1-1 9.5zM12 11v6M9.5 13.5 12 11l2.5 2.5" />,
  fingerprint: (
    <>
      <path d="M12 3a7 7 0 0 1 7 7c0 2.5-.5 4-1 5" />
      <path d="M12 3a7 7 0 0 0-7 7c0 1.2.1 2.2.3 3" />
      <path d="M12 7a6 6 0 0 1 6 6c0 2-.4 3.5-1 4.7" />
      <path d="M12 7a6 6 0 0 0-6 6c0 2.8.7 4.5 1.5 5.7" />
      <path d="M12 11a2.5 2.5 0 0 1 2.5 2.5c0 2.3-.7 4-1.8 5.5" />
    </>
  ),
  home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m15 6-6 6 6 6" />,
}
