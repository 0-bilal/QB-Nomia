import { useState, type ReactNode } from 'react'
import { SheetHandle } from './SheetHandle'
import { DatePicker } from './DatePicker'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, AccountTypeIcon } from './AccountVisuals'
import { EMPTY_TX_FILTERS, PERIOD_PRESETS, SORT_OPTIONS, type TxFilters } from '../lib/txFilters'
import type { Account } from '../types'

const svg = { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
export const CalendarIcon = ({ size = 14 }: { size?: number }) => (
  <svg {...svg} width={size} height={size}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
)
const WalletIcon = () => (
  <svg {...svg}>
    <rect x="3" y="6" width="18" height="14" rx="3" />
    <path d="M16 13h2M3 10h18" />
  </svg>
)
const CoinIcon = () => (
  <svg {...svg}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v8M9.5 10.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
  </svg>
)
const SortIcon = () => (
  <svg {...svg}>
    <path d="M7 4v16M3 8l4-4 4 4M17 20V4M21 16l-4 4-4-4" />
  </svg>
)

const AMOUNT_PRESETS: [string, string, string][] = [
  ['', '50', 'أقل من 50'],
  ['50', '200', '50 – 200'],
  ['200', '', 'أكثر من 200'],
]

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-semibold text-[var(--color-text-3)]">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

function Opt({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="qb-press flex h-10 items-center justify-center gap-1.5 rounded-[13px] border text-[12px] font-semibold"
      style={
        on
          ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderColor: 'transparent' }
          : { background: 'var(--color-surface)', color: 'var(--color-text-2)', borderColor: 'var(--color-border)' }
      }
    >
      {children}
    </button>
  )
}

/** نافذة "الفلترة والترتيب": الفترة (جاهزة أو مخصصة)، الحساب (متعدد)، المبلغ، والترتيب — زر التأكيد يعرض عدد النتائج مباشرة. */
export function TxFilterSheet({
  initial,
  accounts,
  countFor,
  onApply,
  onClose,
}: {
  initial: TxFilters
  accounts: Account[]
  countFor: (f: TxFilters) => number
  onApply: (f: TxFilters) => void
  onClose: () => void
}) {
  const [d, setD] = useState<TxFilters>(initial)
  const set = (patch: Partial<TxFilters>) => setD((x) => ({ ...x, ...patch }))
  const count = countFor(d)

  return (
    <div dir="rtl" className="fixed inset-0 z-[65] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label="الفلترة والترتيب"
        className="relative flex max-h-[85vh] w-full max-w-[480px] flex-col rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="flex flex-shrink-0 items-center justify-between px-5 pb-1 pt-2">
          <div className="text-[17px] font-semibold">الفلترة والترتيب</div>
          <button
            onClick={() => setD({ ...EMPTY_TX_FILTERS, type: d.type, categories: d.categories })}
            className="qb-press text-[12.5px] font-semibold text-[var(--color-expense)]"
          >
            إعادة تعيين
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <Section icon={<CalendarIcon />} title="الفترة">
            <div className="grid grid-cols-2 gap-1.5">
              {PERIOD_PRESETS.map(([k, label]) => (
                <Opt key={k} on={d.period === k} onClick={() => set({ period: k })}>
                  {label}
                </Opt>
              ))}
            </div>
            <div className="mt-1.5">
              <Opt on={d.period === 'custom'} onClick={() => set({ period: 'custom' })}>
                <CalendarIcon size={13} />
                فترة مخصصة
              </Opt>
            </div>
            {d.period === 'custom' && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1">
                  <DatePicker value={d.from} onChange={(v) => set({ from: v })} placeholder="من تاريخ" />
                </div>
                <span className="text-[var(--color-text-3)]">←</span>
                <div className="flex-1">
                  <DatePicker value={d.to} onChange={(v) => set({ to: v })} placeholder="إلى تاريخ" />
                </div>
              </div>
            )}
          </Section>

          {accounts.length > 1 && (
            <Section icon={<WalletIcon />} title="الحساب">
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((a) => {
                  const on = d.accountIds.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      onClick={() => set({ accountIds: on ? d.accountIds.filter((x) => x !== a.id) : [...d.accountIds, a.id] })}
                      className="qb-press flex h-10 items-center gap-2 rounded-[13px] border pe-3 ps-1.5 text-[12px] font-semibold"
                      style={{
                        background: on ? 'var(--color-surface-high)' : 'var(--color-surface)',
                        borderColor: on ? 'var(--color-accent)' : 'var(--color-border)',
                        color: on ? 'var(--color-text)' : 'var(--color-text-2)',
                      }}
                    >
                      <span className="flex items-center justify-center rounded-[9px]" style={{ width: 28, height: 28, background: ACCOUNT_ICON_BG[a.type], color: ACCOUNT_ICON_COLOR[a.type] }}>
                        <AccountTypeIcon type={a.type} size={15} />
                      </span>
                      {a.name}
                    </button>
                  )
                })}
              </div>
            </Section>
          )}

          <Section icon={<CoinIcon />} title="المبلغ (ر.س)">
            <div className="flex items-center gap-1.5">
              {(['minAmount', 'maxAmount'] as const).map((key, i) => (
                <input
                  key={key}
                  dir="ltr"
                  inputMode="decimal"
                  value={d[key]}
                  onChange={(e) => set({ [key]: e.target.value.replace(/[^0-9.]/g, '') })}
                  placeholder={i === 0 ? 'من' : 'إلى'}
                  className="num h-11 min-w-0 flex-1 rounded-[13px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center text-[13px] font-semibold outline-none placeholder:text-[var(--color-text-3)] focus:border-[var(--color-accent-line)]"
                />
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {AMOUNT_PRESETS.map(([min, max, label]) => {
                const on = d.minAmount === min && d.maxAmount === max
                return (
                  <Opt key={label} on={on} onClick={() => set(on ? { minAmount: '', maxAmount: '' } : { minAmount: min, maxAmount: max })}>
                    <span className="num">{label}</span>
                  </Opt>
                )
              })}
            </div>
          </Section>

          <Section icon={<SortIcon />} title="الترتيب">
            <div className="grid grid-cols-2 gap-1.5">
              {SORT_OPTIONS.map(([k, label]) => (
                <Opt key={k} on={d.sort === k} onClick={() => set({ sort: k })}>
                  {label}
                </Opt>
              ))}
            </div>
          </Section>
        </div>

        <div className="flex-shrink-0 border-t border-[var(--color-border)] px-5 pb-3 pt-3">
          <button
            onClick={() => onApply(d)}
            className="qb-press h-12 w-full rounded-2xl text-[13.5px] font-bold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
          >
            {count > 0 ? `عرض ${count.toLocaleString('en-US')} حركة` : 'لا توجد نتائج — عدّل الفلاتر'}
          </button>
        </div>
        <div className="safe-bottom flex-shrink-0" />
      </div>
    </div>
  )
}
