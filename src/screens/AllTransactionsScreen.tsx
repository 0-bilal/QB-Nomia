import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ActivityIcon } from '../components/ActivityIcon'
import { activityEditPath } from '../lib/activityNav'
import { formatDate, formatSigned } from '../lib/format'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  )
}

export function AllTransactionsScreen() {
  const navigate = useNavigate()
  const { recentActivity } = useData()
  const [query, setQuery] = useState('')

  const all = useMemo(
    () => recentActivity(1000000).filter((item) => item.kind === 'expense' || item.kind === 'income' || item.kind === 'transfer'),
    [recentActivity],
  )

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return all
    return all.filter((item) => item.title.includes(q) || item.subtitle.includes(q) || (item.note ?? '').includes(q))
  }, [all, query])

  return (
    <ScreenScroll
      header={<ScreenHeader title="كل الحركات" onBack={() => navigate(-1)} className="pt-8 pb-6" />}
    >
      <div className="qb-card mb-4 flex items-center gap-2 px-4 py-3">
        <span className="text-[var(--color-text-3)]">
          <SearchIcon />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالفئة، الحساب، أو الملاحظة..."
          className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-[var(--color-text-3)]"
        />
      </div>

      {all.length === 0 ? (
        <div className="qb-card py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد حركات بعد</div>
      ) : filtered.length === 0 ? (
        <div className="qb-card py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد نتائج مطابقة</div>
      ) : (
        <div className="qb-card overflow-hidden">
          {filtered.map((item, i) => (
            <button
              key={item.id}
              onClick={() => navigate(activityEditPath(item))}
              className={`qb-press flex w-full items-center gap-3 px-4 py-3 text-right ${i > 0 ? 'border-t qb-divider' : ''}`}
            >
              <div
                className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]"
                style={{ width: 42, height: 42, background: `${item.color}1f`, color: item.color }}
              >
                <ActivityIcon kind={item.kind} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold">{item.title}</div>
                <div className="truncate text-[11.5px] text-[var(--color-text-3)]">
                  {item.subtitle} · {formatDate(item.date)}
                  {item.note ? ` · ${item.note}` : ''}
                </div>
              </div>
              <div className="num flex-shrink-0 text-[13.5px] font-bold" style={{ color: item.color }}>
                {formatSigned(item.amount)}
              </div>
            </button>
          ))}
        </div>
      )}
    </ScreenScroll>
  )
}
