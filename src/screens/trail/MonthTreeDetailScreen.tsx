import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SALARY_INCOME_SOURCE_ID, useData } from '../../state/DataContext'
import { monthLedger, type LedgerStep } from '../../lib/monthLedger'
import { categoryColor } from '../../lib/categoryStats'
import { localIso } from '../../lib/homeFeed'
import { shiftMonth } from '../../lib/txFilters'
import { getHideBalancesDefault } from '../../lib/privacy'
import { rise } from '../../lib/motion'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { BigAmount } from '../../components/BigAmount'
import { longDate, money, monthName, monthTitle } from '../../components/MonthTreeVisuals'

interface Branch {
  key: string
  label: string
  note?: string
  amount: number
  color: string
  sub?: { label: string; amount: number }[]
}

/** سطر في المسار الزمني. */
interface Row {
  key: string
  title: string
  note?: string
  amount: number
  sign: '+' | '−' | ''
  color: string
  dot: string
  to?: string
}

const SAVINGS_GREY = 'var(--color-text-2)'

function Tree({ branches, base, hidden }: { branches: Branch[]; base: number; hidden: boolean }) {
  return (
    <div style={{ paddingInlineStart: 26 }}>
      {branches.map((br, i) => (
        <div key={br.key} className="qb-rise relative py-2.5" style={rise(i)}>
          <span className="absolute top-0 w-[2px] bg-[var(--color-border-strong)]" style={{ insetInlineStart: -9, height: i === branches.length - 1 ? 21 : '100%' }} />
          <span className="absolute h-[2px] w-[11px] rounded-full bg-[var(--color-border-strong)]" style={{ insetInlineStart: -9, top: 20 }} />
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-[13px] font-semibold">{br.label}</span>
            <span className="num flex-shrink-0 text-[13.5px] font-bold">{money(br.amount, hidden)}</span>
          </div>
          {br.note && <div className="truncate text-[11px] text-[var(--color-text-3)]">{br.note}</div>}
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--color-surface-high)]">
            <span className="qb-trail-grow block h-full rounded-full" style={{ width: `${Math.max(1.5, (br.amount / base) * 100)}%`, background: br.color, animationDelay: `${i * 60}ms` }} />
          </div>
          {br.sub && br.sub.length > 0 && (
            <div className="mt-2 rounded-[14px] border border-[var(--color-border)] bg-white/[0.03] px-2.5">
              {br.sub.map((s, j) => (
                <div key={s.label} className={`flex justify-between py-1.5 text-[11.5px] text-[var(--color-text-2)] ${j > 0 ? 'border-t qb-divider' : ''}`}>
                  <span>{s.label}</span>
                  <span className="num">{money(s.amount, hidden)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function SectionHead({ title, total, hidden }: { title: string; total: number; hidden: boolean }) {
  return (
    <div className="mx-0.5 mb-1 mt-4 flex items-baseline justify-between text-[12px] font-semibold text-[var(--color-text-2)]">
      <span>{title}</span>
      <span className="num text-[var(--color-text)]">{money(total, hidden)}</span>
    </div>
  )
}

/** شجرة شهر واحد: اللي دخل ووين راح (الحسابات اليومية)، وبطاقة «مدخراتك»، والمسار الزمني. */
export function MonthTreeDetailScreen() {
  const { month = '' } = useParams<{ month: string }>()
  const navigate = useNavigate()
  const { accounts, transactions, loanTransactions, reconciliations, categories, incomeSources, people } = useData()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const valid = /^\d{4}-\d{2}$/.test(month)
  const ledger = useMemo(
    () => (valid ? monthLedger({ accounts, transactions, loanTransactions, reconciliations }, month) : null),
    [valid, accounts, transactions, loanTransactions, reconciliations, month],
  )

  const categoryName = (id?: string) => (id ? (categories.find((c) => c.id === id)?.name ?? 'فئة محذوفة') : 'بدون فئة')
  const colorOf = (id?: string) => {
    const c = categories.find((x) => x.id === id)
    return c ? categoryColor(c) : 'var(--color-text-3)'
  }
  const sourceName = (id?: string) => incomeSources.find((s) => s.id === id)?.name ?? 'دخل'
  const personName = (id?: string) => people.find((p) => p.id === id)?.name ?? 'شخص'
  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name ?? 'حساب محذوف'

  if (!ledger) {
    return (
      <ScreenScroll header={<ScreenHeader title="شجرة المصاريف" onBack={() => navigate(-1)} />}>
        <div className="qb-card px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">الشهر غير صحيح.</div>
      </ScreenScroll>
    )
  }

  const today = localIso(new Date())
  const isCurrent = month === today.slice(0, 7)
  const prevName = monthName(shiftMonth(month, -1))
  const nextName = monthName(shiftMonth(month, 1))
  const l = ledger
  const fromPeopleTotal = l.fromPeople.reduce((s, p) => s + p.amount, 0)
  const withPeopleTotal = l.withPeople.reduce((s, p) => s + p.amount, 0)

  const inBranches: Branch[] = [
    { key: 'carried', label: `مرحّل من ${prevName}`, note: 'باقي الشهر الماضي في حساباتك اليومية', amount: Math.max(0, l.carried), color: 'var(--color-accent)' },
    ...l.income.map((i) => ({
      key: `in-${i.sourceId}`,
      label: sourceName(i.sourceId),
      note: i.count > 1 ? `${i.count} دفعات` : 'دخل',
      amount: i.amount,
      color: i.sourceId === SALARY_INCOME_SOURCE_ID ? 'var(--color-commitment)' : 'var(--color-income)',
    })),
  ]
  if (fromPeopleTotal > 0) {
    inBranches.push({ key: 'from-people', label: 'من الناس', note: l.fromPeople.map((p) => `${personName(p.personId)} ${money(p.amount, hidden)}`).join(' · '), amount: fromPeopleTotal, color: 'var(--color-owed-to)' })
  }
  if (l.withdrawn > 0) inBranches.push({ key: 'withdrawn', label: 'سحبت من مدخراتك', note: 'تحويل من الادخار أو الطوارئ', amount: l.withdrawn, color: 'var(--color-transfer)' })
  if (l.adjustIn > 0) inBranches.push({ key: 'adj-in', label: 'تسوية مطابقة', note: 'زيادة اكتشفتها المطابقة', amount: l.adjustIn, color: 'var(--color-text-3)' })
  const inBase = inBranches.filter((b) => b.key !== 'carried' || b.amount > 0)

  const outBranches: Branch[] = [
    {
      key: 'spent',
      label: 'صرفت',
      note: `${l.byCategory.length} فئات`,
      amount: l.spent,
      color: 'var(--color-expense)',
      sub: l.byCategory.map((c) => ({ label: categoryName(c.categoryId), amount: c.amount })),
    },
  ]
  if (l.saved > 0) outBranches.push({ key: 'saved', label: 'ادّخرت', note: 'للادخار والطوارئ', amount: l.saved, color: 'var(--color-transfer)' })
  if (withPeopleTotal > 0) outBranches.push({ key: 'with-people', label: 'عند الناس', note: l.withPeople.map((p) => `${personName(p.personId)} ${money(p.amount, hidden)}`).join(' · '), amount: withPeopleTotal, color: 'var(--color-owed-to)' })
  if (l.adjustOut > 0) outBranches.push({ key: 'adj-out', label: 'فرق مطابقة', note: 'نقص اكتشفته المطابقة', amount: l.adjustOut, color: 'var(--color-text-3)' })
  outBranches.push(
    l.left >= 0
      ? { key: 'left', label: isCurrent ? 'باقي لين الآن' : `ترحّل لـ${nextName}`, note: isCurrent ? 'يترحّل للشهر الجاي' : `صار «مرحّل» أول ${nextName}`, amount: l.left, color: 'var(--color-accent)' }
      : { key: 'left', label: 'عجز', note: 'صرفت أكثر من اللي كان عندك في حساباتك اليومية', amount: -l.left, color: 'var(--color-expense)' },
  )
  const base = Math.max(l.inTotal, 1)

  // المسار الزمني: المرحّل ثم حركات كل يوم. السلف من نفس الشخص بنفس اليوم والاتجاه تنجمع بسطر.
  const rowsOf = (s: LedgerStep): Omit<Row, 'key'> => {
    const txLink = s.ref.startsWith('tx:') ? `/add/transaction/${s.ref.slice(3)}` : undefined
    const loanLink = s.ref.startsWith('loan:') && s.personId ? `/loans/${s.personId}` : undefined
    switch (s.kind) {
      case 'income':
        return { title: sourceName(s.incomeSourceId), note: s.note, amount: s.amount, sign: '+', color: 'var(--color-income)', dot: 'var(--color-income)', to: txLink }
      case 'expense':
        return { title: categoryName(s.categoryId), note: s.note, amount: s.amount, sign: '−', color: 'var(--color-text)', dot: colorOf(s.categoryId), to: txLink }
      case 'saved':
        return { title: 'ادّخرت', note: `تحويل لـ${accountName(s.toAccountId)}`, amount: s.amount, sign: '', color: 'var(--color-transfer)', dot: 'var(--color-transfer)', to: txLink }
      case 'withdrawn':
        return { title: 'سحبت من مدخراتك', note: `من ${accountName(s.accountId)}`, amount: s.amount, sign: '', color: 'var(--color-transfer)', dot: 'var(--color-transfer)', to: txLink }
      case 'given':
        return { title: `أعطيت ${personName(s.personId)}`, note: s.note, amount: s.amount, sign: '', color: 'var(--color-owed-to)', dot: 'var(--color-owed-to)', to: loanLink }
      case 'received':
        return { title: `استلمت من ${personName(s.personId)}`, note: s.note, amount: s.amount, sign: '', color: 'var(--color-owed-by)', dot: 'var(--color-owed-by)', to: loanLink }
      case 'savings-expense':
        return { title: categoryName(s.categoryId), note: `من مدخراتك · ما تنحسب على الشهر`, amount: s.amount, sign: '−', color: SAVINGS_GREY, dot: SAVINGS_GREY, to: txLink }
      case 'savings-given':
        return { title: `أعطيت ${personName(s.personId)}`, note: 'من مدخراتك', amount: s.amount, sign: '', color: SAVINGS_GREY, dot: SAVINGS_GREY, to: loanLink }
      case 'savings-received':
        return { title: `استلمت من ${personName(s.personId)}`, note: 'في مدخراتك', amount: s.amount, sign: '', color: SAVINGS_GREY, dot: SAVINGS_GREY, to: loanLink }
      default:
        return { title: s.amount >= 0 ? 'تسوية مطابقة' : 'فرق مطابقة', note: accountName(s.accountId), amount: Math.abs(s.amount), sign: s.amount >= 0 ? '+' : '−', color: 'var(--color-text-2)', dot: 'var(--color-text-3)' }
    }
  }
  const days: { date: string; rows: Row[] }[] = []
  for (const s of l.steps) {
    let day = days[days.length - 1]
    if (!day || day.date !== s.date) days.push((day = { date: s.date, rows: [] }))
    const groupKey = (s.kind === 'given' || s.kind === 'received') && s.personId ? `${s.kind}:${s.personId}` : null
    const existing = groupKey ? day.rows.find((r) => r.key === groupKey) : undefined
    if (existing) {
      existing.amount += s.amount
      existing.note = 'أكثر من دفعة'
      continue
    }
    day.rows.push({ key: groupKey ?? s.ref, ...rowsOf(s) })
  }

  const sv = l.savings
  const hasSavings = sv.start !== 0 || sv.added > 0 || sv.spent.length > 0 || sv.lent.length > 0 || sv.withdrawn > 0 || sv.adjusted !== 0

  return (
    <ScreenScroll header={<ScreenHeader title={monthTitle(month)} onBack={() => navigate(-1)} right={<EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />} />}>
      <div className="-mt-2 mb-4 px-1 text-[12px] text-[var(--color-text-3)]">{isCurrent ? `حتى اليوم · ${Number(today.slice(8, 10))} يوم` : 'شهر مكتمل'} · حساباتك اليومية</div>

      <div className="qb-rise overflow-hidden rounded-[22px] border border-white/[0.09] p-4" style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.06), transparent 55%), linear-gradient(165deg, var(--color-surface-elevated), var(--color-bg))' }}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[12px] text-[var(--color-text-2)]">{l.left < 0 ? 'عجز' : isCurrent ? 'باقي لين الآن' : `ترحّل لـ${nextName}`}</div>
            <BigAmount value={Math.abs(l.left)} hidden={hidden} size={30} className="mt-1" color={l.left < 0 ? 'var(--color-expense)' : undefined} />
          </div>
          <div className="text-left">
            <div className="text-[11px] text-[var(--color-text-3)]">دخل الشهر</div>
            <div className="num text-[15px] font-bold" style={{ color: 'var(--color-income)' }}>
              {money(l.incomeTotal, hidden)}
            </div>
          </div>
        </div>

        <SectionHead title="اللي دخل" total={l.inTotal} hidden={hidden} />
        <Tree branches={inBase} base={base} hidden={hidden} />
        <SectionHead title="وين راح" total={l.outTotal} hidden={hidden} />
        <Tree branches={outBranches} base={base} hidden={hidden} />
      </div>

      {hasSavings && (
        <div className="qb-card qb-rise mt-3 p-3.5" style={rise(2)}>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'color-mix(in srgb, var(--color-transfer) 14%, transparent)', color: 'var(--color-transfer)' }}>
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 9v-1M15 12h1" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold">مدخراتك</div>
              <div className="truncate text-[11px] text-[var(--color-text-3)]">الادخار والطوارئ · ما تنحسب على دخل الشهر</div>
            </div>
            <div className="text-left">
              <div className="text-[11px] text-[var(--color-text-3)]">{isCurrent ? 'الآن' : 'آخر الشهر'}</div>
              <div className="num text-[15px] font-bold">{money(sv.end, hidden)}</div>
            </div>
          </div>
          <div className="mt-2.5 rounded-[14px] border border-[var(--color-border)] bg-white/[0.03] px-2.5">
            {[
              { label: 'أول الشهر', value: money(sv.start, hidden), color: undefined },
              sv.added > 0 && { label: 'دخلها هذا الشهر', value: `+${money(sv.added, hidden)}`, color: 'var(--color-transfer)' },
              ...sv.spent.map((x) => ({ label: `صرفت منها · ${categoryName(x.categoryId)}`, value: `−${money(x.amount, hidden)}`, color: undefined })),
              ...sv.lent.map((x) => ({ label: `أعطيت ${personName(x.personId)} منها`, value: `−${money(x.amount, hidden)}`, color: undefined })),
              sv.withdrawn > 0 && { label: 'سحبت منها لحساباتك اليومية', value: `−${money(sv.withdrawn, hidden)}`, color: undefined },
              sv.adjusted !== 0 && { label: 'تسوية مطابقة', value: `${sv.adjusted > 0 ? '+' : '−'}${money(Math.abs(sv.adjusted), hidden)}`, color: undefined },
            ]
              .filter((x): x is { label: string; value: string; color: string | undefined } => Boolean(x))
              .map((x, j) => (
                <div key={x.label} className={`flex justify-between py-1.5 text-[11.5px] text-[var(--color-text-2)] ${j > 0 ? 'border-t qb-divider' : ''}`}>
                  <span>{x.label}</span>
                  <span className="num" dir="ltr" style={{ color: x.color ?? 'var(--color-text)' }}>
                    {x.value}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mx-1.5 mb-1 mt-6 flex justify-between">
        <span className="text-[14px] font-semibold">المسار الزمني</span>
        <span className="text-[11.5px] text-[var(--color-text-3)]">التحويلات بين حساباتك مخفية</span>
      </div>
      <div className="relative" style={{ paddingInlineStart: 22 }}>
        <span className="absolute w-[2px] rounded-full bg-[var(--color-border-strong)]" style={{ insetInlineStart: 7, top: 8, bottom: 8 }} />
        <div className="relative py-2.5">
          <span className="absolute h-3 w-3 rounded-full border-2 border-[var(--color-bg)]" style={{ insetInlineStart: -20, top: 14, background: 'var(--color-accent)' }} />
          <div className="num text-[10.5px] text-[var(--color-text-3)]">{longDate(`${month}-01`)}</div>
          <div className="mt-0.5 flex items-baseline justify-between gap-3">
            <span className="text-[13px] font-semibold">
              مرحّل من {prevName}
              <span className="block text-[11px] font-normal text-[var(--color-text-3)]">باقي في حساباتك اليومية</span>
            </span>
            <span className="num flex-shrink-0 text-[13.5px] font-bold" dir="ltr">
              {l.carried < 0 ? '−' : ''}
              {money(Math.abs(l.carried), hidden)}
            </span>
          </div>
        </div>
        {days.map((day) => (
          <div key={day.date} className="relative py-2.5">
            <span className="absolute h-3 w-3 rounded-full border-2 border-[var(--color-bg)]" style={{ insetInlineStart: -20, top: 14, background: day.rows[0].dot }} />
            <div className="num text-[10.5px] text-[var(--color-text-3)]">{longDate(day.date)}</div>
            {day.rows.map((r) => {
              const body = (
                <>
                  <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: r.dot }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{r.title}</span>
                    {r.note && <span className="block truncate text-[11px] text-[var(--color-text-3)]">{r.note}</span>}
                  </span>
                  <span className="num flex-shrink-0 text-[13.5px] font-bold" dir="ltr" style={{ color: r.color }}>
                    {r.sign}
                    {money(r.amount, hidden)}
                  </span>
                </>
              )
              return r.to ? (
                <button key={r.key} onClick={() => navigate(r.to!)} className="qb-press mt-1 flex w-full items-center gap-2 text-right">
                  {body}
                </button>
              ) : (
                <div key={r.key} className="mt-1 flex items-center gap-2">
                  {body}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </ScreenScroll>
  )
}
