import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import type { TransactionType } from '../types'

const TYPE_COLOR: Record<TransactionType, string> = {
  expense: 'var(--color-expense)',
  income: 'var(--color-income)',
  transfer: 'var(--color-transfer)',
}

export function AddTransactionScreen() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { accounts, categories, incomeSources, addTransaction } = useData()

  const initialType = (searchParams.get('type') as TransactionType) || 'expense'
  const [type, setType] = useState<TransactionType>(initialType)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [transferToId, setTransferToId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState(categories.find((c) => c.kind === 'expense')?.id ?? '')
  const [incomeSourceId, setIncomeSourceId] = useState(incomeSources[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')

  const color = TYPE_COLOR[type]
  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const numericAmount = Number(amount)

  const canSave =
    numericAmount > 0 &&
    accountId &&
    (type !== 'expense' || categoryId) &&
    (type !== 'income' || incomeSourceId) &&
    (type !== 'transfer' || (transferToId && transferToId !== accountId))

  function handleSave() {
    if (!canSave) return
    addTransaction({
      type,
      amount: numericAmount,
      date,
      accountId,
      categoryId: type === 'expense' ? categoryId : undefined,
      incomeSourceId: type === 'income' ? incomeSourceId : undefined,
      transferToAccountId: type === 'transfer' ? transferToId : undefined,
      note,
    })
    navigate('/', { replace: true })
  }

  return (
    <div dir="rtl" className="safe-top flex h-full flex-col px-5 pb-6 pt-8">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
          إلغاء
        </button>
        <div className="text-base font-bold">إضافة حركة</div>
        <div className="w-10" />
      </div>

      <div className="mb-6 flex gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] p-1.25">
        {(
          [
            ['expense', 'مصروف'],
            ['income', 'دخل'],
            ['transfer', 'تحويل'],
          ] as [TransactionType, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="flex-1 rounded-[14px] py-2.75 text-[13.5px] font-bold"
            style={type === t ? { background: `${TYPE_COLOR[t]}26`, color: TYPE_COLOR[t] } : { color: 'var(--color-text-2)' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-6 text-center">
        <div className="mb-2 text-[12.5px] text-[var(--color-text-2)]">المبلغ</div>
        <input
          dir="ltr"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          className="num w-full bg-transparent text-center text-[40px] font-bold outline-none"
          style={{ color }}
        />
      </div>

      {type === 'expense' && (
        <>
          <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">الفئة</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {expenseCategories.length === 0 ? (
              <div className="text-[12.5px] text-[var(--color-text-3)]">لا توجد فئات — أضف واحدة من "المزيد ← فئات المصاريف"</div>
            ) : (
              expenseCategories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
                  style={
                    categoryId === c.id
                      ? { background: `${color}26`, color }
                      : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                  }
                >
                  {c.name}
                </button>
              ))
            )}
          </div>
        </>
      )}

      {type === 'income' && (
        <>
          <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">مصدر الدخل</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {incomeSources.map((s) => (
              <button
                key={s.id}
                onClick={() => setIncomeSourceId(s.id)}
                className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
                style={
                  incomeSourceId === s.id
                    ? { background: `${color}26`, color }
                    : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </>
      )}

      {type === 'transfer' && (
        <>
          <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">من حساب</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {accounts.map((a) => (
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
            ))}
          </div>
          <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">إلى حساب</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {accounts
              .filter((a) => a.id !== accountId)
              .map((a) => (
                <button
                  key={a.id}
                  onClick={() => setTransferToId(a.id)}
                  className="rounded-full px-4 py-2 text-[12.5px] font-semibold"
                  style={
                    transferToId === a.id
                      ? { background: `${color}26`, color }
                      : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
                  }
                >
                  {a.name}
                </button>
              ))}
          </div>
        </>
      )}

      {type !== 'transfer' && (
        <>
          <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">الحساب</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {accounts.map((a) => (
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
            ))}
          </div>
        </>
      )}

      <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">التاريخ</label>
      <input
        type="date"
        dir="ltr"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="num mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13.5px] outline-none"
      />

      <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="مثال: عشاء مع الأصدقاء"
        className="mb-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="mt-auto rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#04140D] disabled:opacity-40"
        style={{ background: color }}
      >
        حفظ الحركة
      </button>
    </div>
  )
}
