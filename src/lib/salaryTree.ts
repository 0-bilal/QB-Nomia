import type { LoanTransaction, Transaction } from '../types'

/**
 * شجرة المصاريف: كل راتب وتحته المصاريف المسجّلة خلال فترته — بدون تتبّع سلف أو فلوس بين الحسابات.
 * فترة الراتب: من يوم نزوله لين اليوم اللي قبل الراتب التالي، وآخر راتب مفتوح لليوم.
 * التحويلات: اللي تطلع من حساب الراتب خلال الفترة — ما تنحسب مصروفًا، لكنها تنقص من الباقي.
 * السلف خلال الفترة: المعطاة لأي شخص تنقص من الباقي، والمستلمة تظهر بس (ما هي من الراتب).
 */
export interface SalaryPeriod {
  /** حركة الراتب نفسها. */
  salary: Transaction
  /** بداية الفترة (تاريخ الراتب). */
  from: string
  /** آخر يوم في الفترة — null لآخر راتب (مستمرة لليوم). */
  to: string | null
  /** مصاريف الفترة بالترتيب الزمني (الأقدم أولًا). */
  expenses: Transaction[]
  spent: number
  /** تحويلات من حساب الراتب خلال الفترة (الأقدم أولًا). */
  transfers: Transaction[]
  transferred: number
  /** التحويلات حسب الحساب المحوَّل إليه، الأكبر أولًا. */
  byDestination: { accountId: string; amount: number; count: number }[]
  /** سلف الفترة (معطاة ومستلمة) بالترتيب الزمني. */
  loans: LoanTransaction[]
  /** مجموع ما أعطيته لأشخاص — ينقص من الباقي. */
  lent: number
  /** مجموع ما استلمته من أشخاص — للعرض فقط. */
  borrowed: number
  /** السلف حسب الشخص والاتجاه، الأكبر أولًا. */
  byPerson: { personId: string; direction: LoanTransaction['direction']; amount: number; count: number }[]
  /** الراتب − المصاريف − التحويلات − السلف المعطاة (سالب = تجاوزت الراتب). */
  left: number
  /** المصاريف حسب الفئة، الأكبر أولًا. المفتاح '' = بدون فئة. */
  byCategory: { categoryId: string; amount: number; count: number }[]
}

const round = (n: number) => Math.round(n * 100) / 100

/** اليوم اللي قبل تاريخ ISO (YYYY-MM-DD). */
function dayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** فترات الرواتب — الأحدث أولًا. */
export function salaryPeriods(transactions: Transaction[], salarySourceId: string, loanTransactions: LoanTransaction[] = []): SalaryPeriod[] {
  const salaries = transactions
    .filter((t) => t.type === 'income' && t.incomeSourceId === salarySourceId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt ?? '') < (b.createdAt ?? '') ? -1 : 1))
  const byDate = (a: Transaction, b: Transaction) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
  const expenses = transactions.filter((t) => t.type === 'expense').sort(byDate)
  const allTransfers = transactions.filter((t) => t.type === 'transfer' && t.transferToAccountId).sort(byDate)
  const allLoans = [...loanTransactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const periods = salaries.map((salary, i): SalaryPeriod => {
    const next = salaries[i + 1]
    // راتبان بنفس اليوم: الأول بدون فترة، والمصاريف تُحسب على الأخير.
    const to = next ? dayBefore(next.date) : null
    const inPeriod = (t: { date: string }) => t.date >= salary.date && (to === null || t.date <= to) && (!next || next.date !== salary.date)
    const list = expenses.filter(inPeriod)
    const transfers = allTransfers.filter((t) => inPeriod(t) && t.accountId === salary.accountId && t.transferToAccountId !== salary.accountId)
    const dests = new Map<string, { amount: number; count: number }>()
    let transferred = 0
    for (const t of transfers) {
      transferred += t.amount
      const d = dests.get(t.transferToAccountId!) ?? { amount: 0, count: 0 }
      d.amount += t.amount
      d.count++
      dests.set(t.transferToAccountId!, d)
    }
    const loans = allLoans.filter(inPeriod)
    const people = new Map<string, { personId: string; direction: LoanTransaction['direction']; amount: number; count: number }>()
    let lent = 0
    let borrowed = 0
    for (const l of loans) {
      if (l.direction === 'given') lent += l.amount
      else borrowed += l.amount
      const key = `${l.direction}:${l.personId}`
      const g = people.get(key) ?? { personId: l.personId, direction: l.direction, amount: 0, count: 0 }
      g.amount += l.amount
      g.count++
      people.set(key, g)
    }
    const cats = new Map<string, { amount: number; count: number }>()
    let spent = 0
    for (const e of list) {
      spent += e.amount
      const key = e.categoryId ?? ''
      const c = cats.get(key) ?? { amount: 0, count: 0 }
      c.amount += e.amount
      c.count++
      cats.set(key, c)
    }
    return {
      salary,
      from: salary.date,
      to,
      expenses: list,
      spent: round(spent),
      transfers,
      transferred: round(transferred),
      byDestination: [...dests.entries()].map(([accountId, d]) => ({ accountId, amount: round(d.amount), count: d.count })).sort((a, b) => b.amount - a.amount),
      loans,
      lent: round(lent),
      borrowed: round(borrowed),
      byPerson: [...people.values()].map((g) => ({ ...g, amount: round(g.amount) })).sort((a, b) => b.amount - a.amount),
      left: round(salary.amount - spent - transferred - lent),
      byCategory: [...cats.entries()].map(([categoryId, c]) => ({ categoryId, amount: round(c.amount), count: c.count })).sort((a, b) => b.amount - a.amount),
    }
  })
  return periods.reverse()
}
