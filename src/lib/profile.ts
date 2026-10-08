/** الملف الشخصي — محفوظ على الجهاز فقط (ويدخل ضمن النسخة الاحتياطية المشفّرة). */
export type Gender = 'm' | 'f'

export interface ProfilePrefs {
  /** "صباح الخير، بلال" بالرئيسية. */
  greetByName: boolean
  /** بطاقة تهنئة في يوم الميلاد. */
  birthday: boolean
  /** الجمعة، يوم الراتب، الرجوع بعد غياب. */
  occasions: boolean
  /** الاسم والصورة بشاشة القفل (مطفأ افتراضيًا للخصوصية). */
  nameOnLock: boolean
}

export interface UserProfile {
  name: string
  gender: Gender
  /** YYYY-MM-DD — اختياري. */
  birthDate?: string
  /** فهرس بـ PROFILE_COLORS. */
  color: number
  prefs: ProfilePrefs
}

export const PROFILE_COLORS = ['#8b7bff', '#3ee08f', '#ffbf47', '#ff5f6d', '#5fb3ff', '#2ee6c8', '#f4f4f6']
export const PROFILE_COLOR_NAMES = ['بنفسجي', 'أخضر', 'ذهبي', 'أحمر', 'أزرق', 'فيروزي', 'أبيض']

export const DEFAULT_PREFS: ProfilePrefs = { greetByName: true, birthday: true, occasions: true, nameOnLock: false }

const PROFILE_KEY = 'qbnomia.profile'
const ONBOARDED_KEY = 'qbnomia.profile.onboarded'
const LAST_OPEN_KEY = 'qbnomia.lastOpenAt'
const PREV_OPEN_KEY = 'qbnomia.prevOpenAt'

type Listener = () => void
const listeners = new Set<Listener>()
let cache: UserProfile | null | undefined

function read(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<UserProfile>
    if (!p || typeof p.name !== 'string') return null
    return { name: p.name, gender: p.gender === 'f' ? 'f' : 'm', birthDate: p.birthDate || undefined, color: Number(p.color) || 0, prefs: { ...DEFAULT_PREFS, ...p.prefs } }
  } catch {
    return null
  }
}

export function getProfile(): UserProfile | null {
  if (cache === undefined) cache = read()
  return cache
}

export function saveProfile(profile: UserProfile | null): void {
  if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  else localStorage.removeItem(PROFILE_KEY)
  cache = profile
  markProfileOnboarded()
  listeners.forEach((l) => l())
}

export function subscribeProfile(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** هل مرّ المستخدم بشاشة "عرّفنا بنفسك" (أكملها أو تخطاها)؟ */
export function isProfileOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === '1' || getProfile() !== null
}

export function markProfileOnboarded(): void {
  localStorage.setItem(ONBOARDED_KEY, '1')
}

/** للاختبارات فقط. */
export function resetProfileCache(): void {
  cache = undefined
}

/** صياغة حسب المخاطبة: g(p, 'صرفت', 'صرفتِ'). */
export function g(profile: Pick<UserProfile, 'gender'> | null, m: string, f: string): string {
  return profile?.gender === 'f' ? f : m
}

export function ageOf(birthDate: string | undefined, today: Date): number | null {
  const m = birthDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  let age = today.getFullYear() - y
  const month = today.getMonth() + 1
  if (month < mo || (month === mo && today.getDate() < d)) age--
  return age >= 0 && age < 130 ? age : null
}

/** "3 سنوات" / "30 سنة" — تمييز العدد بالعربية. */
export function ageLabel(age: number): string {
  return age >= 3 && age <= 10 ? `${age} سنوات` : `${age} سنة`
}

export function isBirthday(birthDate: string | undefined, today: Date): boolean {
  const m = birthDate?.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!m) return false
  return Number(m[1]) === today.getMonth() + 1 && Number(m[2]) === today.getDate()
}

export type DayPart = 'night' | 'morning' | 'noon' | 'evening'

export function dayPart(hour: number): DayPart {
  if (hour < 5) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'noon'
  return 'evening'
}

const GREETING: Record<DayPart, string> = { night: 'ليلة سعيدة', morning: 'صباح الخير', noon: 'نهارك سعيد', evening: 'مساء الخير' }

/** "مساء الخير، بلال" — أو بدون اسم لو ما فيه ملف أو الترحيب بالاسم مطفأ. */
export function greetingText(hour: number, profile: UserProfile | null): string {
  const base = GREETING[dayPart(hour)]
  const name = profile?.prefs.greetByName ? profile.name.trim() : ''
  return name ? `${base}، ${name}` : base
}

/**
 * يسجّل فتح التطبيق ويرجّع وقت الفتح السابق (قبل هذه الجلسة) — لبطاقة "الرجوع بعد غياب".
 * القيمة السابقة تُحفظ للجلسة حتى تبقى البطاقة ثابتة لو رجع المستخدم للرئيسية.
 */
export function recordOpenAndGetPrevious(now = new Date()): string | null {
  const session = sessionStorage.getItem(PREV_OPEN_KEY)
  if (session !== null) return session || null
  const prev = localStorage.getItem(LAST_OPEN_KEY)
  sessionStorage.setItem(PREV_OPEN_KEY, prev ?? '')
  localStorage.setItem(LAST_OPEN_KEY, now.toISOString())
  return prev
}

export type Occasion =
  | { kind: 'birthday'; age: number | null }
  | { kind: 'salary' }
  | { kind: 'away'; days: number }
  | { kind: 'friday' }

/** المناسبة الأهم اليوم (عيد الميلاد ← الراتب ← الرجوع بعد غياب ← الجمعة)، أو null. */
export function currentOccasion(
  profile: UserProfile | null,
  today: Date,
  opts: { salaryToday: boolean; prevOpenAt: string | null },
): Occasion | null {
  if (profile?.prefs.birthday && isBirthday(profile.birthDate, today)) return { kind: 'birthday', age: ageOf(profile.birthDate, today) }
  if (profile && !profile.prefs.occasions) return null
  if (opts.salaryToday) return { kind: 'salary' }
  if (opts.prevOpenAt) {
    const days = Math.floor((today.getTime() - new Date(opts.prevOpenAt).getTime()) / 86400000)
    if (days >= 3) return { kind: 'away', days }
  }
  if (today.getDay() === 5) return { kind: 'friday' }
  return null
}
