const KEY = 'qbnomia.moneyTrailIntroSeen'

/** تفضيل عرض محلي: هل شاف المستخدم شاشة «جهّزنا مسار فلوسك» — لو التخزين مقفول نعتبرها مشافة عشان ما تتكرر. */
export function readTrailIntroSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

export function markTrailIntroSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // تفضيل عرض فقط — بدون ضرر لو ما انحفظ.
  }
}
