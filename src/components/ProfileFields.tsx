import type { ReactNode } from 'react'
import { DatePicker } from './DatePicker'
import { PROFILE_COLORS, ageLabel, ageOf, type Gender } from '../lib/profile'

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">
      {children}
      {hint && <small className="text-[11px] font-normal text-[var(--color-text-3)]">{hint}</small>}
    </div>
  )
}

export function NameInput({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <label className="flex h-[52px] items-center gap-2.5 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 focus-within:border-[var(--color-accent-line)]">
      <span className="text-[var(--color-text-3)]">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
        </svg>
      </span>
      <input
        value={value}
        autoFocus={autoFocus}
        maxLength={24}
        onChange={(e) => onChange(e.target.value)}
        placeholder="اسمك الأول"
        className="min-w-0 flex-1 bg-transparent text-[14.5px] font-semibold outline-none placeholder:font-normal placeholder:text-[var(--color-text-3)]"
        style={{ boxShadow: 'none' }}
      />
    </label>
  )
}

export function GenderSegment({ value, onChange }: { value: Gender; onChange: (v: Gender) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {(
        [
          ['m', 'أنتَ'],
          ['f', 'أنتِ'],
        ] as const
      ).map(([k, label]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className="qb-press h-[46px] rounded-[15px] border text-[13px] font-semibold"
          style={
            value === k
              ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderColor: 'transparent' }
              : { background: 'var(--color-surface)', color: 'var(--color-text-2)', borderColor: 'var(--color-border)' }
          }
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function BirthDateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const age = ageOf(value || undefined, new Date())
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <DatePicker value={value} onChange={onChange} placeholder="تاريخ الميلاد" />
      </div>
      {age !== null && <span className="num flex-shrink-0 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12px] font-bold text-[var(--color-text-2)]">{ageLabel(age)}</span>}
      {value && (
        <button onClick={() => onChange('')} className="qb-press flex-shrink-0 px-1 text-[12px] font-semibold text-[var(--color-text-3)]">
          مسح
        </button>
      )}
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-2.5 px-0.5">
      {PROFILE_COLORS.map((c, i) => (
        <button
          key={c}
          onClick={() => onChange(i)}
          aria-label={`اللون ${i + 1}`}
          className="qb-press h-[34px] w-[34px] rounded-full"
          style={{ background: c, boxShadow: value === i ? '0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-accent)' : undefined }}
        />
      ))}
    </div>
  )
}

export function PrivacyNote() {
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-[var(--color-border)] bg-white/[0.04] px-3.5 py-3 text-[11.5px] leading-relaxed text-[var(--color-text-2)]">
      <span className="mt-0.5 flex-shrink-0 text-[var(--color-income)]">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2.5" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      بياناتك تبقى على جهازك فقط، وتدخل ضمن النسخة الاحتياطية المشفّرة. لا يُرسل شيء لأي جهة.
    </div>
  )
}
