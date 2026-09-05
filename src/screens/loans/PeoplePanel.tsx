import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { Avatar } from '../../components/Avatar'
import { formatMoney } from '../../lib/format'

type Filter = 'all' | 'owedToMe' | 'iOwe'

/** محتوى تبويب "أشخاص" داخل شاشة الديون والسلف — بدون رأس خاص به (الرأس + زر الإضافة بالمستوى الأعلى). */
export function PeoplePanel() {
  const { people, personBalance, totalOwedToMe, totalIOwe } = useData()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    return people
      .map((p) => ({ person: p, balance: personBalance(p.id) }))
      .filter(({ person }) => person.name.includes(query.trim()))
      .filter(({ balance }) => {
        if (filter === 'owedToMe') return balance > 0
        if (filter === 'iOwe') return balance < 0
        return true
      })
  }, [people, personBalance, filter, query])

  return (
    <>
      <div className="mb-4 flex gap-2.5">
        <div className="qb-card flex-1 p-3.5">
          <div className="mb-1 text-[11px] text-[var(--color-text-2)]">إجمالي مستحق لك</div>
          <div className="num text-base font-bold" style={{ color: 'var(--color-owed-to)' }}>
            {formatMoney(totalOwedToMe)}
          </div>
        </div>
        <div className="qb-card flex-1 p-3.5">
          <div className="mb-1 text-[11px] text-[var(--color-text-2)]">إجمالي عليك للغير</div>
          <div className="num text-base font-bold" style={{ color: 'var(--color-owed-by)' }}>
            {formatMoney(totalIOwe)}
          </div>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث بالاسم..."
        className="mb-3.5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-[13.5px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <div className="mb-4 flex gap-2">
        {(
          [
            ['all', 'الكل'],
            ['owedToMe', 'مدينون لي'],
            ['iOwe', 'أنا مدين لهم'],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="rounded-full px-4 py-1.75 text-[12.5px] font-semibold"
            style={
              filter === key
                ? { background: 'rgba(255,255,255,0.15)', color: 'var(--color-accent)' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[var(--color-text-3)]">لا يوجد أشخاص مطابقون</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map(({ person, balance }) => (
            <button
              key={person.id}
              onClick={() => navigate(`/loans/${person.id}`)}
              className="qb-card qb-press flex items-center gap-3 p-3.5 text-right"
            >
              <Avatar name={person.name} />
              <div className="flex-1">
                <div className="text-[14px] font-bold">{person.name}</div>
                <div className="text-[11.5px] text-[var(--color-text-3)]">{person.phone || 'بدون رقم جوال'}</div>
              </div>
              <div
                className="num text-[13.5px] font-bold"
                style={{ color: balance === 0 ? 'var(--color-text-3)' : balance > 0 ? 'var(--color-owed-to)' : 'var(--color-owed-by)' }}
              >
                {balance === 0 ? 'متعادل' : formatMoney(Math.abs(balance))}
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
