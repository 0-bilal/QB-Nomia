/** تفضيلات القفل والدخول السريع — محفوظة على الجهاز فقط (localStorage). */

export type LockBackground = 'aurora' | 'rings' | 'curve' | 'dots'

export const LOCK_BACKGROUNDS: [LockBackground, string][] = [
  ['aurora', 'هالة وحبيبات'],
  ['rings', 'حلقات تنبض'],
  ['curve', 'منحنى الرصيد'],
  ['dots', 'نقاط تتموّج'],
]

/** مهلة القفل بالدقائق: الرجوع للتطبيق خلالها يفتحه مباشرة بدون تحقق. 0 = قفل فوري. */
export const LOCK_GRACE_OPTIONS: [number, string][] = [
  [0, 'فوري'],
  [1, 'دقيقة'],
  [5, '5 دقائق'],
  [15, '15 دقيقة'],
  [60, 'ساعة'],
]

const GRACE_KEY = 'qbnomia.lock.graceMin'
const BIO_FIRST_KEY = 'qbnomia.lock.biometricFirst'
const BG_KEY = 'qbnomia.lock.background'
const CLOCK_KEY = 'qbnomia.lock.clock'
const DEFAULT_GRACE_MIN = 5

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // تفضيل عرض فقط — تجاهل فشل التخزين.
  }
}

export function getLockGraceMin(): number {
  const v = Number(read(GRACE_KEY))
  return read(GRACE_KEY) !== null && LOCK_GRACE_OPTIONS.some(([m]) => m === v) ? v : DEFAULT_GRACE_MIN
}
export function setLockGraceMin(min: number): void {
  write(GRACE_KEY, String(min))
}

/** البصمة أولًا: شاشة القفل تعرض زر البصمة بدل لوحة الأرقام (لو البصمة مفعّلة). افتراضيًا مفعّل. */
export function getBiometricFirst(): boolean {
  return read(BIO_FIRST_KEY) !== '0'
}
export function setBiometricFirst(on: boolean): void {
  write(BIO_FIRST_KEY, on ? '1' : '0')
}

export function getLockBackground(): LockBackground {
  const v = read(BG_KEY)
  return LOCK_BACKGROUNDS.some(([k]) => k === v) ? (v as LockBackground) : 'aurora'
}
export function setLockBackground(bg: LockBackground): void {
  write(BG_KEY, bg)
}

/** الساعة الكبيرة بدل الشعار والترحيب. افتراضيًا مطفأة. */
export function getLockClock(): boolean {
  return read(CLOCK_KEY) === '1'
}
export function setLockClock(on: boolean): void {
  write(CLOCK_KEY, on ? '1' : '0')
}

/** هل يجب القفل بعد غياب `elapsedMs` حسب المهلة المختارة؟ */
export function shouldLockAfter(elapsedMs: number, graceMin = getLockGraceMin()): boolean {
  return elapsedMs >= graceMin * 60 * 1000
}
