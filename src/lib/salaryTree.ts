import type { Transaction } from '../types'

/**
 * شجرة المصاريف: كل راتب وتحته المصاريف المسجّلة خلال فترته — بدون تتبّع سلف أو فلوس بين الحسابات.
 * فترة الراتب: من يوم نزوله لين اليوم اللي قبل الراتب التالي، وآخر راتب مفتوح لليوم.
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
  /** الراتب − المصاريف (سالب = تجاوزت الراتب). */
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
  const expenses = transactions.filter((t) => t.type === 'expense').sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const periods = salaries.map((salary, i): SalaryPeriod => {
    const next = salaries[i + 1]
    // راتبان بنفس اليوم: الأول بدون فترة، والمصاريف تُحسب على الأخير.
    const to = next ? dayBefore(next.date) : null
    const list = expenses.filter((e) => e.date >= salary.date && (to === null || e.date <= to) && (!next || next.date !== salary.date))
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
      left: round(salary.amount - spent),
      byCategory: [...cats.entries()].map(([categoryId, c]) => ({ categoryId, amount: round(c.amount), count: c.count })).sort((a, b) => b.amount - a.amount),
    }
  })
  return periods.reverse()
}
