/**
 * إشعارات التطبيق الموحّدة — كلها تظهر بمكان واحد: "الكبسولة الذكية" أعلى الشاشة (IslandHost)،
 * فلا تتراكب مع الأزرار العائمة أو كبسولة العنوان. pub/sub بسيط بنفس نمط autoSync/undoToast
 * عشان يُستدعى من أي مكان (حتى خارج React).
 *
 * إشعار واحد في نفس الوقت: الجديد يستبدل القديم. الأخطاء تبقى أطول من رسائل النجاح.
 */
export type NoticeKind = 'success' | 'error' | 'warn' | 'info' | 'progress'

export interface Notice {
  id: number
  kind: NoticeKind
  message: string
}

type Listener = (notice: Notice | null) => void

const DEFAULT_DURATION: Record<NoticeKind, number> = {
  success: 2600,
  info: 2600,
  warn: 4000,
  error: 4500,
  progress: 0, // يبقى حتى يُستبدل أو يُغلق
}

let current: Notice | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let nextId = 0
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((l) => l(current))
}

export function notify(kind: NoticeKind, message: string, durationMs = DEFAULT_DURATION[kind]): number {
  if (timer) clearTimeout(timer)
  timer = null
  const id = ++nextId
  current = { id, kind, message }
  emit()
  if (durationMs > 0) {
    timer = setTimeout(() => {
      if (current?.id === id) dismissNotice()
    }, durationMs)
  }
  return id
}

/** يغلق الإشعار الحالي — أو إشعارًا محددًا فقط لو ما زال هو المعروض. */
export function dismissNotice(id?: number): void {
  if (id !== undefined && current?.id !== id) return
  current = null
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  emit()
}

export function subscribeNotice(listener: Listener): () => void {
  listeners.add(listener)
  listener(current)
  return () => listeners.delete(listener)
}
