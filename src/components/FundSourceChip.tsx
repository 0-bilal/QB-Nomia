import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMoneyTrail } from '../hooks/useMoneyTrail'
import { borrowedInAccount, previewTake, txRef } from '../lib/moneyTrail'
import { haptic } from '../lib/haptics'
import { SheetHandle } from './SheetHandle'
import { KIND_COLOR, TrailIcon, money, useTrailNames } from './MoneyTrailVisuals'

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  )
}

const CHIP = 'qb-press flex h-9 max-w-[150px] flex-shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold'

/**
 * سلفة تعطيها: لو في الحساب دفعة مقترضة مفتوحة، تظهر «من سلفة فلان؟» — ضغطة تثبّتها، وضغطة ثانية ترجع للأقدم أولًا.
 * لا تظهر أصلًا لو ما فيه دفعة مقترضة متاحة.
 */
export function LoanSourceChip({ accountId, value, onChange }: { accountId: string; value: string; onChange: (id: string) => void }) {
  const trail = useMoneyTrail()
  const { personName } = useTrailNames()
  const pinned = value ? trail.byId.get(value) : undefined
  const suggestion = borrowedInAccount(trail, accountId)[0]?.batch
  const batch = pinned ?? suggestion
  if (!batch || batch.kind !== 'borrowed') return null
  const on = Boolean(pinned)
  const name = personName(batch.personId)
  return (
    <button
      type="button"
      onClick={() => {
        haptic('tick')
        onChange(on ? '' : batch.id)
      }}
      className={CHIP}
      style={{
        animation: 'qb-pop 420ms var(--ease-spring) both',
        transition: 'background 300ms var(--ease-spring), color 200ms, border-color 200ms',
        ...(on
          ? { background: 'var(--color-owed-by)', borderColor: 'var(--color-owed-by)', color: 'var(--color-on-accent)' }
          : { background: 'var(--color-surface)', borderColor: 'color-mix(in srgb, var(--color-owed-by) 45%, transparent)', color: 'var(--color-owed-by)' }),
      }}
      aria-pressed={on}
    >
      <LinkIcon />
      <span className="truncate">{on ? `من سلفة ${name}` : `من سلفة ${name}؟`}</span>
    </button>
  )
}

/** خيارات «من أي فلوس؟» لحساب: الدفعات المتوفرة فيه الآن + دفعات الحركة نفسها + المثبّتة. */
function useFundOptions(accountId: string, value: string, movementRef?: string) {
  const trail = useMoneyTrail()
  const current = movementRef ? (trail.allocations.get(movementRef) ?? []) : []
  const options = new Map<string, number>()
  for (const h of trail.holdings[accountId] ?? []) options.set(h.batchId, h.amount)
  for (const a of current) if (!options.has(a.batchId)) options.set(a.batchId, 0)
  if (value && !options.has(value)) options.set(value, 0)
  const list = [...options.entries()]
    .map(([id, available]) => ({ batch: trail.byId.get(id)!, available }))
    .filter((x) => x.batch && x.batch.kind !== 'unknown')
    .sort((a, b) => a.batch.order - b.batch.order)
  return { trail, current, list }
}

function Radio({ on }: { on: boolean }) {
  return (
    <span
      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2"
      style={on ? { borderColor: 'var(--color-accent)', background: 'var(--color-accent)', color: 'var(--color-on-accent)' } : { borderColor: 'var(--color-border-strong)' }}
    >
      {on && (
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  )
}

/**
 * ورقة «من أي فلوس؟»: تلقائي بالأقدم أولًا أو دفعة معيّنة لهذه الحركة فقط — اختيار بالراديو ثم «اعتماد».
 * `amount` (حركة جديدة) يعرض كيف بيتوزّع التلقائي، وعند التعديل يعرض توزيعها الحالي.
 */
export function FundSourceSheet({
  open,
  accountId,
  value,
  amount = 0,
  movementRef,
  onApply,
  onClose,
}: {
  open: boolean
  accountId: string
  value: string
  amount?: number
  movementRef?: string
  onApply: (id: string) => void
  onClose: () => void
}) {
  const { trail, current, list } = useFundOptions(accountId, value, movementRef)
  const { batchTitle, accountName } = useTrailNames()
  const [draft, setDraft] = useState(value)
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setDraft(value)
  }
  if (!open) return null

  const autoParts = !value && current.length > 0 ? current : amount > 0 ? previewTake(trail, accountId, amount) : []
  const autoLine = autoParts
    .map((p) => {
      const b = p.batchId ? trail.byId.get(p.batchId) : undefined
      return `${b ? batchTitle(b) : 'بلا مصدر'} ${money(p.amount, false)}`
    })
    .join(' + ')

  const rows: { id: string; title: string; sub: string; color?: string }[] = [
    { id: '', title: 'تلقائي · الأقدم أولًا', sub: autoLine || 'الأصل لكل حركة' },
    ...list.map(({ batch, available }) => ({
      id: batch.id,
      title: batchTitle(batch),
      sub: available > 0 ? `المتاح في ${accountName(accountId)} ${money(available, false)}` : 'ما بقي منها شيء في الحساب الآن',
      color: KIND_COLOR[batch.kind],
    })),
  ]

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        className="relative flex max-h-[80vh] w-full max-w-[480px] flex-col rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-3">
          <div className="text-[17px] font-semibold">من أي فلوس؟</div>
          <button onClick={onClose} aria-label="إغلاق" className="qb-press flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-2)]" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {movementRef && current.length > 0 && <CurrentBreakdown accountId={accountId} movementRef={movementRef} />}
          {rows.map((r) => (
            <button
              key={r.id || 'auto'}
              onClick={() => {
                haptic('tick')
                setDraft(r.id)
              }}
              className="qb-press mb-2 flex w-full items-center gap-3 rounded-[18px] border bg-[var(--color-surface)] px-3.5 py-3 text-right"
              style={{ borderColor: draft === r.id ? 'var(--color-accent-line)' : 'var(--color-border)', transition: 'border-color 200ms' }}
            >
              <Radio on={draft === r.id} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">{r.title}</div>
                <div className="truncate text-[11px] text-[var(--color-text-3)]">{r.sub}</div>
              </div>
              {r.color && <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: r.color }} />}
            </button>
          ))}
          <div className="px-1.5 pb-1 text-[11px] text-[var(--color-text-3)]">تظهر الدفعات اللي لها رصيد في {accountName(accountId)}. الاختيار يخص هذه الحركة فقط.</div>
        </div>
        <div className="flex-shrink-0 px-4 pb-4 pt-3">
          <button
            onClick={() => {
              haptic('success')
              onApply(draft)
            }}
            className="qb-btn-primary h-12 w-full text-[14px]"
          >
            اعتماد
          </button>
          <div className="safe-bottom" />
        </div>
      </div>
    </div>
  )
}

/** كبسولة «من أي فلوس؟» في صف كبسولات الحركة الجديدة (مصروف أو تحويل). */
export function FundSourceChip({ accountId, value, onChange, amount = 0 }: { accountId: string; value: string; onChange: (id: string) => void; amount?: number }) {
  const trail = useMoneyTrail()
  const { batchTitle } = useTrailNames()
  const [open, setOpen] = useState(false)
  const pinned = value ? trail.byId.get(value) : undefined
  return (
    <>
      <FundSourceSheet
        open={open}
        accountId={accountId}
        value={value}
        amount={amount}
        onApply={(id) => {
          onChange(id)
          setOpen(false)
        }}
        onClose={() => setOpen(false)}
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={CHIP}
        style={{ background: 'var(--color-surface)', borderColor: pinned ? 'var(--color-border-strong)' : 'var(--color-border)', color: pinned ? 'var(--color-text)' : 'var(--color-text-2)' }}
      >
        <TrailIcon size={14} />
        <span className="truncate">{pinned ? batchTitle(pinned) : 'الأقدم أولًا'}</span>
      </button>
    </>
  )
}

/**
 * قسم «من أي فلوس؟» ظاهر في شاشة الحركة عند التعديل — بطاقة مضغوطة (تبقى الشاشة بدون تمرير):
 * شريط التوزيع وسطر بالدفعات، و«تغيير» يفتح الورقة بالتفاصيل. تغيير لسه ما انحفظ يظهر «بعد الحفظ».
 */
export function FundSourceSection({ accountId, value, savedValue, onChange, movementRef }: { accountId: string; value: string; savedValue: string; onChange: (id: string) => void; movementRef: string }) {
  const trail = useMoneyTrail()
  const { batchTitle } = useTrailNames()
  const [open, setOpen] = useState(false)
  const current = trail.allocations.get(movementRef) ?? []
  if (current.length === 0) return null
  const total = current.reduce((s, a) => s + a.amount, 0)
  const pending = value !== savedValue
  const pendingBatch = value ? trail.byId.get(value) : undefined
  const shade = (i: number, c: string) => (i === 0 ? c : `color-mix(in srgb, ${c} 55%, var(--color-surface-high))`)
  return (
    <>
      <FundSourceSheet
        open={open}
        accountId={accountId}
        value={value}
        movementRef={movementRef}
        onApply={(id) => {
          onChange(id)
          setOpen(false)
        }}
        onClose={() => setOpen(false)}
      />
      <button type="button" onClick={() => setOpen(true)} className="qb-card qb-press mt-3 block w-full px-3.5 py-2.5 text-right">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold">من أي فلوس؟</span>
          <span className="text-[12px] font-semibold text-[var(--color-text-2)]">تغيير</span>
        </div>
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-high)]" style={{ gap: 2 }}>
          {current.map((a, i) => {
            const b = trail.byId.get(a.batchId)
            return <span key={a.batchId} className="qb-trail-grow block h-full" style={{ width: `${(a.amount / total) * 100}%`, background: shade(i, b ? KIND_COLOR[b.kind] : 'var(--color-text-3)'), animationDelay: `${i * 90}ms` }} />
          })}
        </div>
        {pending ? (
          <div className="mt-1.5 truncate text-[11px] text-[var(--color-text-2)]">
            بعد الحفظ: <b className="text-[var(--color-text)]">{pendingBatch ? `من ${batchTitle(pendingBatch)} أولًا` : 'تلقائي بالأقدم أولًا'}</b>
          </div>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--color-text-2)]">
            {current.map((a, i) => {
              const b = trail.byId.get(a.batchId)
              return (
                <span key={a.batchId} className="inline-flex items-center gap-1.5">
                  <span className="h-[7px] w-[7px] rounded-full" style={{ background: shade(i, b ? KIND_COLOR[b.kind] : 'var(--color-text-3)') }} />
                  {b ? batchTitle(b) : '—'} <b className="num text-[var(--color-text)]">{money(a.amount, false)}</b>
                </span>
              )
            })}
          </div>
        )}
      </button>
    </>
  )
}

/**
 * السطر التوضيحي فوق كبسولات السلفة المعطاة: من أي دفعات بتطلع الفلوس.
 * يظهر فقط لما يكون في الحساب دفعة مقترضة (نفس شرط كبسولة «من سلفة فلان؟») أو فيه تثبيت.
 */
export function LoanSourceLine({ accountId, amount, value }: { accountId: string; amount: number; value: string }) {
  const trail = useMoneyTrail()
  const { batchTitle, personName } = useTrailNames()
  const pinned = value ? trail.byId.get(value) : undefined
  if (!pinned && borrowedInAccount(trail, accountId).length === 0) return null
  const available = (trail.holdings[accountId] ?? []).find((h) => h.batchId === value)?.amount ?? 0
  const parts = amount > 0 ? previewTake(trail, accountId, amount, value || undefined) : []
  /** كل المبلغ يطلع من الدفعة المثبّتة. */
  const on = Boolean(pinned) && parts.every((p) => p.batchId === value)
  const nameOf = (id: string | null) => {
    if (!id) return 'بلا مصدر'
    const b = trail.byId.get(id)
    return b ? (b.kind === 'borrowed' ? `سلفة ${personName(b.personId)}` : batchTitle(b)) : '—'
  }
  return (
    <div
      className="mb-3 flex items-center gap-2.5 rounded-[16px] border px-3.5 py-2.5"
      style={{
        background: on ? 'color-mix(in srgb, var(--color-owed-by) 10%, transparent)' : 'rgba(255,255,255,0.03)',
        borderColor: on ? 'color-mix(in srgb, var(--color-owed-by) 30%, transparent)' : 'var(--color-border)',
        transition: 'background 300ms, border-color 300ms',
      }}
    >
      <span style={{ color: on ? 'var(--color-owed-by)' : 'var(--color-text-3)' }}>
        <LinkIcon />
      </span>
      <div className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-[var(--color-text-2)]">
        {pinned && on ? (
          <>
            تخرج من <b style={{ color: 'var(--color-owed-by)' }}>{nameOf(pinned.id)}</b> · المتاح منها <span className="num">{money(available, false)}</span>
          </>
        ) : parts.length === 0 ? (
          <>تخرج بالأقدم أولًا · اكتب المبلغ وبتشوف من أي دفعات</>
        ) : (
          <>
            {pinned ? 'المتاح من المثبّتة ما يكفي، والباقي بالأقدم أولًا: ' : 'تخرج بالأقدم أولًا: '}
            {parts.map((p, i) => (
              <span key={p.batchId ?? 'none'}>
                {i > 0 && ' + '}
                <b className="text-[var(--color-text)]" style={p.batchId === null ? { color: 'var(--color-subscription)' } : undefined}>
                  {nameOf(p.batchId)}
                </b>{' '}
                <span className="num">{money(p.amount, false)}</span>
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

/** «وين راح؟» في تعديل حركة دخل: ملخص الدفعة ويفتح شجرتها. */
export function IncomeTrailButton({ txId }: { txId: string }) {
  const navigate = useNavigate()
  const trail = useMoneyTrail()
  const batch = trail.byId.get(txRef(txId))
  if (!batch) return null
  const out = batch.amount - batch.left
  return (
    <button type="button" onClick={() => navigate(`/trail/${encodeURIComponent(batch.id)}`)} className="qb-card qb-press mt-1 flex w-full items-center gap-3 p-3.5 text-right">
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-white/[0.07] text-[var(--color-text)]">
        <TrailIcon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold">وين راح هذا الدخل؟</div>
        <div className="truncate text-[11px] text-[var(--color-text-3)]">
          {out > 0 ? (
            <>
              طلع منه <span className="num">{money(out, false)}</span> · باقي <span className="num">{money(batch.left, false)}</span>
            </>
          ) : (
            'ما طلع منه شيء بعد'
          )}
        </div>
      </div>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-[var(--color-text-3)]">
        <path d="m15 6-6 6 6 6" />
      </svg>
    </button>
  )
}

/** داخل الورقة عند التعديل: الحركة الآن من أي دفعات، مع وصف كل جزء. */
function CurrentBreakdown({ accountId, movementRef }: { accountId: string; movementRef: string }) {
  const trail = useMoneyTrail()
  const { batchTitle, personName } = useTrailNames()
  const current = trail.allocations.get(movementRef) ?? []
  const movementDate = trail.byId.get(current[0]?.batchId ?? '')?.events.find((e) => e.ref === movementRef)?.date ?? ''
  /** «من اللي رجع من أحمد» لو فلوس الدفعة في هذا الحساب رجعت من شخص قبل الحركة. */
  const noteFor = (batchId: string) => {
    const b = trail.byId.get(batchId)
    if (!b) return ''
    if (b.kind === 'unknown') return 'ما كان في الحساب فلوس كفاية وقتها'
    const back = [...b.events].reverse().find((e) => e.kind === 'returned' && e.accountId === accountId && e.date <= movementDate)
    if (back) return `من اللي رجع من ${personName(back.personId)}`
    return b.date ? `دخلت ${b.date.split('-').join('/')}` : 'رصيد كان قبل أول حركة'
  }
  return (
    <div className="mb-3 rounded-[18px] border border-[var(--color-border)] bg-white/[0.03] px-3.5 py-1">
      <div className="pt-2 text-[11px] text-[var(--color-text-3)]">الحركة الآن من</div>
      {current.map((a, i) => {
        const b = trail.byId.get(a.batchId)
        const c = b ? KIND_COLOR[b.kind] : 'var(--color-text-3)'
        return (
          <div key={a.batchId} className={`flex items-center gap-2.5 py-2 ${i > 0 ? 'border-t qb-divider' : ''}`}>
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: i === 0 ? c : `color-mix(in srgb, ${c} 55%, var(--color-surface-high))` }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold">{b ? batchTitle(b) : '—'}</div>
              <div className="truncate text-[10.5px] text-[var(--color-text-3)]">{noteFor(a.batchId)}</div>
            </div>
            <span className="num flex-shrink-0 text-[13px] font-bold">{money(a.amount, false)}</span>
          </div>
        )
      })}
    </div>
  )
}
