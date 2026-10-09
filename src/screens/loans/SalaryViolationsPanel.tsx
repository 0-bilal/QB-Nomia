import { useState } from 'react'
import { useData } from '../../state/DataContext'
import { formatAmount, formatMoney, formatDate } from '../../lib/format'
import { AmountPad } from '../../components/AmountPad'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/ui'
import { softBg } from './debtTypes'
import { DebtHero, NUM_SHADOW, SectionHead } from './DebtVisuals'
import { useDebtHistory } from './useDebtHistory'
import { MONTHS_AR } from '../../lib/txFilters'

const color = 'var(--color-expense)'

function SalaryViolationIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 22 20.5H2Z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * محرر تعديل خصم مخالفة مضمّن — بدون اختيار حساب (الحساب موروث من حركة
 * الراتب المرتبطة ولا يتغيّر)، فقط المبلغ وملاحظة اختيارية.
 */
function EditViolationForm({
  initial,
  onSave,
  onDelete,
  onCancel,
}: {
  initial: { amount: number; note?: string }
  onSave: (amount: number, note: string) => void
  onDelete: () => void
  onCancel: () => void
}) {
  const [amount, setAmount] = useState(String(initial.amount))
  const [note, setNote] = useState(initial.note ?? '')

  const numeric = Number(amount)
  const canSave = numeric > 0

  return (
    <div>
      <div className="mb-1.5 text-[12px] text-[var(--color-text-3)]">مبلغ الخصم</div>
      <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
        <span key={amount} className="num text-[44px] font-bold tracking-tight" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }}>{amount || '0'}</span>
        <span className="flex-shrink-0 text-[16px] font-medium text-[var(--color-text-3)]">ر.س</span>
      </div>
      <div className="mb-4 flex justify-center">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="سبب المخالفة"
        className="mb-4 w-full rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3.5 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <div className="flex gap-2.5">
        <button onClick={onCancel} className="qb-press flex-1 rounded-full bg-white/[0.06] py-3 text-[13.5px] font-medium text-[var(--color-text)]">
          إلغاء
        </button>
        <button
          onClick={() => canSave && onSave(numeric, note)}
          disabled={!canSave}
          className="qb-press flex-1 rounded-full py-3 text-[13.5px] font-semibold text-[#0A0A0C] disabled:opacity-35"
          style={{ background: color }}
        >
          حفظ
        </button>
      </div>

      <button onClick={onDelete} className="qb-press mt-3 w-full text-center text-[12.5px] font-semibold" style={{ color }}>
        حذف الخصم
      </button>
    </div>
  )
}

/** محتوى تبويب "خصومات المخالفات" داخل شاشة الديون والسلف. */
export function SalaryViolationsPanel() {
  const { salaryViolations, updateSalaryViolation, deleteSalaryViolation } = useData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const year = String(new Date().getFullYear())
  const sorted = [...salaryViolations].sort((a, b) => b.date.localeCompare(a.date))
  const yearTotal = salaryViolations.filter((v) => v.date.startsWith(year)).reduce((sum, v) => sum + v.amount, 0)
  const h = useDebtHistory()
  /** مجموع السنة الآن، أو حتى الأسبوع المختار على السبارك. */
  const shownAt = (scrub: number | null) => (scrub === null ? yearTotal : h.violations[scrub])
  const editingViolation = editingId ? salaryViolations.find((v) => v.id === editingId) : undefined

  return (
    <>
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="حذف الخصم"
        message="بيتم حذف هذا الخصم، ويرجع مبلغه لحركة الراتب المرتبطة به ولرصيد الحساب."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={() => {
          if (confirmDeleteId) deleteSalaryViolation(confirmDeleteId)
          setConfirmDeleteId(null)
          setEditingId(null)
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <DebtHero color={color} dates={h.dates} series={editingViolation ? undefined : [{ color, values: h.violations }]} chartHeight={84}>
        {({ scrub, chart }) =>
        editingViolation ? (
          <EditViolationForm
            initial={{ amount: editingViolation.amount, note: editingViolation.note }}
            onSave={(amount, note) => {
              updateSalaryViolation(editingViolation.id, { amount, note })
              setEditingId(null)
            }}
            onDelete={() => setConfirmDeleteId(editingViolation.id)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <>
            <div className="text-[12.5px] font-medium text-[var(--color-text-2)]">خصومات هذه السنة</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-[34px] font-bold" style={{ color: shownAt(scrub) > 0 ? color : 'var(--color-text-2)', textShadow: NUM_SHADOW }}>
                {formatAmount(shownAt(scrub))}
              </span>
              <span className="text-[13px] font-medium text-[var(--color-text-3)]">ر.س</span>
            </div>
            <div className="mt-0.5 text-[11.5px] text-[var(--color-text-3)]">
              {scrub !== null ? (
                'مجموع خصومات السنة حتى هذا الأسبوع'
              ) : sorted.length === 0 ? (
                'لا توجد خصومات مسجَّلة بعد'
              ) : (
                <>
                  {salaryViolations.length} خصومات · آخرها <span className="num">{formatDate(sorted[0].date)}</span>
                </>
              )}
            </div>
            {chart && (
              // السبارك بدل أعمدة الأشهر: مجموع السنة تراكميًا، الأقدم يسارًا واليوم يمينًا.
              <>
                <div className="mt-1">{chart}</div>
                <div dir="ltr" className="mt-1 flex justify-between text-[10px] text-[var(--color-text-3)]">
                  <span>{MONTHS_AR[Number(h.dates[0].slice(5, 7)) - 1]}</span>
                  <span>اليوم</span>
                </div>
              </>
            )}
          </>
        )
        }
      </DebtHero>

      <div className="mx-1 mt-3 flex items-center gap-2.5 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[11.5px] text-[var(--color-text-2)]">
        <span className="flex-shrink-0 text-[var(--color-text-3)]">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6M12 7.5h.01" />
          </svg>
        </span>
        تُسجَّل الخصومات عند إضافة حركة راتب فيها خصم مخالفة
      </div>

      <SectionHead title="سجل الخصومات" hint={sorted.length ? 'اضغط للتعديل' : undefined} />
      {sorted.length === 0 ? (
        <EmptyState title="لا يوجد سجل بعد" />
      ) : (
        <div className="qb-card px-3.5 py-1">
          {sorted.map((v) => (
            <button
              key={v.id}
              onClick={() => setEditingId(v.id)}
              className="flex w-full items-center gap-3 border-t border-[var(--color-border)] py-2.5 text-right first:border-t-0"
            >
              <span className="flex flex-shrink-0 items-center justify-center" style={{ width: 40, height: 40, borderRadius: 14, background: softBg(color), color }}>
                <SalaryViolationIcon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold">{v.note?.trim() || 'خصم مخالفة'}</div>
                <div className="mt-0.5 text-[10.5px] text-[var(--color-text-3)]">
                  <span className="num">{formatDate(v.date)}</span> · من راتب الشهر
                </div>
              </div>
              <span dir="ltr" className="num flex-shrink-0 text-[13.5px] font-bold" style={{ color }}>
                −{formatMoney(v.amount)}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
