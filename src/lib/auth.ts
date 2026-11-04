const STORAGE_KEY = 'qbnomia.auth'

interface StoredAuth {
  salt: string
  hash: string
  digits: number
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function randomSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return bytesToHex(arr.buffer)
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + pin)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(digest)
}

function readStored(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredAuth
  } catch {
    return null
  }
}

export function hasPinConfigured(): boolean {
  return readStored() !== null
}

export async function setupPin(pin: string): Promise<void> {
  const salt = randomSalt()
  const hash = await hashPin(pin, salt)
  const stored: StoredAuth = { salt, hash, digits: pin.length }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

/**
 * حد المحاولات الخاطئة: أول 5 محاولات مجانية، وبعدها انتظار يتضاعف مع كل محاولة خاطئة
 * (30 ثانية، دقيقة، دقيقتين…) بحد أقصى 15 دقيقة. محفوظ على الجهاز حتى ما تصفّره إعادة التشغيل.
 */
const FAILURES_KEY = 'qbnomia.auth.failures'
export const FREE_PIN_ATTEMPTS = 5
const BASE_LOCKOUT_MS = 30_000
const MAX_LOCKOUT_MS = 15 * 60_000

interface PinFailures {
  count: number
  lockedUntil: number
}

function readFailures(): PinFailures {
  try {
    const parsed = JSON.parse(localStorage.getItem(FAILURES_KEY) ?? '') as PinFailures
    if (typeof parsed?.count === 'number' && typeof parsed?.lockedUntil === 'number') return parsed
  } catch {
    // لا شيء محفوظ أو قيمة تالفة — نبدأ من الصفر.
  }
  return { count: 0, lockedUntil: 0 }
}

export function lockoutDurationMs(failures: number): number {
  if (failures < FREE_PIN_ATTEMPTS) return 0
  return Math.min(BASE_LOCKOUT_MS * 2 ** (failures - FREE_PIN_ATTEMPTS), MAX_LOCKOUT_MS)
}

/** كم باقي (بالملي ثانية) قبل ما يُسمح بمحاولة جديدة — 0 يعني مسموح الآن. */
export function pinLockoutRemainingMs(now = Date.now()): number {
  return Math.max(0, readFailures().lockedUntil - now)
}

/** مدة المهلة الحالية كاملة — لرسم حلقة العدّاد التنازلي في شاشة القفل. */
export function pinLockoutTotalMs(): number {
  return lockoutDurationMs(readFailures().count)
}

function recordPinFailure(now: number): void {
  const count = readFailures().count + 1
  localStorage.setItem(FAILURES_KEY, JSON.stringify({ count, lockedUntil: now + lockoutDurationMs(count) }))
}

function clearPinFailures(): void {
  localStorage.removeItem(FAILURES_KEY)
}

/** يتحقق من الرقم — ويرفض بدون تحقق أثناء مهلة الانتظار بعد المحاولات الخاطئة. */
export async function verifyPin(pin: string, now = Date.now()): Promise<boolean> {
  const stored = readStored()
  if (!stored) return false
  if (pinLockoutRemainingMs(now) > 0) return false
  const hash = await hashPin(pin, stored.salt)
  const ok = hash === stored.hash
  if (ok) clearPinFailures()
  else recordPinFailure(now)
  return ok
}

export function configuredDigits(): number {
  return readStored()?.digits ?? 6
}

export function resetPin(): void {
  localStorage.removeItem(STORAGE_KEY)
  clearPinFailures()
}
