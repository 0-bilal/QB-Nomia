/** أقل عدد أيام مرّت بالشهر قبل ما نثق بتوقّع تجاوز الميزانية — يوم 1-4 حركة وحدة كبيرة ممكن تعطي توقّع مبالغ فيه. */
export const MIN_DAYS_ELAPSED_FOR_PROJECTION = 5

/** عدد أيام الشهر المحتوي على هذا التاريخ. */
export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/**
 * يتوقّع نسبة الإنفاق من الميزانية بنهاية الشهر بناءً على معدل الإنفاق الحالي
 * (الصرف حتى الآن ÷ الأيام المنقضية × إجمالي أيام الشهر)، بدل الاكتفاء بنسبة
 * الصرف الفعلي حتى اللحظة.
 */
export function projectedMonthEndPct(spent: number, limit: number, daysElapsed: number, totalDaysInMonth: number): number {
  if (daysElapsed <= 0) return (spent / limit) * 100
  return ((spent / daysElapsed) * totalDaysInMonth / limit) * 100
}
