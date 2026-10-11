import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useData, type ReconcileInput } from '../state/DataContext'
import { formatAmount } from '../lib/format'
import { haptic } from '../lib/haptics'
import { notify } from '../lib/notify'
import { DENOMINATIONS, countTotal, diffStatus, parsePadAmount, reconcileDiff, type DenominationCounts, type DiffStatus } from '../lib/reconcile'
import { AmountPad } from './AmountPad'
import { SheetHandle } from './SheetHandle'
import type { Account } from '../types'

type Mode = 'count' | 'amount'
type Resolution = ReconcileInput['resolution']

const STATUS_META: Record<DiffStatus, { label: string; color: string }> = {
  matched: { label: 'مطابق', color: 'var(--color-income)' },
  short: { label: 'نقص', color: 'var(--color-expense)' },
  over: { label: 'زيادة', color: 'var(--color-income)' },
}

/** الفرق بإشارته بدون العملة (− هي U+2212) — العملة تُكتب بجانبه بخط أصغر. */
function signedAmount(n: number): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatAmount(Math.abs(n))}`
}

function Icon({ d, size = 16, w = 2.4 }: { d: ReactNode; size?: number; w?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  )
}
const CHECK = <path d="M5 12.5l4.5 4.5L19 7.5" />
const DOWN = <path d="M12 5v14M6 13l6 6 6-6" />
const UP = <path d="M12 19V5M6 11l6-6 6 6" />
const CLOSE = <path d="M6 6l12 12M18 6L6 18" />
const BACK = <path d="M9 6l6 6-6 6" />
const MINUS = <path d="M5 12h14" />
const PLUS = <path d="M12 5v14M5 12h14" />

function Money({ value, hidden, className = '' }: { value: number; hidden: boolean; className?: string }) {
  return (
    <span className={className}>
      <span className="num">{hidden ? '•••' : formatAmount(value)}</span>
      <span className="mr-1 text-[0.6em] font-medium text-[var(--color-text-3)]">ر.س</span>
    </span>
  )
}

/** كبسولة الفرق — الكبسولة الذكية بحبّة الحالة الملوّنة، تتحدّث مع كل إدخال. */
function DiffCapsule({ diff, hidden }: { diff: number | null; hidden: boolean }) {
  const status = diff === null ? null : diffStatus(diff)
  const meta = status ? STATUS_META[status] : null
  return (
    <div className="relative z-0 flex justify-center py-3">
      <div
        className="relative flex h-10 items-center gap-2 rounded-full border border-[var(--color-border-strong)] text-[12.5px] font-semibold text-[var(--color-text-2)]"
        style={{
          padding: meta ? '4px 14px 4px 6px' : '4px 14px',
          background: 'rgba(28,28,33,.9)',
          backdropFilter: 'blur(20px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
          boxShadow: '0 12px 30px -12px rgba(0,0,0,.8)',
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -z-10"
          style={{
            inset: '-12px -16px',
            background: 'rgba(5,5,6,.35)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            maskImage: 'radial-gradient(closest-side, #000 60%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(closest-side, #000 60%, transparent 100%)',
          }}
        />
        {diff === null || !meta ? (
          <span>أدخل المبلغ اللي عندك</span>
        ) : (
          <>
            <span>{status === 'matched' ? 'الرصيدان متساويان' : 'الفرق'}</span>
            {status !== 'matched' && (
              <span dir="ltr" className="num text-[var(--color-text)]">
                {hidden ? '•••' : signedAmount(diff)}
              </span>
            )}
            <span
              key={status}
              className="flex h-8 items-center gap-1 rounded-full px-3 font-bold text-[var(--color-on-accent)]"
              style={{ background: meta.color, animation: 'qb-pop 380ms var(--ease-spring) both' }}
            >
              <Icon d={status === 'matched' ? CHECK : status === 'short' ? DOWN : UP} size={14} w={2.8} />
              {meta.label}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function DenominationRow({ value, count, hidden, onChange }: { value: number; count: number; hidden: boolean; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-[var(--color-border)] py-2 first:border-t-0">
      <span className="num grid h-[30px] w-14 flex-shrink-0 place-items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-high)] text-[12.5px] font-bold">
        {value}
      </span>
      <span className="num flex-1 text-left text-[12px] text-[var(--color-text-3)]">{count > 0 ? (hidden ? '•••' : formatAmount(count * value)) : ''}</span>
      <span dir="ltr" className="flex h-[34px] items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
        <button
          type="button"
          aria-label={`أنقص فئة ${value}`}
          onClick={() => {
            if (count === 0) return
            haptic('tick')
            onChange(count - 1)
          }}
          className="grid h-[30px] w-[30px] place-items-center rounded-full text-[var(--color-text-2)] active:bg-white/[0.08]"
        >
          <Icon d={MINUS} size={15} w={2.6} />
        </button>
        <b className="num min-w-[26px] text-center text-[13.5px]">{count}</b>
        <button
          type="button"
          aria-label={`زد فئة ${value}`}
          onClick={() => {
            haptic('tick')
            onChange(count + 1)
          }}
          className="grid h-[30px] w-[30px] place-items-center rounded-full text-[var(--color-text-2)] active:bg-white/[0.08]"
        >
          <Icon d={PLUS} size={15} w={2.6} />
        </button>
      </span>
    </div>
  )
}

function OptionCard({ on, title, desc, onSelect, children }: { on: boolean; title: string; desc: string; onSelect: () => void; children?: ReactNode }) {
  return (
    <div
      className="mt-2 rounded-[18px] border px-3.5 py-3"
      style={{ borderColor: on ? 'var(--color-accent-line)' : 'var(--color-border)', background: on ? '#16161a' : 'var(--color-surface)', transition: 'border-color 200ms ease, background 200ms ease' }}
    >
      <button type="button" role="radio" aria-checked={on} onClick={onSelect} className="qb-press flex w-full items-start gap-3 text-right">
        <span
          className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border-2"
          style={{ borderColor: on ? 'var(--color-accent)' : 'var(--color-text-3)' }}
        >
          {on && <span className="h-[9px] w-[9px] rounded-full bg-[var(--color-accent)]" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold">{title}</span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--color-text-3)]">{desc}</span>
        </span>
      </button>
      {children}
    </div>
  )
}

function ChipScroller({ options, value, color, onChange }: { options: { id: string; name: string }[]; value: string | null; color: string; onChange: (id: string) => void }) {
  if (options.length === 0) return <div className="mt-2.5 text-[11.5px] text-[var(--color-text-3)]">لا توجد خيارات — أضفها من الإعدادات أولًا</div>
  return (
    <div data-own-gesture className="-mx-3.5 mt-2.5 flex gap-1.5 overflow-x-auto px-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => {
        const on = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              haptic('tick')
              onChange(o.id)
            }}
            className="qb-press h-8 flex-shrink-0 whitespace-nowrap rounded-full border px-3 text-[12px] font-semibold"
            style={on ? { background: color, color: 'var(--color-on-accent)', borderColor: 'transparent' } : { background: 'rgba(255,255,255,.05)', borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}
          >
            {o.name}
          </button>
        )
      })}
    </div>
  )
}

/**
 * ورقة مطابقة حساب: المبلغ الفعلي (عدّ فئات للكاش أو لوحة أرقام) مقابل رصيد التطبيق،
 * ثم سبب الفرق: حركة منسية (تدخل التقارير) أو تسوية فقط (رصيد بدون تقارير).
 * لوحة الأرقام وزر الاعتماد مثبّتان أسفل الورقة — لا تمرير أثناء الإدخال.
 */
export function ReconcileSheet({ account, hidden, onClose }: { account: Account; hidden: boolean; onClose: () => void }) {
  const { categories, incomeSources, reconcileAccount } = useData()
  const [mode, setMode] = useState<Mode>(account.type === 'cash' ? 'count' : 'amount')
  const [counts, setCounts] = useState<DenominationCounts>({})
  const [typed, setTyped] = useState('')
  const [step, setStep] = useState<'input' | 'reason'>('input')
  const [resolution, setResolution] = useState<Resolution | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const actual = mode === 'count' ? countTotal(counts) : parsePadAmount(typed)
  const diff = actual === null ? null : reconcileDiff(account.balance, actual)
  const status = diff === null ? null : diffStatus(diff)
  const short = status === 'short'
  const ready = resolution === 'adjust' || (resolution === 'expense' && !!categoryId) || (resolution === 'income' && !!sourceId)

  function changeMode(next: Mode) {
    if (next === mode) return
    haptic('tick')
    setMode(next)
  }

  function save(res: Resolution) {
    if (actual === null) return
    const rec = reconcileAccount({
      accountId: account.id,
      actualBalance: actual,
      resolution: res,
      categoryId: categoryId ?? undefined,
      incomeSourceId: sourceId ?? undefined,
      note,
    })
    if (!rec) return
    haptic('success')
    notify('success', rec.resolution === 'matched' ? `${account.name} مطابق` : `تمت مطابقة ${account.name}`)
    onClose()
  }

  function next() {
    if (status === null) return
    if (status === 'matched') save('adjust')
    else {
      haptic('tick')
      setResolution(null)
      setStep('reason')
    }
  }

  const expenseCats = categories.filter((c) => c.kind === 'expense')

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[65] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={`مطابقة ${account.name}`}
        className="relative flex h-[92dvh] w-full max-w-[480px] flex-col rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="flex flex-shrink-0 items-center gap-2.5 px-5 pb-2">
          {step === 'reason' && (
            <button type="button" aria-label="رجوع" onClick={() => setStep('input')} className="qb-press grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.06] text-[var(--color-text-2)]">
              <Icon d={BACK} />
            </button>
          )}
          <div className="min-w-0 flex-1 truncate text-[17px] font-semibold">مطابقة {account.name}</div>
          <button type="button" aria-label="إغلاق" onClick={onClose} className="qb-press grid h-[34px] w-[34px] place-items-center rounded-full bg-white/[0.06] text-[var(--color-text-2)]">
            <Icon d={CLOSE} size={15} w={2.6} />
          </button>
        </div>

        {step === 'input' ? (
          <>
            <div className="flex-shrink-0 px-5 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
                  <div className="text-[11px] font-medium text-[var(--color-text-3)]">حسب التطبيق</div>
                  <Money value={account.balance} hidden={hidden} className="mt-1 block text-[20px] font-bold" />
                </div>
                <div className="rounded-[18px] border border-[var(--color-accent-line)] bg-[var(--color-surface)] px-3.5 py-3">
                  <div className="text-[11px] font-medium text-[var(--color-text-3)]">الفعلي عندك</div>
                  {actual === null ? (
                    <span className="num mt-1 block text-[20px] font-bold text-[var(--color-text-3)]">0</span>
                  ) : (
                    <Money value={actual} hidden={hidden} className="mt-1 block text-[20px] font-bold" />
                  )}
                </div>
              </div>
              <DiffCapsule diff={diff} hidden={hidden} />
              {account.type === 'cash' && (
                <div className="mb-2 flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
                  {(
                    [
                      ['count', 'عدّ الفئات'],
                      ['amount', 'مبلغ مباشر'],
                    ] as [Mode, string][]
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => changeMode(m)}
                      className="h-8 flex-1 rounded-full text-[12px] font-semibold"
                      style={{
                        background: mode === m ? 'rgba(255,255,255,.1)' : 'transparent',
                        color: mode === m ? 'var(--color-text)' : 'var(--color-text-3)',
                        transition: 'background 300ms var(--ease-spring), color 200ms ease',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              {mode === 'count' && (
                <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1">
                  {DENOMINATIONS.map((d) => (
                    <DenominationRow key={d} value={d} count={counts[d] ?? 0} hidden={hidden} onChange={(n) => setCounts((c) => ({ ...c, [d]: n }))} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 px-5 pb-4 pt-3">
              <div className="safe-bottom">
                {mode === 'amount' ? (
                  // نفس اللوحة الثابتة بباقي الشاشات: زر «التالي / تأكيد» داخل اللوحة.
                  <AmountPad
                    value={typed}
                    onChange={setTyped}
                    color="var(--color-text)"
                    action={{
                      label: status === 'matched' ? 'تأكيد' : 'التالي',
                      icon: status === 'matched' ? <Icon d={CHECK} size={22} w={2.6} /> : undefined,
                      color: 'var(--color-accent)',
                      disabled: status === null,
                      onPress: next,
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={status === null}
                    onClick={next}
                    className="qb-press flex h-[52px] w-full items-center justify-center gap-2 rounded-[17px] text-[14.5px] font-semibold text-[var(--color-on-accent)] disabled:opacity-35"
                    style={{ background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent-b))' }}
                  >
                    {status === 'matched' && <Icon d={CHECK} size={18} w={2.6} />}
                    {status === 'matched' ? 'تأكيد المطابقة' : 'التالي'}
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              <div className="pb-1.5 pt-3 text-center">
                <div className="text-[12px] text-[var(--color-text-3)]">
                  {short ? 'نقص' : 'زيادة'} في {account.name}
                </div>
                <div dir="ltr" className="num mt-0.5 text-[40px] font-bold" style={{ color: short ? 'var(--color-expense)' : 'var(--color-income)', animation: 'qb-pop 380ms var(--ease-spring) both' }}>
                  <span className="mr-1.5 text-[15px] font-medium text-[var(--color-text-3)]">ر.س</span>
                  <span dir="ltr">{hidden ? '•••' : signedAmount(diff ?? 0)}</span>
                </div>
                <div className="mt-1 text-[12px] text-[var(--color-text-3)]">
                  من <span className="num">{hidden ? '•••' : formatAmount(account.balance)}</span> إلى <span className="num">{hidden ? '•••' : formatAmount(actual ?? 0)}</span>
                </div>
              </div>

              <div className="mx-0.5 mt-4 text-[12px] font-semibold text-[var(--color-text-3)]">وش سبب {short ? 'النقص' : 'الزيادة'}؟</div>
              {short ? (
                <OptionCard on={resolution === 'expense'} title="مصروف نسيت أسجّله" desc="يُسجَّل مصروفًا بفئته ويدخل التقارير وصافي الشهر." onSelect={() => setResolution('expense')}>
                  {resolution === 'expense' && <ChipScroller options={expenseCats} value={categoryId} color="var(--color-expense)" onChange={setCategoryId} />}
                </OptionCard>
              ) : (
                <OptionCard on={resolution === 'income'} title="دخل نسيت أسجّله" desc="يُسجَّل دخلًا بمصدره ويدخل التقارير." onSelect={() => setResolution('income')}>
                  {resolution === 'income' && <ChipScroller options={incomeSources} value={sourceId} color="var(--color-income)" onChange={setSourceId} />}
                </OptionCard>
              )}
              <OptionCard on={resolution === 'adjust'} title="تسوية فقط" desc="يعدّل الرصيد بدون ما يدخل الدخل والمصروف." onSelect={() => setResolution('adjust')} />

              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ملاحظة (اختياري)"
                className="mb-3 mt-3 h-[46px] w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[13px] outline-none placeholder:text-[var(--color-text-3)] focus:border-[var(--color-accent-line)]"
              />
            </div>

            <div className="flex-shrink-0 px-5 pb-4 pt-3">
              <div className="safe-bottom">
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => resolution && save(resolution)}
                  className="qb-press flex h-[52px] w-full items-center justify-center gap-1.5 rounded-[17px] text-[14.5px] font-semibold text-[var(--color-on-accent)] disabled:opacity-35"
                  style={{ background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent-b))' }}
                >
                  اعتمد الرصيد
                  {!hidden && <span className="num">{formatAmount(actual ?? 0)}</span>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
