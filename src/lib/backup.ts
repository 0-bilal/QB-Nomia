const LAST_EXPORT_KEY = 'qbnomia.backup.lastExportedAt'
const FIRST_SEEN_KEY = 'qbnomia.backup.firstSeenAt'

export function getLastBackupExportedAt(): string | null {
  return localStorage.getItem(LAST_EXPORT_KEY)
}

export function markBackupExported(): void {
  localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString())
}

/** أول مرة نلاحظ فيها بيانات على الجهاز — نقطة مرجعية لتذكير النسخة الاحتياطية لو المستخدم ما صدّر نسخة بعد، عشان ما نزعجه بأول أسبوع استخدام. */
export function getOrInitFirstSeenAt(): string {
  let v = localStorage.getItem(FIRST_SEEN_KEY)
  if (!v) {
    v = new Date().toISOString()
    localStorage.setItem(FIRST_SEEN_KEY, v)
  }
  return v
}
