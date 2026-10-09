import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { Avatar } from '../../components/Avatar'
import { formatAmount, formatMoney } from '../../lib/format'
import { ChipRow, EmptyState, ListGroup, ListItem, SearchField } from '../../components/ui'
import { DEBT_META } from './debtTypes'
import { DebtHero, NUM_SHADOW, SectionHead } from './DebtVisuals'
import { useDebtHistory } from './useDebtHistory'

type Filter = 'all' | 'owedToMe' | 'iOwe'

/** محتوى تبويب "أشخاص" داخل شاشة الديون والسلف — بدون رأس خاص به (الرأس + زر الإضافة بالمستوى الأعلى). */
export function PeoplePanel() {
  const { people, personBalance, totalOwedToMe, totalIOwe } = useData()
  const h = useDebtHistory()
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
      <DebtHero
        color={DEBT_META.people.color}
        dates={h.dates}
        series={[
          { color: 'var(--color-owed-to)', values: h.owedToMe },
          { color: 'var(--color-owed-by)', values: h.iOwePeople },
        ]}
      >
        {({ scrub, chart }) => (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'لك عند الآخرين', value: scrub === null ? totalOwedToMe : h.owedToMe[scrub], color: 'var(--color-owed-to)', icon: <ArrowIn /> },
                { label: 'عليك للآخرين', value: scrub === null ? totalIOwe : h.iOwePeople[scrub], color: 'var(--color-owed-by)', icon: <ArrowOut /> },
              ].map((x) => (
                <div key={x.label}>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-3)]">
                    <span style={{ color: x.color }}>{x.icon}</span>
                    {x.label}
                  </div>
                  <div className="num mt-1 text-[24px] font-bold" style={{ color: x.color, textShadow: NUM_SHADOW }}>
                    {formatAmount(x.value)}
                  </div>
                </div>
              ))}
            </div>
            {chart && <div className="-mt-2">{chart}</div>}
            <button onClick={() => navigate('/loans/new')} className={`qb-btn-primary flex w-full items-center justify-center gap-2 py-3 text-[13.5px] ${chart ? 'mt-1' : 'mt-4'}`}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              إضافة شخص
            </button>
          </>
        )}
      </DebtHero>

      <SectionHead title="الأشخاص" hint="اضغط لفتح دفتر الحساب" />
      <SearchField value={query} onChange={setQuery} placeholder="ابحث بالاسم..." className="mb-3" />

      <ChipRow
        options={[
          ['all', 'الكل'],
          ['owedToMe', 'لك عندهم'],
          ['iOwe', 'عليك لهم'],
        ]}
        value={filter}
        onChange={setFilter}
      />

      {people.length === 0 ? (
        <EmptyState
          icon={<PeopleGlyph />}
          title="ما أضفت أي شخص بعد"
          desc="أضف الأشخاص اللي تتبادل معهم سلفًا، وكل شخص يصير له دفتر حساب جارٍ مستقل."
          actionLabel="إضافة شخص"
          onAction={() => navigate('/loans/new')}
        />
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[var(--color-text-3)]">لا يوجد أشخاص مطابقون</div>
      ) : (
        <ListGroup>
          {rows.map(({ person, balance }, i) => {
            const color = balance === 0 ? 'var(--color-text-3)' : balance > 0 ? 'var(--color-owed-to)' : 'var(--color-owed-by)'
            return (
              <ListItem
                key={person.id}
                divider={i > 0}
                onClick={() => navigate(`/loans/${person.id}`)}
                leading={<Avatar name={person.name} size={44} />}
                title={person.name}
                subtitle={person.phone || 'بدون رقم جوال'}
                chevron
                trailing={
                  <div className="flex flex-col items-end">
                    <span className="num text-[14px] font-bold" style={{ color }}>
                      {balance === 0 ? '—' : formatMoney(Math.abs(balance))}
                    </span>
                    <span className="text-[10.5px] font-medium" style={{ color }}>
                      {balance === 0 ? 'متعادل' : balance > 0 ? 'لك عنده' : 'عليك له'}
                    </span>
                  </div>
                }
              />
            )
          })}
        </ListGroup>
      )}
    </>
  )
}

function ArrowIn() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 7 7 17M15 17H7V9" />
    </svg>
  )
}
function ArrowOut() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  )
}
function PeopleGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.3 14.2c2.5.4 4.2 1.9 4.2 4.8" />
    </svg>
  )
}
