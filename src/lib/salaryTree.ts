import type { Transaction } from '../types'

/**
 * شجرة المصاريف: كل راتب وتحته المصاريف المسجّلة خلال فترته — بدون تتبّع سلف أو فلوس بين الحسابات.
 * فترة الراتب: من يوم نزوله لين اليوم اللي قبل الراتب التالي، وآخر راتب مفتوح لليوم.
 * التحويلات: اللي تطلع من حساب الراتب خلال الفترة — ما تنحسب مصروفًا، لكنها تنقص من الباقي.
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
  /** الراتب − المصاريف − التحويلات (سالب = تجاوزت الراتب). */
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
export function salaryPeriods(transactions: Transaction[], salarySourceId: string): SalaryPeriod[] {
  const salaries = transactions
    .filter((t) => t.type === 'income' && t.incomeSourceId === salarySourceId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt ?? '') < (b.createdAt ?? '') ? -1 : 1))
  const byDate = (a: Transaction, b: Transaction) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)
  const expenses = transactions.filter((t) => t.type === 'expense').sort(byDate)
  const allTransfers = transactions.filter((t) => t.type === 'transfer' && t.transferToAccountId).sort(byDate)

  const periods = salaries.map((salary, i): SalaryPeriod => {
    const next = salaries[i + 1]
    // راتبان بنفس اليوم: الأول بدون فترة، والمصاريف تُحسب على الأخير.
    const to = next ? dayBefore(next.date) : null
    const inPeriod = (t: Transaction) => t.date >= salary.date && (to === null || t.date <= to) && (!next || next.date !== salary.date)
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
      left: round(salary.amount - spent - transferred),
      byCategory: [...cats.entries()].map(([categoryId, c]) => ({ categoryId, amount: round(c.amount), count: c.count })).sort((a, b) => b.amount - a.amount),
    }
  })
  return periods.reverse()
}
