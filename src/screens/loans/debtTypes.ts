/** أنواع السلف والديون — لون وعنوان ثابت لكل نوع حتى يتعرّف عليه المستخدم بنظرة بكل مكان (الشريط، البطاقات، شارات الحركات). */
export type DebtKind = 'people' | 'advance' | 'violations' | 'stores'
export type DebtTab = 'overview' | DebtKind

export const DEBT_KINDS: DebtKind[] = ['people', 'advance', 'violations', 'stores']

export const DEBT_META: Record<DebtTab, { label: string; title: string; subtitle: string; color: string }> = {
  overview: { label: 'الكل', title: 'نظرة عامة', subtitle: 'موقفك من كل الأنواع بمكان واحد', color: 'var(--color-accent)' },
  people: { label: 'أشخاص', title: 'سلف الأشخاص', subtitle: 'سلف بينك وبين الأشخاص', color: 'var(--color-owed-to)' },
  advance: { label: 'سلفة راتب', title: 'سلفة الراتب', subtitle: 'سلفة من الراتب تُخصم تلقائيًا', color: 'var(--color-transfer)' },
  violations: { label: 'خصومات', title: 'خصومات المخالفات', subtitle: 'خصومات مخالفات العمل من الراتب', color: 'var(--color-expense)' },
  stores: { label: 'متاجر', title: 'ديون المتاجر', subtitle: 'مشتريات بالآجل من المتاجر', color: 'var(--color-subscription)' },
}

/** خلفية خافتة بلون النوع. */
export function softBg(color: string, pct = 15): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}

export function isDebtTab(v: string | null): v is DebtTab {
  return v === 'overview' || v === 'people' || v === 'advance' || v === 'violations' || v === 'stores'
}
