import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { BigAmount } from '../components/BigAmount'
import { colorFor } from '../components/Avatar'
import { EmptyState, HeaderAddButton, HeroCard, HeroLabel, IconBubble, ListGroup, ListItem, ProgressBar, SectionTitle } from '../components/ui'

export function IncomeSourcesScreen() {
  const { incomeSources, transactions } = useData()
  const navigate = useNavigate()

  function totalFor(sourceId: string): number {
    return transactions
      .filter((t) => t.type === 'income' && t.incomeSourceId === sourceId)
      .reduce((s, t) => s + t.amount, 0)
  }

  const rows = incomeSources.map((s) => ({ source: s, total: totalFor(s.id) })).sort((a, b) => b.total - a.total)
  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0)

  return (
    <ScreenScroll header={<ScreenHeader title="مصادر الدخل" onBack={() => navigate(-1)} right={<HeaderAddButton label="إضافة مصدر دخل" onClick={() => navigate('/income-sources/new')} />} />}>
      <HeroCard className="mb-6">
        <HeroLabel>إجمالي الدخل المسجَّل</HeroLabel>
        <BigAmount value={grandTotal} size={36} color="var(--color-income)" />
        {grandTotal > 0 && (
          <div className="mt-4 flex h-3 gap-1 overflow-hidden rounded-full">
            {rows
              .filter((r) => r.total > 0)
              .map((r) => (
                <div key={r.source.id} className="h-full rounded-full" style={{ width: `${(r.total / grandTotal) * 100}%`, background: colorFor(r.source.name) }} />
              ))}
          </div>
        )}
      </HeroCard>

      <SectionTitle title="المصادر" hint="اضغط أي مصدر لتعديل اسمه أو حذفه" />
      {incomeSources.length === 0 ? (
        <EmptyState title="لا توجد مصادر دخل بعد" actionLabel="إضافة مصدر" onAction={() => navigate('/income-sources/new')} />
      ) : (
        <ListGroup className="qb-rise">
          {rows.map(({ source, total }, i) => {
            const c = colorFor(source.name)
            return (
              <ListItem
                key={source.id}
                divider={i > 0}
                onClick={() => navigate(`/income-sources/${source.id}/edit`)}
                leading={
                  <IconBubble color={c}>
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{source.name.trim().charAt(0) || '؟'}</span>
                  </IconBubble>
                }
                title={source.name}
                subtitle={grandTotal > 0 ? `${Math.round((total / grandTotal) * 100)}% من دخلك` : undefined}
                trailing={
                  <span className="num text-[14px] font-bold" style={{ color: 'var(--color-income)' }}>
                    {formatMoney(total)}
                  </span>
                }
                footer={grandTotal > 0 ? <ProgressBar pct={(total / grandTotal) * 100} color={c} height={5} /> : undefined}
              />
            )
          })}
        </ListGroup>
      )}
    </ScreenScroll>
  )
}
