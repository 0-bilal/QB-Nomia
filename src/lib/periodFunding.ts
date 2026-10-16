import type { LoanTransaction, Transaction } from '../types'

/**
 * من دخل الفترة ومن الرصيد السابق.
 *
 * كل حساب فيه خلال الفترة نوعين من الفلوس:
 *  - «فلوس الفترة»: الدخل اللي نزل فيه خلالها (والسلف المستلمة)، وما تحوّل له منها.
 *  - «رصيد سابق»: اللي كان فيه قبل الفترة، أو اللي تحوّل له من رصيد سابق لحساب ثاني.
 * أي خروج (مصروف، سلفة معطاة، تحويل) يأخذ من فلوس الفترة أولًا ثم من الرصيد السابق.
 * فالشراء من الادخار (أو مما سحبته منه) ما ينحسب على دخل الفترة ولا يطلع عجز — يظهر منفصلًا.
 * تلقائي لكل الحسابات بدون إعداد. الحساب بالهللة.
 */
export interface PreviousSource {
  /** الحساب اللي كان فيه الرصيد السابق. */
  accountId: string
  amount: number
  /** منه: ما وصل للمصروف عن طريق تحويل لحساب ثاني («سحبت من...»). */
  viaTransfer: number
}

export interface PeriodFunding {
  income: number
  expense: number
  /** المصروف اللي غطّته فلوس الفترة — هذا اللي ينحسب على الدخل والميزانية. */
  fromPeriod: number
  /** المصروف اللي غطّاه رصيد سابق. */
  fromPrevious: number
  /** الرصيد السابق المصروف حسب حسابه الأصلي، الأكبر أولًا. */
  previousSources: PreviousSource[]
  /** لكل مصروف غطّاه رصيد سابق (كله أو جزء): المبلغ والحسابات الأصلية. */
  expensePrevious: Map<string, { amount: number; accountIds: string[] }>
  /** مصروف فلوس الفترة لكل يوم (YYYY-MM-DD). */
  fromPeriodByDate: Map<string, number>
}

const toC = (n: number) => Math.round(n * 100)
const toS = (c: number) => c / 100

type Move =
  | { k: 'in'; date: string; acc: string; amt: number; ord: number; income: boolean }
  | { k: 'expense'; date: string; acc: string; amt: number; ord: number; id: string }
  | { k: 'out'; date: string; acc: string; amt: number; ord: number }
  | { k: 'transfer'; date: string; acc: string; to: string; amt: number; ord: number }

/** الداخل أولًا في نفس اليوم، ثم التحويلات، ثم الخارج — الحركات بلا وقت ما نعرف ترتيبها داخل اليوم. */
const rank = (m: Move) => (m.k === 'in' ? 0 : m.k === 'transfer' ? 1 : 2)

/** توزيع مصاريف الفترة [from, to] (شاملة) بين فلوس الفترة والرصيد السابق. */
export function fundPeriod(transactions: Transaction[], loanTransactions: LoanTransaction[], from: string, to: string): PeriodFunding {
  const inRange = (d: string) => d >= from && d <= to
  const moves: Move[] = []
  const n = transactions.length
  transactions.forEach((t, i) => {
    if (!inRange(t.date) || !(t.amount > 0)) return
    const base = { date: t.date, acc: t.accountId ?? '', amt: toC(t.amount), ord: n - i }
    if (t.type === 'income') moves.push({ ...base, k: 'in', income: true })
    else if (t.type === 'expense') moves.push({ ...base, k: 'expense', id: t.id })
    else if (t.type === 'transfer' && t.transferToAccountId) moves.push({ ...base, k: 'transfer', to: t.transferToAccountId })
  })
  const m = loanTransactions.length
  loanTransactions.forEach((l, i) => {
    if (!inRange(l.date) || !(l.amount > 0)) return
    const base = { date: l.date, acc: l.accountId ?? '', amt: toC(l.amount), ord: n + m - i }
    if (l.direction === 'received') moves.push({ ...base, k: 'in', income: false })
    else moves.push({ ...base, k: 'out' })
  })
  moves.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : rank(a) - rank(b) || a.ord - b.ord))

  /** فلوس الفترة في كل حساب. */
  const fresh = new Map<string, number>()
  /** رصيد سابق وصل لكل حساب بتحويل — بحسابه الأصلي، الأقدم أولًا. */
  const carried = new Map<string, { origin: string; amount: number }[]>()

  /** يأخذ من حساب: فلوس الفترة أولًا، ثم الرصيد السابق المحوَّل له، ثم رصيده السابق هو. */
  function take(acc: string, cents: number): { fresh: number; prev: { origin: string; amount: number; via: boolean }[] } {
    const f = Math.min(fresh.get(acc) ?? 0, cents)
    fresh.set(acc, (fresh.get(acc) ?? 0) - f)
    let need = cents - f
    const prev: { origin: string; amount: number; via: boolean }[] = []
    const q = carried.get(acc) ?? []
    while (need > 0 && q.length > 0) {
      const head = q[0]
      const t = Math.min(head.amount, need)
      prev.push({ origin: head.origin, amount: t, via: true })
      head.amount -= t
      need -= t
      if (head.amount === 0) q.shift()
    }
    if (need > 0) prev.push({ origin: acc, amount: need, via: false })
    return { fresh: f, prev }
  }

  let income = 0
  let expense = 0
  let fromPeriod = 0
  const sources = new Map<string, { amount: number; via: number }>()
  const expensePrevious = new Map<string, { amount: number; accountIds: string[] }>()
  const fromPeriodByDate = new Map<string, number>()

  for (const mv of moves) {
    if (mv.k === 'in') {
      if (mv.income) income += mv.amt
      fresh.set(mv.acc, (fresh.get(mv.acc) ?? 0) + mv.amt)
    } else if (mv.k === 'out') {
      take(mv.acc, mv.amt)
    } else if (mv.k === 'transfer') {
      const got = take(mv.acc, mv.amt)
      fresh.set(mv.to, (fresh.get(mv.to) ?? 0) + got.fresh)
      if (got.prev.length > 0) {
        const q = carried.get(mv.to) ?? []
        for (const p of got.prev) q.push({ origin: p.origin, amount: p.amount })
        carried.set(mv.to, q)
      }
    } else {
      expense += mv.amt
      const got = take(mv.acc, mv.amt)
      fromPeriod += got.fresh
      if (got.fresh > 0) fromPeriodByDate.set(mv.date, (fromPeriodByDate.get(mv.date) ?? 0) + got.fresh)
      if (got.prev.length > 0) {
        let total = 0
        const ids: string[] = []
        for (const p of got.prev) {
          total += p.amount
          if (!ids.includes(p.origin)) ids.push(p.origin)
          const s = sources.get(p.origin) ?? { amount: 0, via: 0 }
          s.amount += p.amount
          if (p.via) s.via += p.amount
          sources.set(p.origin, s)
        }
        expensePrevious.set(mv.id, { amount: toS(total), accountIds: ids })
      }
    }
  }

  return {
    income: toS(income),
    expense: toS(expense),
    fromPeriod: toS(fromPeriod),
    fromPrevious: toS(expense - fromPeriod),
    previousSources: [...sources.entries()].map(([accountId, s]) => ({ accountId, amount: toS(s.amount), viaTransfer: toS(s.via) })).sort((a, b) => b.amount - a.amount),
    expensePrevious,
    fromPeriodByDate: new Map([...fromPeriodByDate.entries()].map(([d, c]) => [d, toS(c)])),
  }
}

/** شهر تقويمي «YYYY-MM». */
export function fundMonth(transactions: Transaction[], loanTransactions: LoanTransaction[], monthKey: string): PeriodFunding {
  return fundPeriod(transactions, loanTransactions, `${monthKey}-01`, `${monthKey}-31`)
}

/** لكل مصروف غطّاه رصيد سابق في شهره (التقويمي): المبلغ والحسابات الأصلية — لشارة «من رصيد سابق» في القوائم. */
export function previousFundedExpenses(transactions: Transaction[], loanTransactions: LoanTransaction[]): Map<string, { amount: number; accountIds: string[] }> {
  const months = new Set(transactions.filter((t) => t.type === 'expense').map((t) => t.date.slice(0, 7)))
  const out = new Map<string, { amount: number; accountIds: string[] }>()
  for (const key of months) for (const [id, v] of fundMonth(transactions, loanTransactions, key).expensePrevious) out.set(id, v)
  return out
}
