import { useState } from 'react'
import { useMoneyTrail } from '../hooks/useMoneyTrail'
import { borrowedInAccount } from '../lib/moneyTrail'
import { haptic } from '../lib/haptics'
import { formatDate } from '../lib/format'
import { SelectSheet, type SelectSheetItem } from './SelectSheet'
import { BatchKindIcon, KIND_COLOR, TrailIcon, money, useTrailNames } from './MoneyTrailVisuals'

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

/**
 * مصروف أو تحويل: «من أي فلوس؟» — تلقائي بالأقدم أولًا، أو تثبيت دفعة معيّنة لهذه الحركة فقط.
 * عند التعديل تعرض الورقة كيف توزّعت الحركة فعلًا.
 */
export function FundSourceChip({ accountId, value, onChange, movementRef }: { accountId: string; value: string; onChange: (id: string) => void; movementRef?: string }) {
  const trail = useMoneyTrail()
  const { batchTitle } = useTrailNames()
  const [open, setOpen] = useState(false)
  const pinned = value ? trail.byId.get(value) : undefined
  const current = movementRef ? (trail.allocations.get(movementRef) ?? []) : []

  const held = trail.holdings[accountId] ?? []
  const options = new Map<string, number>()
  for (const h of held) options.set(h.batchId, h.amount)
  // دفعات الحركة نفسها (عند التعديل) — ما زالت خيارًا حتى لو صُرف كل ما بقي منها.
  for (const a of current) if (!options.has(a.batchId)) options.set(a.batchId, 0)
  if (pinned && !options.has(pinned.id)) options.set(pinned.id, 0)

  const items: SelectSheetItem[] = [
    {
      id: '',
      icon: <TrailIcon size={17} />,
      iconColor: 'var(--color-text)',
      iconBg: 'rgba(255,255,255,0.08)',
      title: 'تلقائي · الأقدم أولًا',
      subtitle: 'الأصل لكل حركة',
    },
    ...[...options.entries()]
      .map(([id, available]) => ({ b: trail.byId.get(id)!, available }))
      .filter((x) => x.b && x.b.kind !== 'unknown')
      .sort((a, b) => a.b.order - b.b.order)
      .map(({ b, available }) => ({
        id: b.id,
        icon: <BatchKindIcon kind={b.kind} size={17} />,
        iconColor: KIND_COLOR[b.kind],
        iconBg: `color-mix(in srgb, ${KIND_COLOR[b.kind]} 15%, transparent)`,
        title: batchTitle(b),
        subtitle: b.date ? formatDate(b.date) : 'قبل أول حركة',
        trailing: available > 0 ? <span className="num text-[12.5px] font-bold text-[var(--color-text-2)]">{money(available, false)}</span> : undefined,
      })),
  ]

  const label = pinned ? batchTitle(pinned) : 'الأقدم أولًا'
  return (
    <>
      <SelectSheet
        open={open}
        title="من أي فلوس؟"
        items={items}
        selectedId={value}
        onSelect={(id) => {
          haptic('tick')
          onChange(id)
          setOpen(false)
        }}
        onClose={() => setOpen(false)}
        footer={
          current.length > 0 ? (
            <div className="rounded-[16px] border border-[var(--color-border)] bg-white/[0.03] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[var(--color-text-2)]">
              <div className="mb-1 text-[11px] text-[var(--color-text-3)]">الحركة الآن من:</div>
              {current.map((a) => {
                const b = trail.byId.get(a.batchId)
                return (
                  <div key={a.batchId} className="flex justify-between">
                    <span>{b ? batchTitle(b) : '—'}</span>
                    <span className="num font-semibold text-[var(--color-text)]">{money(a.amount, false)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-1 text-[11px] text-[var(--color-text-3)]">تظهر الدفعات اللي لها رصيد في هذا الحساب الآن. التثبيت يخص هذه الحركة فقط.</div>
          )
        }
      />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={CHIP}
        style={{ background: 'var(--color-surface)', borderColor: pinned ? 'var(--color-border-strong)' : 'var(--color-border)', color: pinned ? 'var(--color-text)' : 'var(--color-text-2)' }}
      >
        <TrailIcon size={14} />
        <span className="truncate">{label}</span>
      </button>
    </>
  )
}
