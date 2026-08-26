import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { getLastSyncedAt, isSheetsSyncConfigured, pullFromSheets, pushToSheets } from '../lib/sheetsSync'
import { formatDate } from '../lib/format'

type Status = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'ok'; label: string } | { kind: 'error'; label: string }

export function SyncSettingsScreen() {
  const navigate = useNavigate()
  const { exportSnapshot, importSnapshot } = useData()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [lastSynced, setLastSynced] = useState(getLastSyncedAt())
  const configured = isSheetsSyncConfigured()

  async function handlePush() {
    setStatus({ kind: 'busy', label: 'يتم رفع البيانات...' })
    try {
      await pushToSheets(exportSnapshot())
      setStatus({ kind: 'ok', label: 'تم رفع البيانات المشفّرة إلى Google Sheets بنجاح' })
      setLastSynced(getLastSyncedAt())
    } catch (err) {
      setStatus({ kind: 'error', label: err instanceof Error ? err.message : 'فشل الرفع' })
    }
  }

  async function handlePull() {
    if (!window.confirm('سحب البيانات من Google Sheets سيستبدل كل بياناتك المحلية الحالية بالكامل. متابعة؟')) return
    setStatus({ kind: 'busy', label: 'يتم سحب البيانات...' })
    try {
      const snapshot = await pullFromSheets()
      importSnapshot(snapshot)
      setStatus({ kind: 'ok', label: 'تم سحب البيانات وفك تشفيرها بنجاح' })
      setLastSynced(getLastSyncedAt())
    } catch (err) {
      setStatus({ kind: 'error', label: err instanceof Error ? err.message : 'فشل السحب' })
    }
  }

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            ← رجوع
          </button>
          <div className="text-base font-bold">مزامنة Google Sheets</div>
          <div className="w-10" />
        </div>
      }
    >
      {!configured ? (
        <div className="rounded-2xl border border-dashed p-4 text-[12.5px] leading-relaxed" style={{ borderColor: 'rgba(0,226,138,0.35)', color: 'var(--color-text-2)' }}>
          لم يتم إعداد رابط المزامنة بعد. رابط Web App والرمز السري يُضبطان بالكود مباشرة بملف
          <span dir="ltr" className="mx-1 font-mono text-[11px]">src/config/sheetsSync.ts</span>
          — راجع
          <span dir="ltr" className="mx-1 font-mono text-[11px]">google-apps-script/README.md</span>
          للخطوات كاملة، ثم انشر نسخة جديدة من التطبيق.
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(0,226,138,0.35)', color: 'var(--color-text-2)' }}>
            بياناتك تُشفَّر بالكامل بجهازك قبل الإرسال، وتُفكّ بعد الاستقبال — Google Sheets نفسه لا يخزّن أي بيانات مالية مقروءة.
          </div>

          <div className="mb-3 flex gap-3">
            <button
              onClick={handlePush}
              className="flex-1 rounded-2xl py-3 text-[13px] font-bold"
              style={{ background: 'rgba(124,108,255,0.14)', color: 'var(--color-transfer)', border: '1px solid rgba(124,108,255,0.3)' }}
            >
              رفع البيانات ↑
            </button>
            <button
              onClick={handlePull}
              className="flex-1 rounded-2xl py-3 text-[13px] font-bold"
              style={{ background: 'rgba(45,212,191,0.14)', color: 'var(--color-owed-to)', border: '1px solid rgba(45,212,191,0.3)' }}
            >
              سحب البيانات ↓
            </button>
          </div>

          {lastSynced && (
            <div className="mb-3 text-center text-[11.5px] text-[var(--color-text-3)]">
              آخر مزامنة: {formatDate(lastSynced)}
            </div>
          )}
        </>
      )}

      {status.kind !== 'idle' && (
        <div
          className="mt-2 rounded-2xl p-3.5 text-center text-[12.5px] font-semibold"
          style={
            status.kind === 'error'
              ? { background: 'rgba(255,92,92,0.12)', color: 'var(--color-expense)' }
              : status.kind === 'busy'
                ? { background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-2)' }
                : { background: 'rgba(0,226,138,0.12)', color: 'var(--color-accent)' }
          }
        >
          {status.label}
        </div>
      )}
    </ScreenScroll>
  )
}
