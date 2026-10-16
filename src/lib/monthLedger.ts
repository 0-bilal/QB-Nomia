import type { Account, AccountType, LoanTransaction, Reconciliation, Transaction } from '../types'

/**
 * شجرة الشهر: كشف كل شهر تقويمي.
 *
 * الحسابات تنقسم تلقائيًا حسب نوعها: «مدخرات» (ادخار، طوارئ) و«يومية» (كل ما عداها). الشجرة على الحسابات اليومية:
 *   اللي دخل  = مرحّل من الشهر الماضي + دخل الشهر (حسب المصدر) + من الناس + سحبت من مدخراتك
 *   وين راح   = صرفت (حسب الفئة) + ادّخرت + عند الناس + باقي يترحّل للشهر الجاي
 * والطرفان متساويان دائمًا. التحويل داخل نفس المجموعة ما يظهر (نقل فلوس بس).
 * الصرف من المدخرات يظهر في بطاقة «مدخراتك» وما ينقص من الشهر.
 * المرحّل = رصيد الحسابات اليومية أول الشهر، محسوب للخلف من الرصيد الحالي.
 */

export const SAVINGS_TYPES: AccountType[] = ['savings', 'emergency']
export const isSavingsType = (type?: AccountType) => !!type && SAVINGS_TYPES.includes(type)

export interface LedgerInput {
  accounts: Pick<Account, 'id' | 'type' | 'balance'>[]
  transactions: Transaction[]
  loanTransactions: LoanTransaction[]
  reconciliations: Reconciliation[]
}

export type StepKind = 'income' | 'expense' | 'saved' | 'withdrawn' | 'given' | 'received' | 'savings-expense' | 'savings-given' | 'savings-received' | 'adjust'

export interface LedgerStep {
  kind: StepKind
  date: string
  amount: number
  /** «tx:<id>» أو «loan:<id>» أو «rec:<id>». */
  ref: string
  categoryId?: string
  incomeSourceId?: string
  personId?: string
  accountId?: string
  toAccountId?: string
  note?: string
}

export interface MonthLedger {
  /** «YYYY-MM». */
  month: string
  /** رصيد الحسابات اليومية أول الشهر. */
  carried: number
  income: { sourceId: string; amount: number; count: number }[]
  incomeTotal: number
  /** صافي ما دخل من كل شخص (استرجاع أو سلفة) — الحسابات اليومية. */
  fromPeople: { personId: string; amount: number }[]
  /** صافي المسحوب من المدخرات للحسابات اليومية (لو السحب أكبر من الادخار). */
  withdrawn: number
  /** تسوية مطابقة بالزيادة على الحسابات اليومية. */
  adjustIn: number
  spent: number
  byCategory: { categoryId: string; amount: number; count: number }[]
  /** صافي ما دخل المدخرات من الشهر (تحويلات + دخل نزل فيها − سحب). */
  saved: number
  /** صافي ما طلع لكل شخص — الحسابات اليومية. */
  withPeople: { personId: string; amount: number }[]
  /** تسوية مطابقة بالنقص على الحسابات اليومية. */
  adjustOut: number
  /** رصيد الحسابات اليومية آخر الشهر — يترحّل للشهر الجاي. */
  left: number
  /** مجموع كل طرف (متساويان). */
  inTotal: number
  outTotal: number
  savings: {
    start: number
    /** تحويلات من اليومية + دخل نزل في المدخرات + سلف استلمتها فيها + تسوية بالزيادة. */
    added: number
    spent: { categoryId: string; amount: number }[]
    lent: { personId: string; amount: number }[]
    /** محوَّل منها للحسابات اليومية. */
    withdrawn: number
    adjusted: number
    end: number
  }
  /** حركات الشهر بالترتيب الزمني (الأقدم أولًا) — بدون التحويلات داخل نفس المجموعة. */
  steps: LedgerStep[]
}

const toC = (n: number) => Math.round(n * 100)
const toS = (c: number) => c / 100
const monthStart = (m: string) => `${m}-01`
const monthEnd = (m: string) => `${m}-31`

/** أثر حركة على رصيد كل حساب (بالهللة). */
function effects(input: LedgerInput): { date: string; acc: string; delta: number }[] {
  const out: { date: string; acc: string; delta: number }[] = []
  for (const t of input.transactions) {
    const c = toC(t.amount)
    if (t.type === 'income') out.push({ date: t.date, acc: t.accountId ?? '', delta: c })
    else if (t.type === 'expense') out.push({ date: t.date, acc: t.accountId ?? '', delta: -c })
    else if (t.transferToAccountId) {
      out.push({ date: t.date, acc: t.accountId ?? '', delta: -c })
      out.push({ date: t.date, acc: t.transferToAccountId, delta: c })
    }
  }
  for (const l of input.loanTransactions) out.push({ date: l.date, acc: l.accountId ?? '', delta: l.direction === 'given' ? -toC(l.amount) : toC(l.amount) })
  for (const r of input.reconciliations) if (r.resolution === 'adjust' && r.difference) out.push({ date: r.date, acc: r.accountId, delta: toC(r.difference) })
  return out
}

/** كل الأشهر من أقدم حركة لين الشهر الحالي — الأحدث أولًا. */
export function ledgerMonths(input: LedgerInput, today: string): string[] {
  const dates = [...input.transactions.map((t) => t.date), ...input.loanTransactions.map((l) => l.date)].filter((d) => d <= today).sort()
  const first = (dates[0] ?? today).slice(0, 7)
  const last = today.slice(0, 7)
  const out: string[] = []
  let [y, m] = first.split('-').map(Number)
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    out.push(key)
    if (key >= last) break
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out.reverse()
}

export function monthLedger(input: LedgerInput, month: string): MonthLedger {
  const from = monthStart(month)
  const to = monthEnd(month)
  const typeOf = new Map(input.accounts.map((a) => [a.id, a.type]))
  const isSav = (acc: string) => isSavingsType(typeOf.get(acc))

  // رصيد كل مجموعة أول الشهر = الرصيد الحالي − أثر كل الحركات من أول الشهر فصاعدًا.
  let dailyStart = 0
  let savStart = 0
  for (const a of input.accounts) {
    if (isSav(a.id)) savStart += toC(a.balance)
    else dailyStart += toC(a.balance)
  }
  for (const e of effects(input)) {
    if (e.date < from) continue
    if (isSav(e.acc)) savStart -= e.delta
    else dailyStart -= e.delta
  }

  const steps: LedgerStep[] = []
  const income = new Map<string, { amount: number; count: number }>()
  const cats = new Map<string, { amount: number; count: number }>()
  const people = new Map<string, number>()
  const savSpent = new Map<string, number>()
  const savLent = new Map<string, number>()
  let incomeTotal = 0
  let spent = 0
  let deposits = 0
  let withdrawals = 0
  let incomeIntoSav = 0
  let adjDaily = 0
  let savAdded = 0
  let savAdjusted = 0
  const inMonth = (d: string) => d >= from && d <= to

  for (const t of input.transactions) {
    if (!inMonth(t.date)) continue
    const c = toC(t.amount)
    const acc = t.accountId ?? ''
    const base = { date: t.date, amount: c, ref: `tx:${t.id}`, note: t.note, accountId: acc || undefined }
    if (t.type === 'income') {
      incomeTotal += c
      const key = t.incomeSourceId ?? ''
      const g = income.get(key) ?? { amount: 0, count: 0 }
      g.amount += c
      g.count++
      income.set(key, g)
      if (isSav(acc)) {
        incomeIntoSav += c
        savAdded += c
      }
      steps.push({ ...base, kind: 'income', incomeSourceId: t.incomeSourceId })
    } else if (t.type === 'expense') {
      const key = t.categoryId ?? ''
      if (isSav(acc)) {
        savSpent.set(key, (savSpent.get(key) ?? 0) + c)
        steps.push({ ...base, kind: 'savings-expense', categoryId: t.categoryId })
      } else {
        spent += c
        const g = cats.get(key) ?? { amount: 0, count: 0 }
        g.amount += c
        g.count++
        cats.set(key, g)
        steps.push({ ...base, kind: 'expense', categoryId: t.categoryId })
      }
    } else if (t.transferToAccountId) {
      const fromSav = isSav(acc)
      const toSav = isSav(t.transferToAccountId)
      if (fromSav === toSav) continue // نقل داخل نفس المجموعة — ما يظهر
      if (toSav) {
        deposits += c
        savAdded += c
        steps.push({ ...base, kind: 'saved', toAccountId: t.transferToAccountId })
      } else {
        withdrawals += c
        steps.push({ ...base, kind: 'withdrawn', toAccountId: t.transferToAccountId })
      }
    }
  }

  for (const l of input.loanTransactions) {
    if (!inMonth(l.date)) continue
    const c = toC(l.amount)
    const acc = l.accountId ?? ''
    const base = { date: l.date, amount: c, ref: `loan:${l.id}`, personId: l.personId, note: l.note, accountId: acc || undefined }
    if (isSav(acc)) {
      if (l.direction === 'given') {
        savLent.set(l.personId, (savLent.get(l.personId) ?? 0) + c)
        steps.push({ ...base, kind: 'savings-given' })
      } else {
        savAdded += c
        steps.push({ ...base, kind: 'savings-received' })
      }
      continue
    }
    people.set(l.personId, (people.get(l.personId) ?? 0) + (l.direction === 'received' ? c : -c))
    steps.push({ ...base, kind: l.direction === 'given' ? 'given' : 'received' })
  }

  for (const r of input.reconciliations) {
    if (!inMonth(r.date) || r.resolution !== 'adjust' || !r.difference) continue
    const c = toC(r.difference)
    if (isSav(r.accountId)) {
      savAdjusted += c
    } else {
      adjDaily += c
      steps.push({ kind: 'adjust', date: r.date, amount: c, ref: `rec:${r.id}`, accountId: r.accountId })
    }
  }

  const savedNet = deposits + incomeIntoSav - withdrawals
  const peopleNet = [...people.values()].reduce((s, v) => s + v, 0)
  const dailyIncome = incomeTotal - incomeIntoSav
  const left = dailyStart + dailyIncome + peopleNet + withdrawals - deposits + adjDaily - spent
  const savLentTotal = [...savLent.values()].reduce((s, v) => s + v, 0)
  const savSpentTotal = [...savSpent.values()].reduce((s, v) => s + v, 0)

  const fromPeople = [...people.entries()].filter(([, v]) => v > 0).map(([personId, v]) => ({ personId, amount: toS(v) })).sort((a, b) => b.amount - a.amount)
  const withPeople = [...people.entries()].filter(([, v]) => v < 0).map(([personId, v]) => ({ personId, amount: toS(-v) })).sort((a, b) => b.amount - a.amount)
  const withdrawn = savedNet < 0 ? -savedNet : 0
  const saved = savedNet > 0 ? savedNet : 0
  const adjustIn = adjDaily > 0 ? adjDaily : 0
  const adjustOut = adjDaily < 0 ? -adjDaily : 0
  const fromPeopleC = [...people.values()].filter((v) => v > 0).reduce((s, v) => s + v, 0)
  const withPeopleC = -[...people.values()].filter((v) => v < 0).reduce((s, v) => s + v, 0)

  steps.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  return {
    month,
    carried: toS(dailyStart),
    income: [...income.entries()].map(([sourceId, g]) => ({ sourceId, amount: toS(g.amount), count: g.count })).sort((a, b) => b.amount - a.amount),
    incomeTotal: toS(incomeTotal),
    fromPeople,
    withdrawn: toS(withdrawn),
    adjustIn: toS(adjustIn),
    spent: toS(spent),
    byCategory: [...cats.entries()].map(([categoryId, g]) => ({ categoryId, amount: toS(g.amount), count: g.count })).sort((a, b) => b.amount - a.amount),
    saved: toS(saved),
    withPeople,
    adjustOut: toS(adjustOut),
    left: toS(left),
    inTotal: toS(dailyStart + incomeTotal + fromPeopleC + withdrawn + adjustIn),
    outTotal: toS(spent + saved + withPeopleC + adjustOut + left),
    savings: {
      start: toS(savStart),
      added: toS(savAdded),
      spent: [...savSpent.entries()].map(([categoryId, v]) => ({ categoryId, amount: toS(v) })).sort((a, b) => b.amount - a.amount),
      lent: [...savLent.entries()].map(([personId, v]) => ({ personId, amount: toS(v) })).sort((a, b) => b.amount - a.amount),
      withdrawn: toS(withdrawals),
      adjusted: toS(savAdjusted),
      end: toS(savStart + savAdded - savSpentTotal - savLentTotal - withdrawals + savAdjusted),
    },
    steps: steps.map((s) => ({ ...s, amount: toS(s.amount) })),
  }
}

/** حسابات المدخرات (ادخار وطوارئ). */
export function savingsAccountIds(accounts: Pick<Account, 'id' | 'type'>[]): Set<string> {
  return new Set(accounts.filter((a) => isSavingsType(a.type)).map((a) => a.id))
}

/** مصروف شهر «YYYY-MM» من حسابات المدخرات — ما ينحسب على دخل الشهر ولا سقفه. */
export function savingsSpentInMonth(transactions: Transaction[], savingsIds: Set<string>, month: string): number {
  let c = 0
  for (const t of transactions) if (t.type === 'expense' && t.date.startsWith(month) && savingsIds.has(t.accountId)) c += toC(t.amount)
  return toS(c)
}

/** نفس السابق مقسوم بالحساب، الأكبر أولًا. */
export function savingsSpentByAccount(transactions: Transaction[], savingsIds: Set<string>, month: string): { accountId: string; amount: number }[] {
  const m = new Map<string, number>()
  for (const t of transactions) if (t.type === 'expense' && t.date.startsWith(month) && savingsIds.has(t.accountId)) m.set(t.accountId, (m.get(t.accountId) ?? 0) + toC(t.amount))
  return [...m.entries()].map(([accountId, c]) => ({ accountId, amount: toS(c) })).sort((a, b) => b.amount - a.amount)
}

export interface LedgerDaySeries {
  /** «باقي» في نهاية كل يوم (الفهرس 0 = يوم 1) — آخر نقطة = `left`. */
  left: number[]
  /** المسحوب من المدخرات للحسابات اليومية، تراكمي. */
  withdrawn: number[]
  /** السلف المستلمة في الحسابات اليومية، تراكمي. */
  received: number[]
}

/**
 * كشف الشهر يومًا بيوم لأول `days` يوم — لبطاقة «تدفّق هذا الشهر» والسحب عليها.
 * الحركات بتاريخ بعد `days` تُحسب في آخر يوم (مثل monthFlowSeries).
 */
export function ledgerDaySeries(l: MonthLedger, savingsIds: Set<string>, days: number): LedgerDaySeries {
  const delta = new Array<number>(days).fill(0)
  const wd = new Array<number>(days).fill(0)
  const rc = new Array<number>(days).fill(0)
  for (const s of l.steps) {
    const i = Math.min(days, Number(s.date.slice(8, 10))) - 1
    if (i < 0) continue
    const c = toC(s.amount)
    switch (s.kind) {
      case 'income':
        if (!savingsIds.has(s.accountId ?? '')) delta[i] += c
        break
      case 'expense':
      case 'given':
        delta[i] -= c
        break
      case 'saved':
        // الدخل اللي نزل مباشرة في حساب ادخار ما مرّ على الحسابات اليومية — التحويل وحده ينقصها.
        delta[i] -= c
        break
      case 'withdrawn':
        delta[i] += c
        wd[i] += c
        break
      case 'received':
        delta[i] += c
        rc[i] += c
        break
      case 'adjust':
        delta[i] += c
        break
    }
  }
  const left: number[] = []
  const withdrawn: number[] = []
  const received: number[] = []
  let a = toC(l.carried)
  let w = 0
  let r = 0
  for (let i = 0; i < days; i++) {
    a += delta[i]
    w += wd[i]
    r += rc[i]
    left.push(toS(a))
    withdrawn.push(toS(w))
    received.push(toS(r))
  }
  return { left, withdrawn, received }
}
