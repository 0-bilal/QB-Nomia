/** منطق ورقة «نسيت الرقم السري» ومهلة الانتظار في شاشة القفل — نصوص الوقت وحالة النسخة الاحتياطية. */
import { isSheetsSyncConfigured } from '../config/sheetsSync'
import { getLastSyncedAt } from './sheetsSync'

/** تمييز العدد بالعربي: [مفرد، مثنى، جمع (3-10)، فوق 10] — «دقيقة، دقيقتين، 5 دقائق، 15 دقيقة». */
export function countLabel(n: number, [one, two, few, many]: [string, string, string, string]): string {
  if (n === 1) return one
  if (n === 2) return two
  return `${n} ${n <= 10 ? few : many}`
}

const MINUTES: [string, string, string, string] = ['دقيقة', 'دقيقتين', 'دقائق', 'دقيقة']
const HOURS: [string, string, string, string] = ['ساعة', 'ساعتين', 'ساعات', 'ساعة']
const DAYS: [string, string, string, string] = ['يوم', 'يومين', 'أيام', 'يوم']

/** مدة الانتظار بعد المحاولات الخاطئة: «45 ثانية» تحت الدقيقة، وإلا بالدقائق. */
export function waitLabel(ms: number): string {
  const sec = Math.ceil(ms / 1000)
  if (sec < 60) return `${sec} ثانية`
  return countLabel(Math.ceil(sec / 60), MINUTES)
}

/** «قبل 3 دقائق»، «قبل ساعتين»، «قبل 5 أيام». */
export function agoLabel(iso: string, now = Date.now()): string {
  const min = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'قبل لحظات'
  if (min < 60) return `قبل ${countLabel(min, MINUTES)}`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `قبل ${countLabel(hours, HOURS)}`
  return `قبل ${countLabel(Math.floor(hours / 24), DAYS)}`
}

export type BackupStatus = { kind: 'sheets'; lastSyncedAt: string | null } | { kind: 'none' }

/** هل عند المستخدم نسخة في Google Sheets يقدر يستعيدها بعد المسح؟ */
export function backupStatus(): BackupStatus {
  return isSheetsSyncConfigured() ? { kind: 'sheets', lastSyncedAt: getLastSyncedAt() } : { kind: 'none' }
}
