const GOLD_PRICE_KEY = 'qbnomia.zakat.goldPricePerGram'
const GOLD_PRICE_UPDATED_KEY = 'qbnomia.zakat.goldPriceUpdatedAt'

/** نصاب زكاة النقود بالجرامات (85 جرام ذهب عيار 24) والنسبة الشرعية (2.5%) — ثوابت شرعية ثابتة. */
export const NISAB_GOLD_GRAMS = 85
export const ZAKAT_RATE = 0.025
/** تقريب السنة الهجرية بالأيام — يُستخدم لحساب تمام الحول. */
export const HAWL_DAYS = 354

/**
 * سعر جرام الذهب تفضيل جهاز محلي بحت يُدخله المستخدم يدويًا (التطبيق بلا خادم خلفي فما
 * فيه طريقة آمنة لجلبه تلقائيًا بدون كشف مفتاح API بكود العميل) — يُخزَّن مع تاريخ آخر تحديث.
 */
export function getGoldPricePerGram(): number | null {
  const raw = localStorage.getItem(GOLD_PRICE_KEY)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function setGoldPricePerGram(price: number): void {
  localStorage.setItem(GOLD_PRICE_KEY, String(price))
  localStorage.setItem(GOLD_PRICE_UPDATED_KEY, new Date().toISOString())
}

export function getGoldPriceUpdatedAt(): string | null {
  return localStorage.getItem(GOLD_PRICE_UPDATED_KEY)
}

export interface ZakatStatus {
  nisab: number
  meetsNisab: boolean
  hawlComplete: boolean
  daysElapsed: number
  daysRemaining: number
  due: number
}

/**
 * حالة زكاة هدف ادخار واحد: يحتاج بلوغ النصاب (85 جرام ذهب بالسعر الحالي) ومرور
 * الحول (354 يومًا تقريبًا) على تاريخ بدايته حتى تجب الزكاة (2.5% من الرصيد).
 */
export function computeZakatStatus(balance: number, goldPricePerGram: number, hawlStartDate: string, today: Date = new Date()): ZakatStatus {
  const nisab = NISAB_GOLD_GRAMS * goldPricePerGram
  const meetsNisab = balance >= nisab
  const start = new Date(hawlStartDate)
  const daysElapsed = Math.max(0, Math.floor((today.getTime() - start.getTime()) / 86400000))
  const hawlComplete = daysElapsed >= HAWL_DAYS
  const due = meetsNisab && hawlComplete ? balance * ZAKAT_RATE : 0
  return { nisab, meetsNisab, hawlComplete, daysElapsed, daysRemaining: Math.max(0, HAWL_DAYS - daysElapsed), due }
}
