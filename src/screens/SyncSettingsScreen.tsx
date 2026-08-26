import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { getLastSyncedAt, getSyncConfig, pullFromSheets, pushToSheets, saveSyncConfig } from '../lib/sheetsSync'
import { formatDate } from '../lib/format'

type Status = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'ok'; label: string } | { kind: 'error'; label: string }

export function SyncSettingsScreen() {
  const navigate = useNavigate()
  const { exportSnapshot, importSnapshot } = useData()
  const initial = getSyncConfig()
  const [url, setUrl] = useState(initial.url)
  const [token, setToken] = useState(initial.token)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [lastSynced, setLastSynced] = useState(getLastSyncedAt())

  const configured = Boolean(initial.url && initial.token)

  function handleSave() {
    saveSyncConfig(url, token)
    setStatus({ kind: 'ok', label: 'تم حفظ الإعدادات' })
  }

  async function handlePush() {
    saveSyncConfig(url, token)
    setStatus({ kind: 'busy', label: 'يتم رفع البيانات...' })
    try {
      await pushToSheets(exportSnapshot())
      setStatus({ kind: 'ok', label: 'تم رفع البيانات إلى Google Sheets بنجاح' })
      setLastSynced(getLastSyncedAt())
    } catch (err) {
      setStatus({ kind: 'error', label: err instanceof Error ? err.message : 'فشل الرفع' })
    }
  }

  async function handlePull() {
    if (!window.confirm('سحب البيانات من Google Sheets سيستبدل كل بياناتك المحلية الحالية بالكامل. متابعة؟')) return
    saveSyncConfig(url, token)
    setStatus({ kind: 'busy', label: 'يتم سحب البيانات...' })
    try {
      const snapshot = await pullFromSheets()
      importSnapshot(snapshot)
      setStatus({ kind: 'ok', label: 'تم سحب البيانات من Google Sheets بنجاح' })
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
          <div className="text-base font-bold">ربط Google Sheets</div>
          <div className="w-10" />
        </div>
      }
    >
      <div className="mb-5 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(0,226,138,0.35)', color: 'var(--color-text-2)' }}>
        اربط جدول Google Sheets الخاص بك عن طريق نشر سكربت Google Apps Script (الكود جاهز في
        <span dir="ltr" className="mx-1 font-mono text-[11px]">google-apps-script/Code.gs</span>
        بمستودع المشروع، مع شرح كامل خطوة بخطوة في
        <span dir="ltr" className="mx-1 font-mono text-[11px]">google-apps-script/README.md</span>
        ). بعد النشر، الصق رابط Web App والرمز السري هنا.
      </div>

      <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">رابط Web App</label>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        dir="ltr"
        placeholder="https://script.google.com/macros/s/xxx/exec"
        className="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">الرمز السري (SECRET_TOKEN)</label>
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        dir="ltr"
        placeholder="نفس القيمة اللي حطيتها بالكود"
        className="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <button
        onClick={handleSave}
        disabled={!url.trim() || !token.trim()}
        className="mb-6 w-full rounded-2xl py-3 text-center text-[13.5px] font-bold text-[#04140D] disabled:opacity-40"
        style={{ background: 'var(--color-accent)' }}
      >
        حفظ الإعدادات
      </button>

      {configured && (
        <>
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
          className="rounded-2xl p-3.5 text-center text-[12.5px] font-semibold"
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
