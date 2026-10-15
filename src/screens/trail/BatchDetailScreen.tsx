import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { useMoneyTrail } from '../../hooks/useMoneyTrail'
import type { MoneyBatch, TrailEvent } from '../../lib/moneyTrail'
import { getHideBalancesDefault } from '../../lib/privacy'
import { MONTHS_AR } from '../../lib/txFilters'
import { rise } from '../../lib/motion'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { BigAmount } from '../../components/BigAmount'
import { Avatar } from '../../components/Avatar'
import { ProgressBar } from '../../components/ui'
import { BatchIconBox, BatchStatusBadge, PART_META, longDate, money, useTrailNames } from '../../components/MoneyTrailVisuals'

interface Branch {
  key: string
  label: string
  amount: number
  color: string
  note?: string
  sub?: { label: string; amount: number }[]
}

interface Story {
  key: string
  date: string
  title: string
  note?: string
  amount: number
  sign: '+' | '−' | ''
  color: string
  sub?: { label: string; amount: number }[]
  to?: string
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-[var(--color-text-3)]">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" />
    </svg>
  )
}

function Info({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2.5 rounded-[18px] border border-[var(--color-border)] bg-white/[0.04] px-3.5 py-3 text-[11.5px] leading-relaxed text-[var(--color-text-2)]">
      <InfoIcon />
      <div>{children}</div>
    </div>
  )
}

const sumBy = (events: TrailEvent[], kind: TrailEvent['kind'], personId?: string) =>
  events.filter((e) => e.kind === kind && (personId === undefined || e.personId === personId)).reduce((s, e) => s + e.amount, 0)

export function BatchDetailScreen() {
  const { batchId = '' } = useParams<{ batchId: string }>()
  const navigate = useNavigate()
  const trail = useMoneyTrail()
  const { categories, loanTransactions } = useData()
  const { batchTitle, batchSubtitle, accountName, personName } = useTrailNames()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const batch: MoneyBatch | undefined = trail.byId.get(batchId)

  const categoryName = (id: string) => (id ? (categories.find((c) => c.id === id)?.name ?? 'فئة محذوفة') : 'بدون فئة')

  /** رابط الحركة المسبّبة: مصروف/دخل/تحويل أو حركة سلفة. */
  function linkOf(ref: string): string | undefined {
    const [type, id] = [ref.slice(0, ref.indexOf(':')), ref.slice(ref.indexOf(':') + 1)]
    if (type === 'tx') return `/add/transaction/${id}`
    if (type === 'loan') {
      const l = loanTransactions.find((x) => x.id === id)
      if (!l) return undefined
      return l.expenseId ? `/add/transaction/${l.expenseId}` : `/loans/${l.personId}/edit/${l.id}`
    }
    return undefined
  }

  const branches = useMemo((): Branch[] => {
    if (!batch) return []
    const out: Branch[] = []
    if (batch.spent > 0) {
      const refs = new Set(batch.events.filter((e) => e.kind === 'spent').map((e) => e.ref))
      const sub = Object.entries(batch.spentByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([id, amount]) => ({ label: categoryName(id), amount }))
      out.push({ key: 'spent', label: 'مصاريف', amount: batch.spent, color: PART_META.spent.color, note: `${refs.size} مصروف${sub[0] ? ` · أكثرها ${sub[0].label}` : ''}`, sub: sub.length > 1 ? sub : undefined })
    }
    if (batch.adjusted > 0) out.push({ key: 'adjusted', label: 'فرق مطابقة', amount: batch.adjusted, color: PART_META.adjusted.color, note: 'نقص اكتشفته المطابقة' })
    if (batch.covered > 0) out.push({ key: 'covered', label: 'سدّ عجز سابق', amount: batch.covered, color: PART_META.covered.color, note: 'خروج سابق ما كان له فلوس مسجّلة' })
    for (const [pid, amount] of Object.entries(batch.repaidByPerson)) {
      out.push({ key: `repaid-${pid}`, label: `سداد لـ${personName(pid)}`, amount, color: PART_META.repaid.color, note: 'سداد التزام عليك' })
    }
    for (const [pid, amount] of Object.entries(batch.lentByPerson)) {
      if (amount <= 0) continue
      const given = sumBy(batch.events, 'lent', pid)
      const back = sumBy(batch.events, 'returned', pid)
      out.push({ key: `lent-${pid}`, label: `عند ${personName(pid)}`, amount, color: PART_META.lent.color, note: back > 0 ? `سلفة ${money(given, hidden)} · رجع منها ${money(back, hidden)}` : 'سلفة تنتظر ترجع' })
    }
    for (const [acc, amount] of Object.entries(batch.leftByAccount)) {
      out.push({ key: `left-${acc}`, label: acc ? `في ${accountName(acc)}` : 'باقي لك', amount, color: PART_META.left.color, note: acc && acc !== batch.accountId ? 'تحويل · باقي لك' : 'باقي لك' })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, hidden, categories, accountName, personName])

  const story = useMemo((): Story[] => {
    if (!batch) return []
    const repaidRefs = new Set(batch.events.filter((e) => e.kind === 'repaid').map((e) => e.ref))
    const out: Story[] = []
    for (const e of batch.events) {
      const last = out[out.length - 1]
      if (e.kind === 'spent') {
        const month = e.date.slice(0, 7)
        if (last && last.key.startsWith(`spent-${month}`)) {
          const count = Number(last.key.split('|')[1]) + 1
          last.key = `spent-${month}|${count}`
          last.amount += e.amount
          last.title = `${count} مصاريف`
          const label = categoryName(e.categoryId ?? '')
          const row = last.sub!.find((s) => s.label === label)
          if (row) row.amount += e.amount
          else last.sub!.push({ label, amount: e.amount })
          last.date = `خلال ${MONTHS_AR[Number(month.slice(5)) - 1]}`
          last.note = undefined
          last.to = undefined
          continue
        }
        out.push({ key: `spent-${month}|1`, date: e.date, title: categoryName(e.categoryId ?? ''), note: e.accountId ? accountName(e.accountId) : undefined, amount: e.amount, sign: '−', color: 'var(--color-text)', sub: [{ label: categoryName(e.categoryId ?? ''), amount: e.amount }], to: linkOf(e.ref) })
        continue
      }
      if (e.kind === 'obligation-paid' && repaidRefs.has(e.ref)) continue
      if (e.kind === 'in' && batch.kind === 'unknown') continue
      if (e.kind === 'cover' || e.kind === 'covered') {
        const other = e.batchId ? trail.byId.get(e.batchId) : undefined
        out.push({
          key: `${e.kind}-${e.ref}-${e.batchId}`,
          date: e.date,
          amount: e.amount,
          to: other ? `/trail/${encodeURIComponent(other.id)}` : undefined,
          ...(e.kind === 'cover'
            ? { title: `سدّ عجز سابق في ${accountName(e.accountId)}`, note: other ? `خروج ${longDate(other.date)} ما كان له فلوس وقتها` : undefined, sign: '−' as const, color: 'var(--color-subscription)' }
            : { title: `انسدّ العجز من ${other ? batchTitle(other) : 'دفعة لاحقة'}`, note: 'أول فلوس دخلت الحساب بعده', sign: '' as const, color: 'var(--color-text-2)' }),
        })
        continue
      }
      const base = { key: `${e.kind}-${e.ref}`, date: e.date, amount: e.amount, to: linkOf(e.ref) }
      if (e.kind === 'in') {
        if (batch.kind === 'borrowed') out.push({ ...base, title: `استلمت من ${personName(batch.personId)}${batch.accountId ? ` في ${accountName(batch.accountId)}` : ''}`, note: 'دفعة مقترضة · لا تُحسب في دخل الشهر', sign: '+', color: 'var(--color-owed-by)' })
        else if (batch.kind === 'unknown') out.push({ ...base, title: 'خروج بلا فلوس مسجّلة', note: `${accountName(batch.accountId)} ما كان فيه كفاية وقتها`, sign: '', color: 'var(--color-subscription)' })
        else if (batch.kind === 'adjustment') out.push({ ...base, title: `زيادة من المطابقة في ${accountName(batch.accountId)}`, sign: '+', color: 'var(--color-income)' })
        else out.push({ ...base, title: `استلام في ${accountName(batch.accountId)}`, sign: '+', color: 'var(--color-income)' })
      } else if (e.kind === 'lent') out.push({ ...base, title: `سلفة لـ${personName(e.personId)}`, note: 'تبقى محسوبة على هذه الدفعة حتى ترجع', sign: '−', color: 'var(--color-owed-to)' })
      else if (e.kind === 'returned') out.push({ ...base, title: `رجع من ${personName(e.personId)}`, note: 'رجعت لنفس الدفعة · ما انحسبت دخل جديد', sign: '+', color: 'var(--color-owed-to)' })
      else if (e.kind === 'repaid') out.push({ ...base, title: `سداد لـ${personName(e.personId)}`, note: batch.kind === 'borrowed' && e.personId === batch.personId ? 'من نفس الدفعة' : 'سداد التزام عليك', sign: '−', color: 'var(--color-owed-by)' })
      else if (e.kind === 'obligation-paid') out.push({ ...base, title: `سدّدت لـ${personName(e.personId)}`, note: 'من فلوس دفعة ثانية', sign: '', color: 'var(--color-owed-by)' })
      else if (e.kind === 'moved') out.push({ ...base, title: `تحويل من ${accountName(e.accountId)} إلى ${accountName(e.toAccountId)}`, note: 'نُقلت ولم تُصرف', sign: '', color: 'var(--color-transfer)' })
      else if (e.kind === 'adjust') out.push({ ...base, title: 'فرق مطابقة', note: accountName(e.accountId), sign: '−', color: 'var(--color-text-2)' })
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, categories, accountName, personName, loanTransactions, trail, batchTitle])

  if (!batch) {
    return (
      <ScreenScroll header={<ScreenHeader title="الدفعة" onBack={() => navigate(-1)} />}>
        <div className="qb-card px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">هذه الدفعة ما عادت موجودة — غالبًا انحذفت الحركة اللي أنشأتها.</div>
      </ScreenScroll>
    )
  }

  const borrowed = batch.kind === 'borrowed'
  const lentTotal = sumBy(batch.events, 'lent')
  const firstLendee = batch.events.find((e) => e.kind === 'lent')?.personId
  const heroLabel = batch.kind === 'unknown' ? 'مبلغ بلا مصدر' : 'باقي لك منه'

  return (
    <ScreenScroll header={<ScreenHeader title={batchTitle(batch)} onBack={() => navigate(-1)} right={<EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />} />}>
      <div className="-mt-2 mb-4 flex items-center gap-2 px-1">
        <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-text-3)]">{batchSubtitle(batch)}</span>
        <BatchStatusBadge batch={batch} />
      </div>

      <div className="qb-rise overflow-hidden rounded-[22px] border border-white/[0.09] p-4" style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.06), transparent 55%), linear-gradient(165deg, var(--color-surface-elevated), var(--color-bg))' }}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[12px] text-[var(--color-text-2)]">{heroLabel}</div>
            <BigAmount value={batch.kind === 'unknown' ? batch.amount : batch.left} hidden={hidden} size={30} className="mt-1" color={batch.kind === 'unknown' ? 'var(--color-subscription)' : undefined} />
          </div>
          <div className="text-left">
            <div className="text-[11px] text-[var(--color-text-3)]">من أصل</div>
            <div className="num text-[15px] font-bold text-[var(--color-text-2)]">{money(batch.amount, hidden)}</div>
          </div>
        </div>

        {/* الشجرة: الدفعة جذر، وكل وجهة فرع بشريط نسبتها. */}
        <div className="mt-4 flex items-center gap-2.5 border-t pt-3 qb-divider">
          <BatchIconBox batch={batch} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{batchTitle(batch)}</div>
            <div className="text-[11px] text-[var(--color-text-3)]">{borrowed ? 'سلفة عليك' : batch.kind === 'income' ? 'دخل' : batch.kind === 'opening' ? 'قبل أول حركة' : batch.kind === 'unknown' ? 'غالبًا دخل ما انسجّل' : 'تسوية'}</div>
          </div>
          <span className="num text-[14px] font-bold">{money(batch.amount, hidden)}</span>
        </div>
        <div style={{ paddingInlineStart: 26 }}>
          {branches.map((br, i) => (
            <div key={br.key} className="qb-rise relative py-2.5" style={rise(i)}>
              {/* فرع الشجرة: خط نازل من الجذر (يقف عند آخر فرع) وغصن أفقي عند اسم الوجهة. */}
              <span className="absolute top-0 w-[2px] bg-[var(--color-border-strong)]" style={{ insetInlineStart: -9, height: i === branches.length - 1 ? 21 : '100%' }} />
              <span className="absolute h-[2px] w-[11px] rounded-full bg-[var(--color-border-strong)]" style={{ insetInlineStart: -9, top: 20 }} />
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-[13px] font-semibold">{br.label}</span>
                <span className="num flex-shrink-0 text-[13.5px] font-bold" style={{ color: br.color === PART_META.left.color ? 'var(--color-text)' : br.color }}>
                  {money(br.amount, hidden)}
                </span>
              </div>
              {br.note && <div className="text-[11px] text-[var(--color-text-3)]">{br.note}</div>}
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--color-surface-high)]">
                <span className="qb-trail-grow block h-full rounded-full" style={{ width: `${(br.amount / batch.amount) * 100}%`, background: br.color, animationDelay: `${i * 90}ms` }} />
              </div>
              {br.sub && (
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
      </div>

      {borrowed && (
        <div className="qb-card qb-rise mt-3 p-4" style={rise(1)}>
          <div className="mb-3 text-[12px] text-[var(--color-text-2)]">مسار المبلغ</div>
          <div className="flex items-start">
            <ChainNode label={personName(batch.personId)} sub="أعطاك" amount={money(batch.owed, hidden)} color="var(--color-owed-by)" />
            <ChainArrow color="var(--color-owed-by)" />
            <ChainNode label="أنت" self />
            {firstLendee && (
              <>
                <ChainArrow color="var(--color-owed-to)" />
                <ChainNode label={personName(firstLendee)} sub="أعطيته" amount={money(lentTotal, hidden)} color="var(--color-owed-to)" />
              </>
            )}
          </div>
          <div className="mt-4 border-t pt-3 qb-divider">
            {lentTotal > 0 && (
              <ProgressRow label="رجع من الناس" value={batch.returned} total={lentTotal} color="var(--color-owed-to)" hidden={hidden} />
            )}
            <ProgressRow label={`سدّدت لـ${personName(batch.personId)}`} value={batch.owedPaid} total={batch.owed} color="var(--color-owed-by)" hidden={hidden} />
          </div>
          <div className="mt-3 text-[11.5px] text-[var(--color-text-3)]">
            {batch.owed - batch.owedPaid <= 0
              ? batch.left > 0 || batch.lent > 0
                ? 'الالتزام مسدَّد، والمتبقي منها صار لك.'
                : 'الحلقة مغلقة: الالتزام مسدَّد وما بقي شيء عند أحد.'
              : `باقي عليك لـ${personName(batch.personId)} ${money(batch.owed - batch.owedPaid, hidden)} ر.س`}
          </div>
        </div>
      )}

      {batch.kind === 'unknown' && (
        <div className="mt-3">
          <Info>هذه الحركة كانت أكبر من الفلوس المسجّلة في الحساب وقتها. غالبًا فيه دخل ما انسجّل قبلها — سجّله بتاريخه، أو صحّح مبلغ الحركة، وبتختفي من هنا.</Info>
        </div>
      )}
      {batch.kind === 'opening' && (
        <div className="mt-3">
          <Info>الرصيد اللي كان في الحساب قبل أول حركة سجّلتها. يُصرف قبل أي دخل جديد لأنه أقدم فلوس في الحساب.</Info>
        </div>
      )}

      {story.length > 0 && (
        <>
          <div className="mx-1.5 mb-1 mt-6 flex justify-between">
            <span className="text-[14px] font-semibold">القصة</span>
            <span className="text-[11.5px] text-[var(--color-text-3)]">بالترتيب الزمني</span>
          </div>
          <div className="relative" style={{ paddingInlineStart: 22 }}>
            <span className="absolute w-[2px] rounded-full bg-[var(--color-border-strong)]" style={{ insetInlineStart: 7, top: 8, bottom: 8 }} />
            {story.map((s, i) => {
              const body = (
                <>
                  <span className="absolute h-3 w-3 rounded-full border-2 border-[var(--color-bg)]" style={{ insetInlineStart: -20, top: 14, background: s.color === 'var(--color-text)' ? 'var(--color-expense)' : s.color }} />
                  <div className="text-[10.5px] text-[var(--color-text-3)]">{/^\d{4}-/.test(s.date) ? <span className="num">{longDate(s.date)}</span> : s.date}</div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-[13px] font-semibold">{s.title}</span>
                    <span className="num flex-shrink-0 text-[13.5px] font-bold" dir="ltr" style={{ color: s.color }}>
                      {s.sign}
                      {money(s.amount, hidden)}
                    </span>
                  </div>
                  {s.note && <div className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-text-3)]">{s.note}</div>}
                  {s.sub && s.sub.length > 1 && (
                    <div className="mt-1.5 rounded-[14px] border border-[var(--color-border)] bg-white/[0.03] px-2.5">
                      {s.sub.map((r, j) => (
                        <div key={r.label} className={`flex justify-between py-1.5 text-[11.5px] text-[var(--color-text-2)] ${j > 0 ? 'border-t qb-divider' : ''}`}>
                          <span>{r.label}</span>
                          <span className="num">{money(r.amount, hidden)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
              return s.to ? (
                <button key={s.key + i} onClick={() => navigate(s.to!)} className="qb-press relative block w-full py-2.5 text-right">
                  {body}
                </button>
              ) : (
                <div key={s.key + i} className="relative py-2.5">
                  {body}
                </div>
              )
            })}
          </div>
        </>
      )}

      {batch.kind === 'unknown' && linkOf(batch.ref) && (
        <button onClick={() => navigate(linkOf(batch.ref)!)} className="qb-btn-primary mt-5 h-12 w-full text-[13.5px]">
          فتح الحركة
        </button>
      )}
    </ScreenScroll>
  )
}

function ChainNode({ label, sub, amount, color, self = false }: { label: string; sub?: string; amount?: string; color?: string; self?: boolean }) {
  return (
    <div className="flex w-[76px] flex-shrink-0 flex-col items-center gap-1 text-center">
      {self ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
          أنت
        </span>
      ) : (
        <Avatar name={label} size={44} />
      )}
      {!self && <span className="w-full truncate text-[11.5px] font-semibold">{label}</span>}
      {amount && (
        <span className="num text-[11px]" style={{ color }}>
          {amount}
        </span>
      )}
      {sub && <span className="text-[10px] text-[var(--color-text-3)]">{sub}</span>}
    </div>
  )
}

function ChainArrow({ color }: { color: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center pt-[17px]" style={{ color }}>
      <svg width="100%" height="10" viewBox="0 0 60 10" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M58 5H4M9 1 4 5l5 4" />
      </svg>
    </div>
  )
}

function ProgressRow({ label, value, total, color, hidden }: { label: string; value: number; total: number; color: string; hidden: boolean }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex justify-between text-[12px]">
        <span className="text-[var(--color-text-2)]">{label}</span>
        <span className="num font-bold">
          {money(value, hidden)} <span className="font-medium text-[var(--color-text-3)]">/ {money(total, hidden)}</span>
        </span>
      </div>
      <ProgressBar pct={total > 0 ? (value / total) * 100 : 0} color={color} height={6} />
    </div>
  )
}
