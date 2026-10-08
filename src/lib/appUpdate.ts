import { Capacitor } from '@capacitor/core'
import { APP_VERSION, BUILD_ID } from './version'
import { forceAppUpdate } from './cache'

/** نسخة الويب المنشورة — مصدر الحقيقة لأحدث إصدار (يُولَّد version.json مع كل بناء في vite.config.ts). */
const PAGES_VERSION_URL = 'https://0-bilal.github.io/QB-Nomia/version.json'
export const APK_URL = 'https://github.com/0-bilal/QB-Nomia/releases/latest/download/app-debug.apk'

const UNLOCK_KEY = 'qbnomia.update.unlock'
const DONE_KEY = 'qbnomia.update.done'
/** مدة صلاحية تجاوز الرمز السري بعد إعادة التشغيل — تكفي لإعادة التحميل فقط، ولا تُستخدم إلا مرة واحدة. */
const UNLOCK_TTL_MS = 60 * 1000

export interface RemoteVersion {
  version: string
  buildId: string
  notes: string[]
}

export interface UpdateCheck {
  available: boolean
  remote: RemoteVersion
}

export interface UpdateDone {
  fromVersion: string
  fromBuild: string
}

/** تطبيق أندرويد (Capacitor) يحمل ملفات الويب داخل الـ APK — تحديثه يكون بتنزيل APK جديد، مو بإعادة التحميل. */
export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/** مقارنة أرقام إصدار بصيغة x.y.z — موجب لو a أحدث من b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

function versionUrl(): string {
  return isNativeApp() ? PAGES_VERSION_URL : `${import.meta.env.BASE_URL}version.json`
}

/**
 * يجلب أحدث نسخة منشورة ويقارنها بالنسخة المشغّلة.
 * - الويب: أي بناء مختلف (بصمة مختلفة) يُعتبر تحديثًا — حتى لو نُسي رفع رقم الإصدار.
 * - أندرويد: فقط رقم إصدار أعلى، لأن التحديث هناك يعني تنزيل APK جديد.
 */
export async function checkForUpdate(): Promise<UpdateCheck> {
  const res = await fetch(`${versionUrl()}?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as Partial<RemoteVersion>
  if (typeof data.version !== 'string' || typeof data.buildId !== 'string') throw new Error('invalid version.json')
  const remote: RemoteVersion = { version: data.version, buildId: data.buildId, notes: Array.isArray(data.notes) ? data.notes : [] }
  const available = isNativeApp()
    ? compareVersions(remote.version, APP_VERSION) > 0
    : remote.buildId !== BUILD_ID && compareVersions(remote.version, APP_VERSION) >= 0
  return { available, remote }
}

let cachedCheck: Promise<UpdateCheck | null> | null = null

/** فحص صامت مرة واحدة لكل جلسة — لإظهار نقطة "يوجد تحديث" على زر التحديث بدون إزعاج. */
export function backgroundUpdateCheck(): Promise<UpdateCheck | null> {
  if (!cachedCheck) cachedCheck = checkForUpdate().catch(() => null)
  return cachedCheck
}

export type UpdateStep = 0 | 1 | 2

/**
 * يطبّق تحديث الويب بخطوات مرئية: (0) التأكد من توفر النسخة الجديدة، (1) مسح النسخة
 * المخزّنة (Service Worker + الكاش)، (2) حفظ علامة "تم التحديث" وتصريح دخول لمرة واحدة
 * ثم إعادة التشغيل — فيعود المستخدم لنفس الشاشة بدون إعادة إدخال الرمز.
 */
export async function applyWebUpdate(onStep: (step: UpdateStep) => void): Promise<void> {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

  onStep(0)
  await Promise.all([fetch(`${import.meta.env.BASE_URL}?t=${Date.now()}`, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
  }), wait(700)])

  onStep(1)
  await Promise.all([forceAppUpdate(), wait(700)])

  onStep(2)
  try {
    sessionStorage.setItem(DONE_KEY, JSON.stringify({ fromVersion: APP_VERSION, fromBuild: BUILD_ID } satisfies UpdateDone))
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now()))
  } catch {
    // التخزين غير متاح — التحديث يكمل، لكن بيُطلب الرمز وما تظهر رسالة النجاح.
  }
  await wait(600)
  window.location.reload()
}

/**
 * علامات ما بعد التحديث تُقرأ وتُمسح من sessionStorage مرة واحدة عند تحميل هذا الملف (بداية التطبيق)،
 * وتُحفظ بالذاكرة — فقراءتها أكثر من مرة (مثل StrictMode) ترجع نفس النتيجة، ولا تبقى صالحة لإعادة تحميل لاحقة.
 */
function readStartupMarkers(): { unlock: boolean; done: UpdateDone | null } {
  try {
    const rawUnlock = sessionStorage.getItem(UNLOCK_KEY)
    const rawDone = sessionStorage.getItem(DONE_KEY)
    sessionStorage.removeItem(UNLOCK_KEY)
    sessionStorage.removeItem(DONE_KEY)
    const age = rawUnlock ? Date.now() - Number(rawUnlock) : -1
    let done: UpdateDone | null = null
    if (rawDone) {
      const v = JSON.parse(rawDone) as Partial<UpdateDone>
      if (typeof v.fromVersion === 'string' && typeof v.fromBuild === 'string') done = { fromVersion: v.fromVersion, fromBuild: v.fromBuild }
    }
    return { unlock: age >= 0 && age < UNLOCK_TTL_MS, done }
  } catch {
    return { unlock: false, done: null }
  }
}

const startup = readStartupMarkers()
let pendingDone = startup.done

/** هل فُتح التطبيق للتو بعد تحديث بدأه المستخدم وهو داخل التطبيق؟ — يفتح بدون طلب الرمز. */
export function resumedFromUpdate(): boolean {
  return startup.unlock
}

/** معلومات النسخة السابقة لعرض رسالة "تم التحديث" — تبقى متاحة حتى يغلقها المستخدم (dismissUpdateDone). */
export function peekUpdateDone(): UpdateDone | null {
  return pendingDone
}

export function dismissUpdateDone(): void {
  pendingDone = null
}
