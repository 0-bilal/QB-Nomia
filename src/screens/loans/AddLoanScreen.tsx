import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { ScreenScroll } from '../../components/ScreenScroll'
import { AmountPad } from '../../components/AmountPad'
import type { LoanDirection } from '../../types'

export function AddLoanScreen() {
  const { personId } = useParams<{ personId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { people, accounts, addLoanTransaction } = useData()

  const person = people.find((p) => p.id === personId)
  const initialDirection = (searchParams.get('direction') as LoanDirection) || 'given'

  const [direction, setDirection] = useState<LoanDirection>(initialDirection)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')

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

  function handleSave() {
    if (!canSave || !person) return
    addLoanTransaction({
      personId: person.id,
      direction,
      amount: numericAmount,
      accountId,
      date,
      dueDate: direction === 'given' && dueDate ? dueDate : undefined,
      note,
    })
    navigate(`/loans/${person.id}`, { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            إلغاء
          </button>
          <div className="text-base font-bold">حركة مع {person.name}</div>
          <div className="w-10" />
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
            حفظ الحركة
          </button>
        </div>
      }
    >
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

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">التاريخ</label>
      <input
        type="date"
        dir="ltr"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="num mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13.5px] outline-none"
      />

      {direction === 'given' && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">تاريخ الاستحقاق (اختياري)</label>
          <input
            type="date"
            dir="ltr"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="num mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13.5px] outline-none"
          />
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
