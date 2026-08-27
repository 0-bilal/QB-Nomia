import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AmountPad } from '../components/AmountPad'
import { DatePicker } from '../components/DatePicker'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'
import { colorFor } from '../components/Avatar'
import { formatMoney } from '../lib/format'
import type { TransactionType } from '../types'

const TYPE_COLOR: Record<TransactionType, string> = {
  expense: 'var(--color-expense)',
  income: 'var(--color-income)',
  transfer: 'var(--color-transfer)',
}

export function ConfirmRecurringScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { recurringTransactions, accounts, categories, incomeSources, confirmRecurringTransaction } = useData()

  const recurring = recurringTransactions.find((r) => r.id === id)

  const [amount, setAmount] = useState(recurring ? String(recurring.amount) : '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState(recurring?.note ?? '')

  if (!recurring) {
    return (
      <ScreenScroll header={<ScreenHeader title="تأكيد حركة متكررة" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">هذي الحركة المتكررة ما عادت موجودة</div>
      </ScreenScroll>
    )
  }

  const color = TYPE_COLOR[recurring.type]
  const account = accounts.find((a) => a.id === recurring.accountId)
  const transferToAccount = accounts.find((a) => a.id === recurring.transferToAccountId)
  const category = categories.find((c) => c.id === recurring.categoryId)
  const incomeSource = incomeSources.find((s) => s.id === recurring.incomeSourceId)
  const numericAmount = Number(amount)
  const canConfirm = numericAmount > 0 && date

  function handleConfirm() {
    if (!recurring || !canConfirm) return
    confirmRecurringTransaction(recurring.id, { amount: numericAmount, date, note })
    navigate('/recurring', { replace: true })
  }

  return (
    <ScreenScroll
      header={<ScreenHeader title="مراجعة وتأكيد" onBack={() => navigate(-1)} cancelLabel="إغلاق" className="pt-8 pb-6" />}
      footer={
        <div className="flex flex-col gap-2.5 px-5 pb-6 pt-3">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="qb-press w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#0A0A0C] disabled:opacity-40"
            style={{ background: color }}
          >
            تأكيد وتسجيل الحركة
          </button>
          <button
            onClick={() => navigate(-1)}
            className="qb-press w-full rounded-2xl border border-[var(--color-border)] py-3.5 text-center text-[13.5px] font-semibold text-[var(--color-text-2)]"
          >
            لم تحدث بعد — ذكّرني لاحقًا
          </button>
        </div>
      }
    >
      <div className="mb-6 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'var(--color-text-2)' }}>
        راجع تفاصيل "{recurring.name}" وعدّل المبلغ أو التاريخ لو اختلف عن المعتاد قبل ما تسجّلها كحركة فعلية.
      </div>

      <div className="mb-6 text-center">
        <div className="mb-1 text-[13.5px] font-bold">{recurring.name}</div>
        <div className="mb-3 text-[12px] text-[var(--color-text-2)]">المبلغ الفعلي هذي المرة</div>
        <div className="num text-[40px] font-bold" style={{ color }}>
          {amount || '0'}
        </div>
      </div>

      <div className="mb-6">
        <AmountPad value={amount} onChange={setAmount} color={color} />
      </div>

      <div className="mb-5">
        <DatePicker value={date} onChange={setDate} color={color} fieldLabel="تاريخ الحركة" />
      </div>

      <div className="mb-5 flex flex-col gap-2.5">
        <div
          className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
        >
          <div
            className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-[12px]"
            style={{ width: 38, height: 38, background: account ? ACCOUNT_ICON_BG[account.type] : 'rgba(255,255,255,0.08)', color: account ? ACCOUNT_ICON_COLOR[account.type] : 'var(--color-text-3)' }}
          >
            {account ? <AccountTypeIcon type={account.type} size={17} /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-[var(--color-text-3)]">{recurring.type === 'transfer' ? 'من حساب' : 'الحساب'}</div>
            <div className="truncate text-[13.5px] font-bold">{account?.name ?? '—'}</div>
          </div>
          {account && (
            <span className="num text-[12.5px] font-semibold" style={{ color: ACCOUNT_ICON_COLOR[account.type] }}>
              {ACCOUNT_TYPE_LABELS[account.type]}
            </span>
          )}
        </div>

        {recurring.type === 'transfer' && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <div
              className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-[12px]"
              style={{ width: 38, height: 38, background: transferToAccount ? ACCOUNT_ICON_BG[transferToAccount.type] : 'rgba(255,255,255,0.08)', color: transferToAccount ? ACCOUNT_ICON_COLOR[transferToAccount.type] : 'var(--color-text-3)' }}
            >
              {transferToAccount ? <AccountTypeIcon type={transferToAccount.type} size={17} /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-[var(--color-text-3)]">إلى حساب</div>
              <div className="truncate text-[13.5px] font-bold">{transferToAccount?.name ?? '—'}</div>
            </div>
          </div>
        )}

        {recurring.type === 'expense' && category && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <div
              className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-[12px]"
              style={{ width: 38, height: 38, background: `${colorFor(category.name)}22`, color: colorFor(category.name) }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>{category.name.trim().charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-[var(--color-text-3)]">الفئة</div>
              <div className="truncate text-[13.5px] font-bold">{category.name}</div>
            </div>
          </div>
        )}

        {recurring.type === 'income' && incomeSource && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
            <div
              className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-[12px]"
              style={{ width: 38, height: 38, background: `${colorFor(incomeSource.name)}22`, color: colorFor(incomeSource.name) }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>{incomeSource.name.trim().charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-[var(--color-text-3)]">مصدر الدخل</div>
              <div className="truncate text-[13.5px] font-bold">{incomeSource.name}</div>
            </div>
          </div>
        )}
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="مثال: خصم سلفة قديمة من الراتب"
        className="mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <div className="mb-2 text-center text-[11px] text-[var(--color-text-3)]">
        الرصيد الحالي: {account ? formatMoney(account.balance) : '—'}
      </div>
    </ScreenScroll>
  )
}
