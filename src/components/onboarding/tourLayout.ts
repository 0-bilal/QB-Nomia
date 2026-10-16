/** حسابات مكان الإضاءة والبطاقة في جولة التعريف — دوال نقية قابلة للاختبار. */

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const EDGE = 8
const MARGIN = 16
const GAP = 14

/** مستطيل الإضاءة: العنصر + هامش، ومقصوص داخل الشاشة (العناصر الطويلة ما تطلع برّا). */
export function spotRect(r: { top: number; left: number; width: number; height: number }, pad: number, vw: number, vh: number): Rect {
  const top = Math.max(EDGE, r.top - pad)
  const left = Math.max(EDGE, r.left - pad)
  const bottom = Math.min(vh - EDGE, r.top + r.height + pad)
  const right = Math.min(vw - EDGE, r.left + r.width + pad)
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

export function sameRect(a: Rect, b: Rect): boolean {
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5
}

/**
 * أعلى البطاقة: تحت العنصر لو فيه مساحة، وإلا فوقه، وإلا بالجهة الأوسع
 * داخل الشاشة (تداخل لا مفر منه لعنصر أطول من نصف الشاشة).
 */
export function placeCard(spot: Rect, cardH: number, vh: number): number {
  const below = vh - (spot.top + spot.height) - GAP - MARGIN
  const above = spot.top - GAP - MARGIN
  if (cardH <= below && (below >= above || cardH > above)) return spot.top + spot.height + GAP
  if (cardH <= above) return spot.top - GAP - cardH
  const preferBelow = below >= above
  const top = preferBelow ? spot.top + spot.height + GAP : spot.top - GAP - cardH
  return Math.min(Math.max(MARGIN, top), vh - cardH - MARGIN)
}
