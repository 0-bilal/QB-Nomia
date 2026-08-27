import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { ScreenScroll } from '../../components/ScreenScroll'
import { AmountPad } from '../../components/AmountPad'
import { DatePicker } from '../../components/DatePicker'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { formatMoney } from '../../lib/format'
import type { LoanDirection } from '../../types'

export function AddLoanScreen() {
  const { personId, loanId } = useParams<{ personId: string; loanId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { people, accounts, loanTransactions, addLoanTransaction, updateLoanTransaction, deleteLoanTransaction } = useData()

  const person = people.find((p) => p.id === personId)
  const existing = loanId ? loanTransactions.find((t) => t.id === loanId) : undefined
  const isEditing = Boolean(existing)
  const initialDirection = existing?.direction ?? ((searchParams.get('direction') as LoanDirection) || 'given')

  const [direction, setDirection] = useState<LoanDirection>(initialDirection)
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [accountId, setAccountId] = useState(existing?.accountId ?? accounts[0]?.id ?? '')
  const [date, setDate] = useState(existing?.date ?? new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  if (!person) {
    return (
      <div dir="rtl" className="safe-top px-5 pt-15 text-center text-[13px] text-[var(--color-text-3)]">
        هذا الشخص غير موجود
      </div>
    )
  }

  const color = direction === 'given' ? 'var(--color-owed-by)' : 'var(--color-owed-to)'
  const numericAmount = Number(amount)
  const canSave = numericAmount > 0 && accountId
  const selectedAccount = accounts.find((a) => a.id === accountId)

  function handleSave() {
    if (!canSave || !person) return
    const input = {
      personId: person.id,
      direction,
      amount: numericAmount,
      accountId,
      date,
      dueDate: direction === 'given' && dueDate ? dueDate : undefined,
      note,
    }
    if (isEditing && loanId) updateLoanTransaction(loanId, input)
    else addLoanTransaction(input)
    navigate(`/loans/${person.id}`, { replace: true })
  }

  function handleDelete() {
    if (!loanId || !person) return
    deleteLoanTransaction(loanId)
    navigate(`/loans/${person.id}`, { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            إلغاء
          </button>
          <div className="text-base font-bold">{isEditing ? 'تعديل حركة' : `حركة مع ${person.name}`}</div>
          {isEditing ? (
            <button onClick={() => setConfirmDeleteOpen(true)} className="text-[13px] font-semibold" style={{ color: 'var(--color-expense)' }}>
              حذف
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      }
      footer={
        <div className="px-5 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#04140D] disabled:opacity-40"
            style={{ background: color }}
          >
            {isEditing ? 'حفظ التعديلات' : 'حفظ الحركة'}
          </button>
        </div>
      }
    >
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="حذف الحركة"
        message="بيتم حذف هذي الحركة نهائيًا، ورصيد الحساب المرتبط بيرجع لوضعه قبلها."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <div className="mb-6 flex gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] p-1.25">
        <button
          onClick={() => setDirection('given')}
          className="flex-1 rounded-[14px] py-2.75 text-[13.5px] font-bold"
          style={direction === 'given' ? { background: 'rgba(251,146,60,0.2)', color: 'var(--color-owed-by)' } : { color: 'var(--color-text-2)' }}
        >
          أعطيته مبلغ
        </button>
        <button
          onClick={() => setDirection('received')}
          className="flex-1 rounded-[14px] py-2.75 text-[13.5px] font-bold"
          style={direction === 'received' ? { background: 'rgba(45,212,191,0.2)', color: 'var(--color-owed-to)' } : { color: 'var(--color-text-2)' }}
        >
          استلمت منه مبلغ
        </button>
      </div>

      <div
        className="mb-6 rounded-3xl border p-4"
        style={{ borderColor: `${color}40`, background: `linear-gradient(160deg, ${color}17 0%, transparent 100%)` }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold" style={{ color }}>
            {direction === 'given' ? 'أعطيته مبلغ' : 'استلمت منه مبلغ'}
          </span>
          <span className="text-[12.5px] font-semibold text-[var(--color-text-2)]">{selectedAccount?.name ?? 'اختر حسابًا'}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-[var(--color-text-3)]">الرصيد الحالي</span>
          <span className="num text-[22px] font-bold" style={{ color }}>
            {selectedAccount ? formatMoney(selectedAccount.balance) : '—'}
          </span>
        </div>
      </div>

      <div className="mb-6 text-center">
        <div className="mb-2 text-[12.5px] text-[var(--color-text-2)]">المبلغ</div>
        <div className="num text-[40px] font-bold" style={{ color }}>
          {amount || '0'}
        </div>
      </div>

      <div className="mb-6">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">الحساب</label>
      <div className="mb-5 flex flex-wrap gap-2">
        {accounts.length === 0 ? (
          <button type="button" onClick={() => navigate('/accounts/new')} className="text-[12.5px] font-semibold underline" style={{ color }}>
            لا توجد حسابات — أضف حسابًا أولًا
          </button>
        ) : (
          accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => setAccountId(a.id)}
              className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
              style={
                accountId === a.id
                  ? { background: `${color}26`, color }
                  : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
              }
            >
              {a.name}
            </button>
          ))
        )}
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">التاريخ</label>
      <div className="mb-5">
        <DatePicker value={date} onChange={setDate} color={color} />
      </div>

      {direction === 'given' && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">تاريخ الاستحقاق (اختياري)</label>
          <div className="mb-5">
            <DatePicker value={dueDate} onChange={setDueDate} color={color} placeholder="بدون تاريخ استحقاق" />
          </div>
        </>
      )}

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="مثال: سلفة راتب"
        className="mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />
    </ScreenScroll>
  )
}
