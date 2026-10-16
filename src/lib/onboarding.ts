/**
 * الإعداد الأول: قصص الترحيب، «جهّز محفظتك»، جولة الرئيسية، ومسودة معالج
 * النسخة الاحتياطية. حالة كل خطوة تُحسب من البيانات الفعلية (setupSteps) —
 * ما فيه علامات «تم» يدوية تضيع أو تخالف الواقع. العلامات المحفوظة هنا
 * تخص العرض فقط (شوهدت المقدمة؟ الجولة معلّقة؟ البطاقة مخفية؟).
 */
import { useSyncExternalStore } from 'react'

const INTRO_SEEN_KEY = 'qbnomia.onboarding.introSeen'
const TOUR_PENDING_KEY = 'qbnomia.onboarding.tourPending'
const CHECKLIST_HIDDEN_KEY = 'qbnomia.onboarding.checklistHidden'
const WIZARD_DRAFT_KEY = 'qbnomia.onboarding.backupDraft'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // تفضيلات عرض فقط — تجاهل فشل التخزين.
  }
  emit()
}

const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function isIntroSeen(): boolean {
  return read(INTRO_SEEN_KEY) === '1'
}
export function markIntroSeen(): void {
  write(INTRO_SEEN_KEY, '1')
}

/** الجولة تُجدول بعد إنهاء «عرّفنا بنفسك»، أو يدويًا من «عن التطبيق»، وتظهر مرة وحدة بالرئيسية. */
export function isTourPending(): boolean {
  return read(TOUR_PENDING_KEY) === '1'
}
export function setTourPending(on: boolean): void {
  write(TOUR_PENDING_KEY, on ? '1' : null)
}

export function isChecklistHidden(): boolean {
  return read(CHECKLIST_HIDDEN_KEY) === '1'
}
export function setChecklistHidden(on: boolean): void {
  write(CHECKLIST_HIDDEN_KEY, on ? '1' : null)
}

export function useTourPending(): boolean {
  return useSyncExternalStore(subscribe, isTourPending)
}
export function useChecklistHidden(): boolean {
  return useSyncExternalStore(subscribe, isChecklistHidden)
}

// ---------- خطوات التشغيل ----------

export type SetupStepId = 'accounts' | 'income' | 'budget' | 'backup' | 'biometric'

export interface SetupInput {
  accountsCount: number
  /** دخل مسجّل (حركة دخل أو دخل متكرر مثل الراتب). */
  hasIncome: boolean
  /** سقف شهري عام أو سقف لفئة واحدة على الأقل. */
  hasBudget: boolean
  backupConfigured: boolean
  /** null = الجهاز ما يدعم البصمة، فتسقط الخطوة من القائمة. */
  biometricEnabled: boolean | null
}

export interface SetupStep {
  id: SetupStepId
  done: boolean
}

const ORDER: SetupStepId[] = ['accounts', 'income', 'budget', 'backup', 'biometric']

export function setupSteps(input: SetupInput): SetupStep[] {
  const done: Record<SetupStepId, boolean | null> = {
    accounts: input.accountsCount > 0,
    income: input.hasIncome,
    budget: input.hasBudget,
    backup: input.backupConfigured,
    biometric: input.biometricEnabled,
  }
  return ORDER.filter((id) => done[id] !== null).map((id) => ({ id, done: done[id] === true }))
}

export interface SetupProgress {
  steps: SetupStep[]
  doneCount: number
  total: number
  complete: boolean
  next: SetupStep | null
}

export function setupProgress(steps: SetupStep[]): SetupProgress {
  const doneCount = steps.filter((s) => s.done).length
  return { steps, doneCount, total: steps.length, complete: doneCount === steps.length, next: steps.find((s) => !s.done) ?? null }
}

// ---------- مسودة معالج النسخة الاحتياطية ----------

/**
 * المستخدم يطلع لجوجل ويرجع، وقد يُعاد تحميل الصفحة بالطريق — نحفظ الخطوة
 * والرمز المولّد حتى ما يتغيّر الرمز بعد ما لصقه في الكود. تُمسح بعد الربط.
 */
export interface BackupWizardDraft {
  step: number
  token: string
  savedToken: boolean
  url: string
}

export function getWizardDraft(): BackupWizardDraft | null {
  const raw = read(WIZARD_DRAFT_KEY)
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as Partial<BackupWizardDraft>
    if (typeof d.token !== 'string' || !d.token) return null
    return { step: Number(d.step) || 0, token: d.token, savedToken: d.savedToken === true, url: typeof d.url === 'string' ? d.url : '' }
  } catch {
    return null
  }
}
export function saveWizardDraft(draft: BackupWizardDraft): void {
  write(WIZARD_DRAFT_KEY, JSON.stringify(draft))
}
export function clearWizardDraft(): void {
  write(WIZARD_DRAFT_KEY, null)
}
