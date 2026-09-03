import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatDate } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AmountPad } from '../components/AmountPad'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'

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
        <span className="num text-[32px] font-bold">{amount || '0'}</span>
        <span className="flex-shrink-0 text-[13px] font-semibold text-[var(--color-text-3)]">ر.س</span>
      </div>
      <div className="mb-4 flex justify-center">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      <label className="mb-1.5 block text-[12px] text-[var(--color-text-3)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="سبب المخالفة"
        className="mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <div className="flex gap-2.5">
        <button onClick={onCancel} className="flex-1 rounded-2xl border border-[var(--color-border)] py-2.75 text-[13px] font-semibold text-[var(--color-text-2)]">
          إلغاء
        </button>
        <button
          onClick={() => canSave && onSave(numeric, note)}
          disabled={!canSave}
          className="flex-1 rounded-2xl py-2.75 text-[13px] font-bold text-[#0A0A0C] disabled:opacity-40"
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

export function SalaryViolationsScreen() {
  const navigate = useNavigate()
  const { salaryViolations, updateSalaryViolation, deleteSalaryViolation, accounts } = useData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const total = salaryViolations.reduce((sum, v) => sum + v.amount, 0)
  const editingViolation = editingId ? salaryViolations.find((v) => v.id === editingId) : undefined

  return (
    <ScreenScroll header={<ScreenHeader title="خصومات المخالفات" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
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

      <div className="qb-card-elevated mb-5 p-4.5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ width: 44, height: 44, background: 'rgba(239,68,68,0.14)', color }}>
            <SalaryViolationIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold">خصومات المخالفات</div>
            <div className="truncate text-[11px] text-[var(--color-text-3)]">تُسجَّل مباشرة عند إضافة حركة راتب فيها خصم مخالفة</div>
          </div>
        </div>

        {editingViolation ? (
          <EditViolationForm
            initial={{ amount: editingViolation.amount, note: editingViolation.note }}
            onSave={(amount, note) => {
              updateSalaryViolation(editingViolation.id, { amount, note })
              setEditingId(null)
            }}
            onDelete={() => setConfirmDeleteId(editingViolation.id)}
            onCancel={() => setEditingId(null)}
          />
        ) : total === 0 ? (
          <div className="rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(239,68,68,0.4)', color: 'var(--color-text-2)' }}>
            لا توجد خصومات مسجَّلة بعد. تقدر تضيف خصم مخالفة عند تسجيل حركة راتب جديدة.
          </div>
        ) : (
          <div>
            <div className="text-[11.5px] text-[var(--color-text-3)]">إجمالي الخصومات</div>
            <div className="num text-[22px] font-bold" style={{ color }}>
              {formatMoney(total)}
            </div>
          </div>
        )}
      </div>

      <div className="qb-section-label mb-2 px-1">سجل الخصومات</div>
      {salaryViolations.length === 0 ? (
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">لا يوجد سجل بعد</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {salaryViolations.map((v) => {
            const account = accounts.find((acc) => acc.id === v.accountId)
            return (
              <button key={v.id} onClick={() => setEditingId(v.id)} className="qb-card qb-press p-3.5 text-right">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-bold">{formatDate(v.date)}</div>
                  <span className="num text-[13px] font-bold" style={{ color }}>
                    {formatMoney(v.amount)}
                  </span>
                </div>
                {account && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-3)]">
                    <AccountTypeIcon type={account.type} size={13} />
                    <span>{account.name} · {ACCOUNT_TYPE_LABELS[account.type]}</span>
                  </div>
                )}
                {v.note && <div className="mt-1 text-[11px] text-[var(--color-text-3)]">{v.note}</div>}
              </button>
            )
          })}
        </div>
      )}
    </ScreenScroll>
  )
}
