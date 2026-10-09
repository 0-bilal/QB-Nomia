import { useMemo } from 'react'
import { useData } from '../../state/DataContext'
import { advanceHistory, peopleHistory, storeHistory, violationsHistory, weeklyDates } from '../../lib/debtHistory'

/** سلاسل السبارك الأسبوعية لكل أنواع السلف والديون (آخر 26 أسبوعًا، آخرها اليوم). */
export function useDebtHistory() {
  const { people, loanTransactions, salaryAdvances, storeDebts, storeDebtPayments, salaryViolations } = useData()
  const todayKey = new Date().toDateString()
  return useMemo(() => {
    const dates = weeklyDates(new Date())
    const ppl = peopleHistory(
      loanTransactions,
      people.map((p) => p.id),
      dates,
    )
    const advance = advanceHistory(salaryAdvances, dates)
    const stores = storeHistory(storeDebts, storeDebtPayments, dates)
    return {
      dates,
      owedToMe: ppl.owedToMe,
      iOwePeople: ppl.iOwe,
      advance,
      stores,
      violations: violationsHistory(salaryViolations, dates),
      iOweAll: dates.map((_, i) => ppl.iOwe[i] + advance[i] + stores[i]),
    }
    // todayKey: يعيد الحساب لو تغيّر اليوم والشاشة مفتوحة.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people, loanTransactions, salaryAdvances, storeDebts, storeDebtPayments, salaryViolations, todayKey])
}
