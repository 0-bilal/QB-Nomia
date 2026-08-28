import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { Avatar } from '../../components/Avatar'
import { ScreenScroll } from '../../components/ScreenScroll'
import { formatDate, formatMoney, formatSigned } from '../../lib/format'

function ChevronBackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,5 8,12 15,19" />
    </svg>
  )
}

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
  const label = balance === 0 ? 'متعادل' : balance > 0 ? 'لك عنده' : 'عليك له'
  const color = balance === 0 ? 'var(--color-text-3)' : balance > 0 ? 'var(--color-owed-to)' : 'var(--color-owed-by)'
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''

  const today = new Date().toISOString().slice(0, 10)

  return (
    <ScreenScroll
      contentClassName="px-5 pb-4"
      header={
        <div className="safe-top px-5 pt-8">
          <button
            onClick={() => navigate(-1)}
            aria-label="رجوع"
            className="qb-glass-circle qb-press mb-5 flex h-9.5 w-9.5 items-center justify-center rounded-full border text-[var(--color-text)]"
            style={{ width: 38, height: 38 }}
          >
            <ChevronBackIcon />
          </button>

          <div className="mb-6 flex flex-col items-center">
            <Avatar name={person.name} size={64} />
            <div className="mt-3 flex items-center gap-2">
              <div className="text-lg font-bold">{person.name}</div>
              <button
                onClick={() => navigate(`/loans/${person.id}/edit`)}
                aria-label="تعديل الشخص"
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-2)' }}
              >
                <svg viewBox="0 0 24 24" width="12.5" height="12.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </div>
            {person.phone && <div dir="ltr" className="mt-0.5 text-[12.5px] text-[var(--color-text-3)]">{person.phone}</div>}
            <div className="num mt-4 text-[32px] font-bold" style={{ color }}>
              {formatMoney(Math.abs(balance))}
            </div>
            <div className="text-[12.5px] font-semibold" style={{ color }}>
              {label}
            </div>
          </div>

          <div className="mb-4 flex gap-3">
            <button
              onClick={() => navigate(`/loans/${person.id}/add?direction=given`)}
              className="qb-press flex-1 rounded-2xl py-3 text-[13.5px] font-bold"
              style={{ background: 'rgba(251,146,60,0.14)', color: 'var(--color-owed-by)', border: '1px solid rgba(251,146,60,0.3)' }}
            >
              أعطه مبلغ
            </button>
            <button
              onClick={() => navigate(`/loans/${person.id}/add?direction=received`)}
              className="qb-press flex-1 rounded-2xl py-3 text-[13.5px] font-bold"
              style={{ background: 'rgba(45,212,191,0.14)', color: 'var(--color-owed-to)', border: '1px solid rgba(45,212,191,0.3)' }}
            >
              استلم منه مبلغ
            </button>
          </div>

          <div className="mb-2 text-[14.5px] font-bold">سجل الحركات</div>
        </div>
      }
    >
      {txns.length === 0 ? (
        <div className="qb-card py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد حركات بعد مع {person.name}</div>
      ) : (
        <div className="qb-card overflow-hidden">
          {txns.map((t, i) => {
            const overdue = t.dueDate && t.dueDate < today
            const c = t.direction === 'given' ? 'var(--color-owed-by)' : 'var(--color-owed-to)'
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/loans/${person.id}/edit/${t.id}`)}
                className={`qb-press block w-full px-4 py-3 text-right ${i > 0 ? 'border-t qb-divider' : ''}`}
              >
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
              </button>
            )
          })}
        </div>
      )}
    </ScreenScroll>
  )
}
