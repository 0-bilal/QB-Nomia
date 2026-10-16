import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SALARY_INCOME_SOURCE_ID, useData } from '../../state/DataContext'
import { salaryPeriods } from '../../lib/salaryTree'
import { categoryColor } from '../../lib/categoryStats'
import { groupByDay } from '../../lib/homeFeed'
import { getHideBalancesDefault } from '../../lib/privacy'
import { rise } from '../../lib/motion'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { BigAmount } from '../../components/BigAmount'
import { TreeIcon, longDate, money, periodLabel, salaryTitle } from '../../components/SalaryTreeVisuals'
import { PREVIOUS_STRIPES } from '../../components/MonthSummary'

interface Branch {
  key: string
  label: string
  note: string
  amount: number
  color: string
}

/** سطر في المسار الزمني: مصروف أو تحويل أو سلفة. */
interface Step {
  key: string
  date: string
  title: string
  note?: string
  amount: number
  /** '−' مصروف، '' تحويل/سلفة (بلونها بدون إشارة). */
  sign: '−' | ''
  dot: string
  amountColor?: string
  to: string
}

const ORDER = { expense: 0, transfer: 1, loan: 2 } as const

/** شجرة راتب واحد: الراتب جذر، وفروعه المصاريف حسب الفئة والتحويلات والسلف، ثم المسار الزمني لفترته. */
export function SalaryTreeDetailScreen() {
  const { salaryId = '' } = useParams<{ salaryId: string }>()
  const navigate = useNavigate()
  const { transactions, loanTransactions, categories, accounts, people } = useData()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const period = useMemo(
    () => salaryPeriods(transactions, SALARY_INCOME_SOURCE_ID, loanTransactions).find((p) => p.salary.id === salaryId),
    [transactions, loanTransactions, salaryId],
  )

  const categoryName = (id: string) => (id ? (categories.find((c) => c.id === id)?.name ?? 'فئة محذوفة') : 'بدون فئة')
  const colorOf = (id: string) => {
    const c = categories.find((x) => x.id === id)
    return c ? categoryColor(c) : 'var(--color-text-3)'
  }
  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name ?? 'حساب محذوف'
  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? 'شخص'

  if (!period) {
    return (
      <ScreenScroll header={<ScreenHeader title="شجرة المصاريف" onBack={() => navigate(-1)} />}>
        <div className="qb-card px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">هذا الراتب ما عاد موجودًا — غالبًا انحذفت حركته.</div>
      </ScreenScroll>
    )
  }

  const { salary } = period
  const over = period.left < 0
  const salaryAccount = accounts.find((a) => a.id === salary.accountId)?.name

  // الفروع: المصاريف حسب الفئة، ثم التحويلات حسب الحساب، ثم السلف حسب الشخص، وآخرها الباقي.
  const branches: Branch[] = period.byCategory.map((c) => ({ key: c.categoryId || 'none', label: categoryName(c.categoryId), note: `${c.count} مصروف`, amount: c.amount, color: colorOf(c.categoryId) }))
  for (const d of period.byDestination) {
    branches.push({ key: `to-${d.accountId}`, label: `تحويل إلى ${accountName(d.accountId)}`, note: `${d.count} تحويل · ما انحسب مصروف`, amount: d.amount, color: 'var(--color-transfer)' })
  }
  for (const g of period.byPerson) {
    branches.push(
      g.direction === 'given'
        ? { key: `given-${g.personId}`, label: `أعطيت ${personName(g.personId)}`, note: `${g.count} سلفة · تنقص من الباقي`, amount: g.amount, color: 'var(--color-owed-to)' }
        : { key: `received-${g.personId}`, label: `استلمت من ${personName(g.personId)}`, note: `${g.count} سلفة · ما تنحسب من الراتب`, amount: g.amount, color: 'var(--color-owed-by)' },
    )
  }
  // من رصيد سابق: مصروف غطّاه رصيد كان قبل الراتب (مثل الشراء من الادخار) — ما ينقص من الراتب.
  for (const p of period.previousSources) {
    branches.push({
      key: `prev-${p.accountId}`,
      label: `من رصيد سابق ← ${accountName(p.accountId)}`,
      note: p.viaTransfer > 0 ? 'سحبته لحساب ثاني · ما ينقص من الراتب' : 'ما ينقص من الراتب',
      amount: p.amount,
      color: PREVIOUS_STRIPES,
    })
  }
  if (period.left > 0) branches.push({ key: 'left', label: 'باقي من الراتب', note: period.to ? 'ما انصرف ولا طلع خلال فترته' : 'لين الآن', amount: period.left, color: 'var(--color-accent)' })
  const base = Math.max(salary.amount, period.spent - period.fromPrevious + period.transferred + period.lent, ...branches.map((b) => b.amount)) || 1

  // المسار الزمني: كل حركات الفترة مجمّعة باليوم (المصروف ثم التحويل ثم السلفة داخل اليوم).
  const steps: (Step & { order: number })[] = [
    ...period.expenses.map((t) => {
      const prev = period.expensePrevious.get(t.id)
      const prevNote = prev ? `${prev.amount < t.amount ? `${money(prev.amount, hidden)} ` : ''}من رصيد ${prev.accountIds.map(accountName).join(' و')} السابق` : ''
      return {
      key: t.id,
      date: t.date,
      title: categoryName(t.categoryId ?? ''),
      note: [t.note, prevNote].filter(Boolean).join(' · ') || undefined,
      amount: t.amount,
      sign: '−' as const,
      dot: colorOf(t.categoryId ?? ''),
      to: `/add/transaction/${t.id}`,
      order: ORDER.expense,
      }
    }),
    ...period.transfers.map((t) => ({
      key: t.id,
      date: t.date,
      title: `تحويل إلى ${accountName(t.transferToAccountId)}`,
      note: t.note || 'ما انحسب مصروف',
      amount: t.amount,
      sign: '' as const,
      dot: 'var(--color-transfer)',
      amountColor: 'var(--color-transfer)',
      to: `/add/transaction/${t.id}`,
      order: ORDER.transfer,
    })),
    ...period.loans.map((l) => {
      const given = l.direction === 'given'
      const c = given ? 'var(--color-owed-to)' : 'var(--color-owed-by)'
      return {
        key: l.id,
        date: l.date,
        title: given ? `سلفة لـ${personName(l.personId)}` : `استلمت من ${personName(l.personId)}`,
        note: l.note || (given ? 'تنقص من الباقي' : l.expenseId ? 'صُرفت مباشرة على مصروف' : 'ما تنحسب من الراتب'),
        amount: l.amount,
        sign: '' as const,
        dot: c,
        amountColor: c,
        to: l.expenseId ? `/add/transaction/${l.expenseId}` : `/loans/${l.personId}/edit/${l.id}`,
        order: ORDER.loan,
      }
    }),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.order - a.order))
  const days = [...groupByDay(steps)].reverse()

  const summary = [
    { label: period.fromPrevious > 0 ? 'صُرف من الراتب' : 'صُرف', value: period.spent - period.fromPrevious, color: 'var(--color-text-2)', show: true },
    { label: 'من رصيد سابق', value: period.fromPrevious, color: 'var(--color-text-2)', show: period.fromPrevious > 0 },
    { label: 'حوّلت', value: period.transferred, color: 'var(--color-transfer)', show: period.transferred > 0 },
    { label: 'أعطيت', value: period.lent, color: 'var(--color-owed-to)', show: period.lent > 0 },
    { label: 'استلمت', value: period.borrowed, color: 'var(--color-owed-by)', show: period.borrowed > 0 },
  ].filter((x) => x.show)

  const counts = [
    `${period.expenses.length} مصروف`,
    period.transfers.length > 0 && `${period.transfers.length} تحويل`,
    period.loans.length > 0 && `${period.loans.length} سلفة`,
  ].filter(Boolean)

  return (
    <ScreenScroll header={<ScreenHeader title={salaryTitle(salary.date)} onBack={() => navigate(-1)} right={<EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />} />}>
      <div className="-mt-2 mb-4 flex items-center gap-2 px-1">
        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-text-3)]">
          {periodLabel(period.from, period.to)}
          {salaryAccount ? ` · ${salaryAccount}` : ''}
        </span>
        {!period.to && (
          <span className="rounded-full px-2 py-[3px] text-[10.5px] font-semibold" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-2)' }}>
            الحالي
          </span>
        )}
      </div>

      <div className="qb-rise overflow-hidden rounded-[22px] border border-white/[0.09] p-4" style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.06), transparent 55%), linear-gradient(165deg, var(--color-surface-elevated), var(--color-bg))' }}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[12px] text-[var(--color-text-2)]">{over ? 'تجاوزت الراتب بـ' : 'باقي من الراتب'}</div>
            <BigAmount value={Math.abs(period.left)} hidden={hidden} size={30} className="mt-1" color={over ? 'var(--color-expense)' : undefined} />
          </div>
          <div className="text-left">
            <div className="text-[11px] text-[var(--color-text-3)]">من أصل</div>
            <div className="num text-[15px] font-bold text-[var(--color-text-2)]">{money(salary.amount, hidden)}</div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-2 text-[11px] text-[var(--color-text-3)]">
          {summary.map((x, i) => (
            <span key={x.label}>
              {i > 0 && '· '}
              {x.label}{' '}
              <span className="num" style={{ color: x.color }}>
                {money(x.value, hidden)}
              </span>
            </span>
          ))}
        </div>

        {/* الشجرة: الراتب جذر، وكل وجهة فرع بشريط نسبتها. */}
        <div className="mt-4 flex items-center gap-2.5 border-t pt-3 qb-divider">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'color-mix(in srgb, var(--color-income) 15%, transparent)', color: 'var(--color-income)' }}>
            <TreeIcon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{salaryTitle(salary.date)}</div>
            <div className="truncate text-[11px] text-[var(--color-text-3)]">{counts.join(' · ')} خلال الفترة</div>
          </div>
          <span className="num text-[14px] font-bold">{money(salary.amount, hidden)}</span>
        </div>
        {branches.length === 0 ? (
          <div className="pt-3 text-center text-[12px] text-[var(--color-text-3)]">ما سجّلت أي حركة بعد هذا الراتب</div>
        ) : (
          <div style={{ paddingInlineStart: 26 }}>
            {branches.map((br, i) => (
              <div key={br.key} className="qb-rise relative py-2.5" style={rise(i)}>
                <span className="absolute top-0 w-[2px] bg-[var(--color-border-strong)]" style={{ insetInlineStart: -9, height: i === branches.length - 1 ? 21 : '100%' }} />
                <span className="absolute h-[2px] w-[11px] rounded-full bg-[var(--color-border-strong)]" style={{ insetInlineStart: -9, top: 20 }} />
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-[13px] font-semibold">{br.label}</span>
                  <span className="num flex-shrink-0 text-[13.5px] font-bold">{money(br.amount, hidden)}</span>
                </div>
                <div className="text-[11px] text-[var(--color-text-3)]">{br.note}</div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--color-surface-high)]">
                  <span className="qb-trail-grow block h-full rounded-full" style={{ width: `${(br.amount / base) * 100}%`, background: br.color, animationDelay: `${i * 70}ms` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {days.length > 0 && (
        <>
          <div className="mx-1.5 mb-1 mt-6 flex justify-between">
            <span className="text-[14px] font-semibold">المسار الزمني</span>
            <span className="text-[11.5px] text-[var(--color-text-3)]">من نزول الراتب</span>
          </div>
          <div className="relative" style={{ paddingInlineStart: 22 }}>
            <span className="absolute w-[2px] rounded-full bg-[var(--color-border-strong)]" style={{ insetInlineStart: 7, top: 8, bottom: 8 }} />
            <div className="relative py-2.5">
              <span className="absolute h-3 w-3 rounded-full border-2 border-[var(--color-bg)]" style={{ insetInlineStart: -20, top: 14, background: 'var(--color-income)' }} />
              <div className="num text-[10.5px] text-[var(--color-text-3)]">{longDate(salary.date)}</div>
              <div className="mt-0.5 flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-semibold">نزل الراتب{salaryAccount ? ` في ${salaryAccount}` : ''}</span>
                <span className="num flex-shrink-0 text-[13.5px] font-bold" dir="ltr" style={{ color: 'var(--color-income)' }}>
                  +{money(salary.amount, hidden)}
                </span>
              </div>
            </div>
            {days.map((day) => {
              const items = [...day.items].reverse()
              const spentToday = items.filter((s) => s.sign === '−')
              return (
                <div key={day.date} className="relative py-2.5">
                  <span className="absolute h-3 w-3 rounded-full border-2 border-[var(--color-bg)]" style={{ insetInlineStart: -20, top: 14, background: spentToday.length > 0 ? 'var(--color-expense)' : items[0].dot }} />
                  <div className="flex justify-between text-[10.5px] text-[var(--color-text-3)]">
                    <span className="num">{longDate(day.date)}</span>
                    {spentToday.length > 1 && (
                      <span className="num" dir="ltr">
                        −{money(spentToday.reduce((s, t) => s + t.amount, 0), hidden)}
                      </span>
                    )}
                  </div>
                  {items.map((s) => (
                    <button key={s.key} onClick={() => navigate(s.to)} className="qb-press mt-1 flex w-full items-center gap-2 text-right">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.dot }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{s.title}</span>
                        {s.note && <span className="block truncate text-[11px] text-[var(--color-text-3)]">{s.note}</span>}
                      </span>
                      <span className="num flex-shrink-0 text-[13.5px] font-bold" dir="ltr" style={s.amountColor ? { color: s.amountColor } : undefined}>
                        {s.sign}
                        {money(s.amount, hidden)}
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </>
      )}
    </ScreenScroll>
  )
}
