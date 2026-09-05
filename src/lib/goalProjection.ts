import type { Transaction } from '../types'

/** عدد الأشهر الماضية المستخدمة لحساب معدّل الإضافة الشهري الحالي لحساب ادخار — نافذة متحركة قصيرة تعكس سلوكك الأخير بدل متوسط تاريخي قد يكون قديمًا. */
const LOOKBACK_MONTHS = 3

export interface GoalProjection {
  /** صافي المبلغ المضاف لهذا الحساب شهريًا بمعدّل آخر LOOKBACK_MONTHS أشهر (دخل + تحويلات واردة - مصروف - تحويلات صادرة). */
  avgMonthlyContribution: number
  /** تاريخ الوصول المتوقّع للهدف بمعدّلك الحالي — null لو معدّلك صفر أو سالب (ما راح توصل بهذا المعدّل). */
  projectedDate: string | null
}

function addMonths(dateISO: string, months: number): string {
  const d = new Date(dateISO)
  d.setDate(1)
  d.setMonth(d.getMonth() + Math.ceil(months))
  return d.toISOString().slice(0, 10)
}

/**
 * يتوقّع متى راح يوصل حساب ادخار لهدفه بناءً على معدّل إضافتك الفعلي لهذا
 * الحساب آخر 3 أشهر — بعكس "المبلغ المطلوب شهريًا" الثابت (اللي هو مجرد
 * تقسيم حسابي للمتبقي على الوقت المتبقي)، هذا يعكس سلوكك الحقيقي.
 */
export function projectGoalCompletion(accountId: string, remaining: number, transactions: Transaction[], todayISO = new Date().toISOString().slice(0, 10)): GoalProjection {
  const cutoff = addMonths(todayISO, -LOOKBACK_MONTHS)
  const relevant = transactions.filter((t) => t.date >= cutoff && t.date <= todayISO && (t.accountId === accountId || t.transferToAccountId === accountId))

  let net = 0
  for (const t of relevant) {
    if (t.accountId === accountId) {
      if (t.type === 'income') net += t.amount
      else if (t.type === 'expense') net -= t.amount
      else if (t.type === 'transfer') net -= t.amount
    } else if (t.transferToAccountId === accountId) {
      net += t.amount
    }
  }

  const avgMonthlyContribution = net / LOOKBACK_MONTHS
  if (avgMonthlyContribution <= 0 || remaining <= 0) {
    return { avgMonthlyContribution, projectedDate: null }
  }

  const monthsToGoal = remaining / avgMonthlyContribution
  return { avgMonthlyContribution, projectedDate: addMonths(todayISO, monthsToGoal) }
}
