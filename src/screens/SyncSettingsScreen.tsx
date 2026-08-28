import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, type DataSnapshot } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { getLastSyncedAt, isSheetsSyncConfigured, pullFromSheets, pushToSheets } from '../lib/sheetsSync'
import { clearSheetsSyncCredentials, getSheetsSecretToken, getSheetsWebAppUrl, setSheetsSyncCredentials } from '../config/sheetsSync'
import { formatDate } from '../lib/format'

type Status = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'ok'; label: string } | { kind: 'error'; label: string }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`
  return `${(bytes / 1024 / 1024).toFixed(2)} ميجابايت`
}

function isDataSnapshot(value: unknown): value is DataSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.accounts) && Array.isArray(v.transactions) && Array.isArray(v.people)
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  )
}
function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V4M12 4 8 8M12 4l4 4" />
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </svg>
  )
}
function ImportIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11M12 15l-4-4M12 15l4-4" />
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </svg>
  )
}

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
  const [confirmImportOpen, setConfirmImportOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<DataSnapshot | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSave = url.trim().length > 0 && token.trim().length > 0

  const backupSnapshot = exportSnapshot()
  const backupSizeBytes = new Blob([JSON.stringify(backupSnapshot)]).size
  const recordsCount =
    backupSnapshot.accounts.length +
    backupSnapshot.transactions.length +
    backupSnapshot.people.length +
    backupSnapshot.loanTransactions.length +
    backupSnapshot.subscriptions.length +
    (backupSnapshot.commitments?.length ?? 0) +
    (backupSnapshot.recurringTransactions?.length ?? 0) +
    backupSnapshot.categories.length +
    backupSnapshot.incomeSources.length

  function handleExportBackup() {
    const json = JSON.stringify(backupSnapshot, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `qb-nomia-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setStatus({ kind: 'ok', label: 'تم تصدير النسخة الاحتياطية على جهازك' })
  }

  function handleFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (!isDataSnapshot(parsed)) {
          setStatus({ kind: 'error', label: 'الملف غير صالح — تأكد إنه نسخة احتياطية صادرة من هذا التطبيق' })
          return
        }
        setPendingImport(parsed)
        setConfirmImportOpen(true)
      } catch {
        setStatus({ kind: 'error', label: 'تعذّر قراءة الملف — تأكد إنه ملف نسخة احتياطية صالح' })
      }
    }
    reader.readAsText(file)
  }

  function handleConfirmImport() {
    setConfirmImportOpen(false)
    if (!pendingImport) return
    importSnapshot(pendingImport)
    setPendingImport(null)
    setStatus({ kind: 'ok', label: 'تم استعادة البيانات من النسخة الاحتياطية بنجاح' })
  }

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
      header={<ScreenHeader title="مزامنة Google Sheets" onBack={() => navigate(-1)} className="pt-8 pb-6" />}
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
      <ConfirmDialog
        open={confirmImportOpen}
        title="استعادة نسخة احتياطية"
        message="استيراد هذا الملف سيستبدل كل بياناتك المحلية الحالية بالكامل."
        confirmLabel="استعادة واستبدال"
        color="var(--color-owed-to)"
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setConfirmImportOpen(false)
          setPendingImport(null)
        }}
      />

      <div className="mb-5 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(255,255,255,0.35)', color: 'var(--color-text-2)' }}>
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
        className="mb-5 w-full rounded-2xl py-3 text-center text-[13.5px] font-bold text-[#0A0A0C] disabled:opacity-40"
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

      <div className="qb-section-label mb-2 mt-6 px-1">نسخة احتياطية محلية</div>

      <div className="qb-card mb-3.5 flex items-center gap-3 p-4">
        <div
          className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-[12px]"
          style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.1)', color: 'var(--color-accent)' }}
        >
          <DatabaseIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold">{formatBytes(backupSizeBytes)}</div>
          <div className="text-[11px] text-[var(--color-text-3)]">{recordsCount} سجل مخزَّن على هذا الجهاز</div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChosen} className="hidden" />

      <button
        onClick={handleExportBackup}
        className="qb-press mb-3 flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-right"
        style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'var(--color-surface)' }}
      >
        <div
          className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]"
          style={{ width: 42, height: 42, background: 'rgba(124,108,255,0.14)', color: 'var(--color-transfer)' }}
        >
          <ExportIcon />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-bold">تصدير نسخة احتياطية</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">يحفظ كل بياناتك بملف JSON على جهازك</div>
        </div>
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="qb-press mb-5 flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-right"
        style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'var(--color-surface)' }}
      >
        <div
          className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]"
          style={{ width: 42, height: 42, background: 'rgba(45,212,191,0.14)', color: 'var(--color-owed-to)' }}
        >
          <ImportIcon />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-bold">استعادة من نسخة احتياطية</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">يختار ملف JSON صادر من هذا التطبيق ويستبدل بياناتك الحالية</div>
        </div>
      </button>

      {status.kind !== 'idle' && (
        <div
          className="mt-2 rounded-2xl p-3.5 text-center text-[12.5px] font-semibold"
          style={
            status.kind === 'error'
              ? { background: 'rgba(255,92,92,0.12)', color: 'var(--color-expense)' }
              : status.kind === 'busy'
                ? { background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-2)' }
                : { background: 'rgba(255,255,255,0.12)', color: 'var(--color-accent)' }
          }
        >
          {status.label}
        </div>
      )}
    </ScreenScroll>
  )
}
