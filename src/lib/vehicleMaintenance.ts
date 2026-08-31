/** نحذّر لما يتبقى 10% أو أقل من فاصل تغيير الزيت المحدد. */
export const OIL_CHANGE_WARNING_RATIO = 0.1

export interface OilChangeStatus {
  drivenSinceLastChange: number
  remainingKm: number
  /** نسبة الاستهلاك من الفاصل — تتجاوز 100 لو تأخر التغيير عن موعده. */
  pct: number
  dueSoon: boolean
  overdue: boolean
}

/** حالة تغيير الزيت لسيارة واحدة: الممشى منذ آخر تغيير، والمتبقي حتى الفاصل التالي. */
export function computeOilChangeStatus(currentOdometerKm: number, lastChangeOdometerKm: number, intervalKm: number): OilChangeStatus {
  const driven = Math.max(0, currentOdometerKm - lastChangeOdometerKm)
  const remaining = intervalKm - driven
  const pct = intervalKm > 0 ? (driven / intervalKm) * 100 : 0
  return {
    drivenSinceLastChange: driven,
    remainingKm: remaining,
    pct,
    dueSoon: remaining > 0 && remaining <= intervalKm * OIL_CHANGE_WARNING_RATIO,
    overdue: remaining <= 0,
  }
}
