import { useEffect, useState, type ReactNode } from 'react'
import { useData } from '../state/DataContext'
import { subscribeSyncStatus } from '../lib/autoSync'
import { dismissNotice, notify, subscribeNotice, type Notice, type NoticeKind } from '../lib/notify'
import { dismissUndoToast, subscribeUndoToast, triggerUndo, type UndoToastState } from '../lib/undoToast'

const SYNC_TEXT = {
  push: { success: 'تم الحفظ الاحتياطي', error: 'تعذّر الحفظ الاحتياطي — سيُعاد لاحقًا' },
  pull: { success: 'تم تحميل بياناتك', error: 'تعذّر تحميل بياناتك — تعمل ببياناتك المحلية' },
}

const KIND_COLOR: Record<NoticeKind | 'undo', string> = {
  success: 'var(--color-income)',
  info: 'var(--color-text-2)',
  progress: 'var(--color-text-2)',
  warn: 'var(--color-subscription)',
  error: 'var(--color-expense)',
  undo: 'var(--color-text)',
}

function KindIcon({ kind }: { kind: NoticeKind | 'undo' }): ReactNode {
  const common = { viewBox: '0 0 24 24', width: 12, height: 12, fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (kind) {
    case 'success':
      return (
        <svg {...common}>
          <path d="M5 12.5 10 17l9-10" />
        </svg>
      )
    case 'progress':
      return (
        <svg {...common} style={{ animation: 'spin 800ms linear infinite' }}>
          <path d="M21 12a9 9 0 1 1-9-9" />
        </svg>
      )
    case 'undo':
      return (
        <svg {...common} strokeWidth={2.2}>
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
        </svg>
      )
    case 'info':
      return (
        <svg {...common}>
          <path d="M12 11v6M12 7.5h.01" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M12 7v6M12 16.5h.01" />
        </svg>
      )
  }
}

/**
 * "الكبسولة الذكية" — المضيف الوحيد لكل إشعارات التطبيق (يُركَّب مرة بأعلى الشجرة).
 * يظهر بنفس مكان صف الأزرار العائمة وكبسولة العنوان، ويخفيها لحظيًا أثناء ظهوره
 * (`qb-island-active` على <html>) ثم يرجعها — فمستحيل يتراكب معها.
 *
 * المصادر: notify() من أي شاشة، تراجع الحذف (undoToast)، المزامنة (الرفع الخلفي الناجح صامت —
 * يظهر خط رفيع فقط)، وانقطاع/عودة الإنترنت.
 */
export function IslandHost() {
  const data = useData()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [undo, setUndo] = useState<UndoToastState | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => subscribeNotice(setNotice), [])
  useEffect(() => subscribeUndoToast(setUndo), [])

  useEffect(
    () =>
      subscribeSyncStatus((status, direction, manual) => {
        setSyncing(status === 'syncing')
        if (status === 'success' && (manual || direction === 'pull')) notify('success', SYNC_TEXT[direction].success)
        else if (status === 'error') notify('warn', SYNC_TEXT[direction].error)
        else if (status === 'offline' && manual) notify('warn', 'لا يوجد اتصال — جرّب المزامنة لاحقًا')
      }),
    [],
  )

  useEffect(() => {
    const offline = () => notify('warn', 'بدون إنترنت — بياناتك محفوظة على جهازك')
    const online = () => notify('success', 'عاد الاتصال بالإنترنت')
    if (!navigator.onLine) offline()
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [])

  // تراجع الحذف له الأولوية (فيه زر يحتاجه المستخدم الآن).
  const kind: NoticeKind | 'undo' | null = undo ? 'undo' : (notice?.kind ?? null)
  const message = undo ? undo.message : (notice?.message ?? '')
  const active = kind !== null

  useEffect(() => {
    document.documentElement.classList.toggle('qb-island-active', active)
  }, [active])

  const color = kind ? KIND_COLOR[kind] : 'var(--color-text)'

  return (
    <div dir="rtl" className="pointer-events-none fixed inset-x-0 top-0 z-[85]">
      <div className="h-[2.5px] w-full overflow-hidden" style={{ opacity: syncing ? 1 : 0, transition: 'opacity 200ms ease' }} aria-hidden="true">
        <div className="h-full w-1/3 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)', animation: 'indeterminate 1.1s ease-in-out infinite' }} />
      </div>

      <div className="flex justify-center px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
        <div
          role="status"
          aria-live="polite"
          aria-hidden={!active}
          onClick={() => (undo ? dismissUndoToast() : dismissNotice())}
          className="relative flex h-10 w-full max-w-[440px] items-center justify-center gap-2 rounded-full border px-3"
          style={{
            pointerEvents: active ? 'auto' : 'none',
            opacity: active ? 1 : 0,
            transform: active ? 'none' : 'translateY(-8px) scale(0.6)',
            transition: 'opacity 220ms ease, transform 420ms cubic-bezier(0.34,1.56,0.64,1)',
            background: 'rgba(28,28,33,0.92)',
            borderColor: 'var(--color-border-strong)',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
            boxShadow: '0 12px 30px -12px rgba(0,0,0,0.8)',
          }}
        >
          <span
            className="pointer-events-none absolute rounded-full"
            style={{
              inset: '-12px -16px',
              zIndex: -1,
              background: 'rgba(5,5,6,0.35)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              maskImage: 'radial-gradient(closest-side, #000 60%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(closest-side, #000 60%, transparent 100%)',
            }}
          />
          {kind && (
            <span
              className="flex flex-shrink-0 items-center justify-center rounded-full"
              style={{ width: 20, height: 20, background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
            >
              <KindIcon kind={kind} />
            </span>
          )}
          <span className="min-w-0 truncate text-[12.5px] font-semibold">{message}</span>
          {undo && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                triggerUndo(data)
              }}
              className="qb-press flex-shrink-0 rounded-full px-3 py-1 text-[11.5px] font-bold"
              style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
            >
              تراجع
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
