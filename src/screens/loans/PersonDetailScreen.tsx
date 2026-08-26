import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { Avatar } from '../../components/Avatar'
import { formatDate, formatMoney, formatSigned } from '../../lib/format'

export function PersonDetailScreen() {
  const { personId } = useParams<{ personId: string }>()
  const { people, personBalance, personTransactions, accounts } = useData()
  const navigate = useNavigate()

  const person = people.find((p) => p.id === personId)
  if (!person) {
    return (
      <div dir="rtl" className="safe-top px-5 pt-15 text-center text-[13px] text-[var(--color-text-3)]">
        هذا الشخص غير موجود
      </div>
    )
  }

  const balance = personBalance(person.id)
  const txns = personTransactions(person.id)
  const label = balance === 0 ? 'متعادل' : balance > 0 ? 'له عندك' : 'عليك له'
  const color = balance === 0 ? 'var(--color-text-3)' : balance > 0 ? 'var(--color-owed-to)' : 'var(--color-owed-by)'
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div dir="rtl" className="safe-top px-5 pb-6 pt-8">
      <button onClick={() => navigate(-1)} className="mb-5 text-[13px] text-[var(--color-text-2)]">
        ← رجوع
      </button>

      <div className="mb-6 flex flex-col items-center">
        <Avatar name={person.name} size={64} />
        <div className="mt-3 text-lg font-bold">{person.name}</div>
        {person.phone && <div dir="ltr" className="mt-0.5 text-[12.5px] text-[var(--color-text-3)]">{person.phone}</div>}
        <div className="num mt-4 text-[32px] font-bold" style={{ color }}>
          {formatMoney(Math.abs(balance))}
        </div>
        <div className="text-[12.5px] font-semibold" style={{ color }}>
          {label}
        </div>
      </div>

      <div className="mb-6 flex gap-3">
        <button
          onClick={() => navigate(`/loans/${person.id}/add?direction=given`)}
          className="flex-1 rounded-2xl py-3 text-[13.5px] font-bold"
          style={{ background: 'rgba(251,146,60,0.14)', color: 'var(--color-owed-by)', border: '1px solid rgba(251,146,60,0.3)' }}
        >
          أعطه مبلغ
        </button>
        <button
          onClick={() => navigate(`/loans/${person.id}/add?direction=received`)}
          className="flex-1 rounded-2xl py-3 text-[13.5px] font-bold"
          style={{ background: 'rgba(45,212,191,0.14)', color: 'var(--color-owed-to)', border: '1px solid rgba(45,212,191,0.3)' }}
        >
          استلم منه مبلغ
        </button>
      </div>

      <div className="mb-2 text-[14.5px] font-bold">سجل الحركات</div>

      {txns.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد حركات بعد مع {person.name}</div>
      ) : (
        <div className="border-t border-white/6">
          {txns.map((t) => {
            const overdue = t.dueDate && t.dueDate < today
            const c = t.direction === 'given' ? 'var(--color-owed-by)' : 'var(--color-owed-to)'
            return (
              <div key={t.id} className="border-b border-white/6 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[13.5px] font-semibold">{t.direction === 'given' ? 'أعطيته' : 'استلمت منه'}</div>
                    <div className="mt-0.5 text-[11.5px] text-[var(--color-text-3)]">
                      {formatDate(t.date)} · {accountName(t.accountId)}
                      {t.note ? ` · ${t.note}` : ''}
                    </div>
                  </div>
                  <div className="num text-[13.5px] font-bold" style={{ color: c }}>
                    {formatSigned(t.direction === 'given' ? t.amount : -t.amount)}
                  </div>
                </div>
                {t.dueDate && (
                  <div
                    className="mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={
                      overdue
                        ? { background: 'rgba(255,92,92,0.14)', color: 'var(--color-expense)' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-2)' }
                    }
                  >
                    {overdue ? 'متأخر السداد' : `الاستحقاق: ${formatDate(t.dueDate)}`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
