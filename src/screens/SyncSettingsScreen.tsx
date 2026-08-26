import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { getLastSyncedAt, isSheetsSyncConfigured, pullFromSheets, pushToSheets } from '../lib/sheetsSync'
import { clearSheetsSyncCredentials, getSheetsSecretToken, getSheetsWebAppUrl, setSheetsSyncCredentials } from '../config/sheetsSync'
import { formatDate } from '../lib/format'

type Status = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'ok'; label: string } | { kind: 'error'; label: string }

export function SyncSettingsScreen() {
  const navigate = useNavigate()
  const { exportSnapshot, importSnapshot } = useData()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [lastSynced, setLastSynced] = useState(getLastSyncedAt())
  const [confirmPullOpen, setConfirmPullOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [configured, setConfigured] = useState(isSheetsSyncConfigured())
  const [url, setUrl] = useState(getSheetsWebAppUrl())
  const [token, setToken] = useState(getSheetsSecretToken())
  const [showToken, setShowToken] = useState(false)

  const canSave = url.trim().length > 0 && token.trim().length > 0

  function handleSaveCredentials() {
    if (!canSave) return
    setSheetsSyncCredentials(url, token)
    setConfigured(true)
    setStatus({ kind: 'ok', label: 'تم حفظ إعدادات الربط على هذا الجهاز' })
  }

  function handleClearCredentials() {
    setConfirmClearOpen(false)
    clearSheetsSyncCredentials()
    setUrl('')
    setToken('')
    setConfigured(false)
    setStatus({ kind: 'idle' })
  }

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
    setConfirmPullOpen(false)
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
            → رجوع
          </button>
          <div className="text-base font-bold">مزامنة Google Sheets</div>
          <div className="w-10" />
        </div>
      }
    >
      <ConfirmDialog
        open={confirmPullOpen}
        title="سحب البيانات"
        message="سحب البيانات من Google Sheets سيستبدل كل بياناتك المحلية الحالية بالكامل."
        confirmLabel="سحب واستبدال"
        color="var(--color-owed-to)"
        onConfirm={handlePull}
        onCancel={() => setConfirmPullOpen(false)}
      />
      <ConfirmDialog
        open={confirmClearOpen}
        title="إزالة الربط"
        message="بيانات الربط (الرابط والرمز السري) بتتمسح من هذا الجهاز بس. بياناتك المالية المحلية ما تتأثر."
        confirmLabel="إزالة"
        color="var(--color-expense)"
        onConfirm={handleClearCredentials}
        onCancel={() => setConfirmClearOpen(false)}
      />

      <div className="mb-5 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(0,226,138,0.35)', color: 'var(--color-text-2)' }}>
        الرابط والرمز السري يُحفظان على هذا الجهاز فقط (مو بكود التطبيق) — بياناتك تُشفَّر بالكامل قبل الإرسال، وGoogle Sheets نفسه لا يخزّن أي بيانات مالية مقروءة.
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">رابط Web App</label>
      <input
        dir="ltr"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://script.google.com/macros/s/.../exec"
        className="mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">الرمز السري</label>
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-1">
        <input
          dir="ltr"
          type={showToken ? 'text' : 'password'}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="نفس الرمز الموضوع بالسكربت"
          className="w-full bg-transparent py-2.5 text-[13px] outline-none placeholder:text-[var(--color-text-3)]"
        />
        <button type="button" onClick={() => setShowToken((s) => !s)} className="flex-shrink-0 text-[11.5px] font-semibold text-[var(--color-text-2)]">
          {showToken ? 'إخفاء' : 'إظهار'}
        </button>
      </div>

      <button
        onClick={handleSaveCredentials}
        disabled={!canSave}
        className="mb-5 w-full rounded-2xl py-3 text-center text-[13.5px] font-bold text-[#04140D] disabled:opacity-40"
        style={{ background: 'var(--color-accent)' }}
      >
        حفظ إعدادات الربط
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
              onClick={() => setConfirmPullOpen(true)}
              className="flex-1 rounded-2xl py-3 text-[13px] font-bold"
              style={{ background: 'rgba(45,212,191,0.14)', color: 'var(--color-owed-to)', border: '1px solid rgba(45,212,191,0.3)' }}
            >
              سحب البيانات ↓
            </button>
          </div>

          <div className="mb-1.5 text-center text-[11px] text-[var(--color-text-3)]">
            كل تعديل جديد (حركة، حساب، سلفة...) يُرفع تلقائيًا بالخلفية — الزرين أعلاه لمزامنة فورية يدوية عند الحاجة فقط.
          </div>

          {lastSynced && (
            <div className="mb-3 text-center text-[11.5px] text-[var(--color-text-3)]">
              آخر مزامنة: {formatDate(lastSynced)}
            </div>
          )}

          <button onClick={() => setConfirmClearOpen(true)} className="mb-3 w-full text-center text-[12px] font-semibold text-[var(--color-text-3)]">
            إزالة الربط من هذا الجهاز
          </button>
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
