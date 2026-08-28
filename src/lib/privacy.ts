const KEY = 'qbnomia.hideBalancesDefault'

/**
 * تفضيل جهاز محلي بحت (مو بيانات مالية، فما يدخل بمزامنة Google Sheets) —
 * يحدد إذا الأرصدة وأرقام الحسابات تبدأ مخفية بعلامات (*) كل ما تفتح شاشة
 * تعرضها، وتُكشَف مؤقتًا بزر العين. مخفية افتراضيًا (true) لو ما فيه تفضيل محفوظ بعد.
 */
export function getHideBalancesDefault(): boolean {
  const raw = localStorage.getItem(KEY)
  if (raw === null) return true
  return raw === '1'
}

export function setHideBalancesDefault(hidden: boolean): void {
  localStorage.setItem(KEY, hidden ? '1' : '0')
}
