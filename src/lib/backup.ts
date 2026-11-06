import type { DataSnapshot } from '../state/DataContext'
import { localIso } from './homeFeed'

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

/** فحص أولي لملف نسخة احتياطية قبل الاستيراد: لازم يكون كائن فيه الحسابات والحركات والأشخاص كقوائم. */
export function isDataSnapshot(value: unknown): value is DataSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.accounts) && Array.isArray(v.transactions) && Array.isArray(v.people)
}

/** ينزّل نسخة البيانات كملف JSON على الجهاز (نفس ملف «تصدير نسخة احتياطية»). */
export function downloadSnapshotFile(snapshot: unknown, filename = `qb-nomia-backup-${localIso(new Date())}.json`): void {
  const json = JSON.stringify(snapshot, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(href), 2000)
}
