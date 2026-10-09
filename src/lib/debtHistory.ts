import type { LoanTransaction, SalaryAdvance, SalaryViolationDeduction, StoreDebt, StoreDebtPayment } from '../types'
import { localIso } from './homeFeed'

/** عدد النقاط (أسابيع) في سبارك السلف والديون — نصف سنة تقريبًا. */
export const DEBT_SPARK_WEEKS = 26

/** تواريخ نهاية كل أسبوع (ISO)، آخرها اليوم. */
export function weeklyDates(today: Date, weeks = DEBT_SPARK_WEEKS): string[] {
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (weeks - 1 - i) * 7)
    return localIso(d)
  })
}

/**
 * تقيّم `valueAt(cutoff)` عند نهاية كل أسبوع. آخر نقطة تأخذ كل السجلات (حتى المؤرّخة لاحقًا)
 * فتطابق الأرقام المعروضة حاليًا.
 */
function series(dates: string[], valueAt: (cutoff: string, year: string) => number): number[] {
  return dates.map((d, i) => valueAt(i === dates.length - 1 ? '9999-12-31' : d, d.slice(0, 4)))
}

export interface PeopleHistory {
  /** مجموع الأرصدة الموجبة (لك عند الآخرين). */
  owedToMe: number[]
  /** مجموع الأرصدة السالبة بالقيمة المطلقة (عليك للآخرين). */
  iOwe: number[]
}

/** رصيد كل شخص في نهاية كل أسبوع، مجمّعًا كما في `totalOwedToMe` / `totalIOwe`. */
export function peopleHistory(loans: LoanTransaction[], personIds: string[], dates: string[]): PeopleHistory {
  const ids = new Set(personIds)
  const relevant = loans.filter((l) => ids.has(l.personId))
  const balancesAt = (cutoff: string) => {
    const bal = new Map<string, number>()
    for (const l of relevant) if (l.date <= cutoff) bal.set(l.personId, (bal.get(l.personId) ?? 0) + (l.direction === 'given' ? l.amount : -l.amount))
    return [...bal.values()]
  }
  const owedToMe = series(dates, (cutoff) => balancesAt(cutoff).reduce((s, b) => s + Math.max(0, b), 0))
  const iOwe = series(dates, (cutoff) => balancesAt(cutoff).reduce((s, b) => s + Math.max(0, -b), 0))
  return { owedToMe, iOwe }
}

/** المتبقي من سلف الراتب: تُحسب السلفة من تاريخها حتى تاريخ خصمها. المسدَّدة بلا تاريخ خصم لا تظهر. */
export function advanceHistory(advances: SalaryAdvance[], dates: string[]): number[] {
  return series(dates, (cutoff) =>
    advances
      .filter((a) => a.date <= cutoff && !(a.settled && (!a.settledDate || a.settledDate <= cutoff)))
      .reduce((s, a) => s + a.amount, 0),
  )
}

/** المتبقي لكل المتاجر: كل دَين من تاريخه ناقص ما سُدّد منه حتى ذلك اليوم. */
export function storeHistory(debts: StoreDebt[], payments: StoreDebtPayment[], dates: string[]): number[] {
  return series(dates, (cutoff) =>
    debts
      .filter((d) => d.date <= cutoff)
      .reduce((s, d) => {
        const paid = payments.filter((p) => p.debtId === d.id && p.date <= cutoff).reduce((x, p) => x + p.amount, 0)
        return s + Math.max(0, d.amount - paid)
      }, 0),
  )
}

/** مجموع خصومات السنة تراكميًا (يبدأ من الصفر مع كل سنة جديدة). */
export function violationsHistory(violations: SalaryViolationDeduction[], dates: string[]): number[] {
  return series(dates, (cutoff, year) => violations.filter((v) => v.date.startsWith(year) && v.date <= cutoff).reduce((s, v) => s + v.amount, 0))
}

/** هل في السلسلة أي قيمة؟ (بدونها لا يُرسم خط). */
export function hasHistory(...lists: number[][]): boolean {
  return lists.some((l) => l.some((v) => v !== 0))
}
