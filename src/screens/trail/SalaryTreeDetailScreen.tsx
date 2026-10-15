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

interface Branch {
  key: string
  label: string
  note: string
  amount: number
  color: string
}

/** شجرة راتب واحد: الراتب جذر وكل فئة فرع بنسبتها، ثم المسار الزمني لمصاريف فترته. */
export function SalaryTreeDetailScreen() {
  const { salaryId = '' } = useParams<{ salaryId: string }>()
  const navigate = useNavigate()
  const { transactions, categories, accounts } = useData()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const period = useMemo(() => salaryPeriods(transactions, SALARY_INCOME_SOURCE_ID).find((p) => p.salary.id === salaryId), [transactions, salaryId])

  const categoryName = (id: string) => (id ? (categories.find((c) => c.id === id)?.name ?? 'فئة محذوفة') : 'بدون فئة')
  const colorOf = (id: string) => {
    const c = categories.find((x) => x.id === id)
    return c ? categoryColor(c) : 'var(--color-text-3)'
  }

  if (!period) {
    return (
      <ScreenScroll header={<ScreenHeader title="شجرة المصاريف" onBack={() => navigate(-1)} />}>
        <div className="qb-card px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">هذا الراتب ما عاد موجودًا — غالبًا انحذفت حركته.</div>
      </ScreenScroll>
    )
  }

  const { salary } = period
  const over = period.left < 0
  const branches: Branch[] = period.byCategory.map((c) => ({
    key: c.categoryId || 'none',
    label: categoryName(c.categoryId),
    note: `${c.count} مصروف`,
    amount: c.amount,
    color: colorOf(c.categoryId),
  }))
  const nameOfAccount = (id?: string) => accounts.find((a) => a.id === id)?.name ?? 'حساب محذوف'
  for (const d of period.byDestination) {
    branches.push({ key: `to-${d.accountId}`, label: `تحويل إلى ${nameOfAccount(d.accountId)}`, note: `${d.count} تحويل · ما انحسب مصروف`, amount: d.amount, color: 'var(--color-transfer)' })
  }
  if (period.left > 0) branches.push({ key: 'left', label: 'باقي من الراتب', note: period.to ? 'ما انصرف ولا انحوّل خلال فترته' : 'لين الآن', amount: period.left, color: 'var(--color-accent)' })
  const base = Math.max(salary.amount, period.spent + period.transferred) || 1
  const accountName = accounts.find((a) => a.id === salary.accountId)?.name
  // المسار الزمني: المصاريف والتحويلات معًا، مجمّعة باليوم.
  const days = groupByDay([...period.expenses, ...period.transfers].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)))

  return (
    <ScreenScroll header={<ScreenHeader title={salaryTitle(salary.date)} onBack={() => navigate(-1)} right={<EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />} />}>
      <div className="-mt-2 mb-4 flex items-center gap-2 px-1">
        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-text-3)]">
          {periodLabel(period.from, period.to)}
          {accountName ? ` · ${accountName}` : ''}
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
            <div className="mt-1.5 text-[11px] text-[var(--color-text-3)]">
              صُرف <span className="num text-[var(--color-text-2)]">{money(period.spent, hidden)}</span>
              {period.transferred > 0 && (
                <>
                  {' · '}حوّلت <span className="num" style={{ color: 'var(--color-transfer)' }}>{money(period.transferred, hidden)}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-left">
            <div className="text-[11px] text-[var(--color-text-3)]">من أصل</div>
            <div className="num text-[15px] font-bold text-[var(--color-text-2)]">{money(salary.amount, hidden)}</div>
          </div>
        </div>

        {/* الشجرة: الراتب جذر، وكل فئة فرع بشريط نسبتها من الراتب. */}
        <div className="mt-4 flex items-center gap-2.5 border-t pt-3 qb-divider">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'color-mix(in srgb, var(--color-income) 15%, transparent)', color: 'var(--color-income)' }}>
            <TreeIcon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{salaryTitle(salary.date)}</div>
            <div className="text-[11px] text-[var(--color-text-3)]">
              <span className="num">{period.expenses.length}</span> مصروف
              {period.transfers.length > 0 && (
                <>
                  {' · '}
                  <span className="num">{period.transfers.length}</span> تحويل
                </>
              )}{' '}
              خلال الفترة
            </div>
          </div>
          <span className="num text-[14px] font-bold">{money(salary.amount, hidden)}</span>
        </div>
        {branches.length === 0 ? (
          <div className="pt-3 text-center text-[12px] text-[var(--color-text-3)]">ما سجّلت مصاريف ولا تحويلات بعد هذا الراتب</div>
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
                <span className="text-[13px] font-semibold">نزل الراتب{accountName ? ` في ${accountName}` : ''}</span>
                <span className="num flex-shrink-0 text-[13.5px] font-bold" dir="ltr" style={{ color: 'var(--color-income)' }}>
                  +{money(salary.amount, hidden)}
                </span>
              </div>
            </div>
            {[...days].reverse().map((day) => (
              <div key={day.date} className="relative py-2.5">
                <span
                  className="absolute h-3 w-3 rounded-full border-2 border-[var(--color-bg)]"
                  style={{ insetInlineStart: -20, top: 14, background: day.items.every((t) => t.type === 'transfer') ? 'var(--color-transfer)' : 'var(--color-expense)' }}
                />
                <div className="flex justify-between text-[10.5px] text-[var(--color-text-3)]">
                  <span className="num">{longDate(day.date)}</span>
                  {day.items.filter((t) => t.type === 'expense').length > 1 && (
                    <span className="num" dir="ltr">
                      −{money(day.items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0), hidden)}
                    </span>
                  )}
                </div>
                {[...day.items].reverse().map((t) =>
                  t.type === 'transfer' ? (
                    <button key={t.id} onClick={() => navigate(`/add/transaction/${t.id}`)} className="qb-press mt-1 flex w-full items-center gap-2 text-right">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: 'var(--color-transfer)' }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">تحويل إلى {nameOfAccount(t.transferToAccountId)}</span>
                        <span className="block truncate text-[11px] text-[var(--color-text-3)]">{t.note || 'ما انحسب مصروف'}</span>
                      </span>
                      <span className="num flex-shrink-0 text-[13.5px] font-bold" style={{ color: 'var(--color-transfer)' }}>
                        {money(t.amount, hidden)}
                      </span>
                    </button>
                  ) : (
                  <button key={t.id} onClick={() => navigate(`/add/transaction/${t.id}`)} className="qb-press mt-1 flex w-full items-center gap-2 text-right">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: colorOf(t.categoryId ?? '') }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{categoryName(t.categoryId ?? '')}</span>
                      {t.note && <span className="block truncate text-[11px] text-[var(--color-text-3)]">{t.note}</span>}
                    </span>
                    <span className="num flex-shrink-0 text-[13.5px] font-bold" dir="ltr">
                      −{money(t.amount, hidden)}
                    </span>
                  </button>
                  ),
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </ScreenScroll>
  )
}
