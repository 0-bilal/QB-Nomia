import { useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, type DataSnapshot } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { getLastSyncedAt, isSheetsSyncConfigured, pullFromSheets, pushToSheets } from '../lib/sheetsSync'
import { clearSheetsSyncCredentials, getSheetsSecretToken, getSheetsWebAppUrl, setSheetsSyncCredentials } from '../config/sheetsSync'
import { formatDate } from '../lib/format'
import { getLastBackupExportedAt, markBackupExported } from '../lib/backup'
import { dismissNotice, notify } from '../lib/notify'

type Status = { kind: 'idle' } | { kind: 'busy'; label: string } | { kind: 'ok'; label: string } | { kind: 'error'; label: string }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** وقت نسبي مختصر ("قبل ٤ دقائق") — يرجع للتاريخ الكامل بعد أسبوع. */
function formatRelative(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1) return 'الآن'
  if (diffMin < 60) return `قبل ${diffMin} دقيقة`
  const hours = Math.floor(diffMin / 60)
  if (hours < 24) return `قبل ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'أمس'
  if (days < 7) return `قبل ${days} أيام`
  return formatDate(iso)
}

/** يختصر رابط Web App لسطر الملخص: النطاق + بداية ونهاية معرّف السكربت. */
function shortenUrl(url: string): string {
  try {
    const u = new URL(url)
    const id = u.pathname.split('/').filter(Boolean).find((p) => p.length > 16)
    return id ? `${u.host}/…/${id.slice(0, 4)}…${id.slice(-2)}/exec` : `${u.host}${u.pathname}`
  } catch {
    return url
  }
}

function isDataSnapshot(value: unknown): value is DataSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.accounts) && Array.isArray(v.transactions) && Array.isArray(v.people)
}

function Svg({ size = 18, children, strokeWidth = 1.9 }: { size?: number; children: ReactNode; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
const CloudIcon = ({ size = 26 }: { size?: number }) => (
  <Svg size={size} strokeWidth={1.8}>
    <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-1.8A4 4 0 0 0 6.5 16" />
    <path d="M12 12v6M9.5 15.5 12 18l2.5-2.5" />
  </Svg>
)
const UploadIcon = ({ size = 18 }: { size?: number }) => (
  <Svg size={size} strokeWidth={2}>
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
  </Svg>
)
const DownloadIcon = ({ size = 18 }: { size?: number }) => (
  <Svg size={size} strokeWidth={2}>
    <path d="M12 4v11M8 11l4 4 4-4" />
    <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
  </Svg>
)
const LinkIcon = () => (
  <Svg>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Svg>
)
const LockIcon = ({ size = 12 }: { size?: number }) => (
  <Svg size={size} strokeWidth={2.2}>
    <rect x="4" y="10" width="16" height="11" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Svg>
)
const RefreshIcon = ({ size = 12 }: { size?: number }) => (
  <Svg size={size} strokeWidth={2.2}>
    <path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" />
  </Svg>
)
const RecordsIcon = ({ size = 12 }: { size?: number }) => (
  <Svg size={size} strokeWidth={2.2}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
  </Svg>
)
const ChevronDown = ({ open }: { open: boolean }) => (
  <span className="flex-shrink-0 text-[var(--color-text-3)]" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 250ms cubic-bezier(0.22,1,0.36,1)' }}>
    <Svg size={14} strokeWidth={2.4}>
      <polyline points="6,9 12,15 18,9" />
    </Svg>
  </span>
)
const ChevronStart = () => (
  <span className="flex-shrink-0 text-[var(--color-text-3)]">
    <Svg size={14} strokeWidth={2.4}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  </span>
)

function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={tone === 'good' ? { background: 'rgba(62,224,143,0.1)', color: 'var(--color-income)' } : { background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-2)' }}
    >
      {children}
    </span>
  )
}

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mx-1.5 mb-2.5 mt-6 flex items-baseline justify-between gap-2">
      <div className="text-[13px] font-semibold">{title}</div>
      {hint && <div className="truncate text-[11px] text-[var(--color-text-3)]">{hint}</div>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <label className="mx-1 mb-1.5 block text-[12px] font-medium text-[var(--color-text-2)]">{label}</label>
      <div className="mb-3.5 flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] px-3.5">{children}</div>
    </>
  )
}

function ActionRow({ icon, iconStyle, title, desc, onClick }: { icon: ReactNode; iconStyle: CSSProperties; title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="qb-press flex w-full items-center gap-3 border-t border-[var(--color-border)] px-4 py-3.5 text-right">
      <div className="flex flex-shrink-0 items-center justify-center rounded-full" style={{ width: 38, height: 38, ...iconStyle }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">{title}</div>
        <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-3)]">{desc}</div>
      </div>
      <ChevronStart />
    </button>
  )
}

const STEPS: ReactNode[] = [
  <>انسخ <strong className="font-semibold text-[var(--color-text)]">سكربت QB-Nomia</strong> إلى Google Apps Script وضع فيه رمزًا سريًا من اختيارك.</>,
  <>انشره كـ <strong className="font-semibold text-[var(--color-text)]">Web App</strong> بصلاحية «Anyone» وانسخ الرابط المنتهي بـ <span dir="ltr" className="num">/exec</span>.</>,
  <>الصق <strong className="font-semibold text-[var(--color-text)]">الرابط والرمز</strong> في الأسفل واضغط «ربط».</>,
]

export function SyncSettingsScreen() {
  const navigate = useNavigate()
  const { exportSnapshot, importSnapshot } = useData()
  const [status, setStatusRaw] = useState<Status>({ kind: 'idle' })
  const [lastSynced, setLastSynced] = useState(getLastSyncedAt())
  const [lastExported, setLastExported] = useState(getLastBackupExportedAt())
  const [confirmPullOpen, setConfirmPullOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [configured, setConfigured] = useState(isSheetsSyncConfigured())
  const [connOpen, setConnOpen] = useState(!isSheetsSyncConfigured())
  const [url, setUrl] = useState(getSheetsWebAppUrl())
  const [token, setToken] = useState(getSheetsSecretToken())
  const [showToken, setShowToken] = useState(false)
  const [confirmImportOpen, setConfirmImportOpen] = useState(false)
  const [pendingImport, setPendingImport] = useState<DataSnapshot | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSave = url.trim().length > 0 && token.trim().length > 0
  const busy = status.kind === 'busy'

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

  // نتيجة كل عملية تظهر بالكبسولة الذكية (notify) بدل إشعار سفلي خاص بالشاشة.
  function setStatus(next: Status) {
    setStatusRaw(next)
    if (next.kind === 'busy') notify('progress', next.label)
    else if (next.kind === 'ok') notify('success', next.label)
    else if (next.kind === 'error') notify('error', next.label)
    else dismissNotice()
  }

  function handleExportBackup() {
    const json = JSON.stringify(backupSnapshot, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `qb-nomia-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 2000)
    markBackupExported()
    setLastExported(getLastBackupExportedAt())
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
    if (!canSave) {
      setStatus({ kind: 'error', label: 'أدخل رابط Web App والرمز السري أولًا' })
      return
    }
    setSheetsSyncCredentials(url, token)
    setConfigured(true)
    setConnOpen(false)
    setStatus({ kind: 'ok', label: 'تم حفظ إعدادات الربط على هذا الجهاز' })
  }

  function handleClearCredentials() {
    setConfirmClearOpen(false)
    clearSheetsSyncCredentials()
    setUrl('')
    setToken('')
    setConfigured(false)
    setConnOpen(true)
    setStatus({ kind: 'ok', label: 'تمت إزالة الربط من هذا الجهاز' })
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
    <ScreenScroll header={<ScreenHeader title="المزامنة والنسخ الاحتياطي" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
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

      {/* بطاقة الحالة */}
      <div className="qb-card-elevated qb-rise p-5">
        <div className="flex items-center gap-3.5">
          <div className="relative flex-shrink-0">
            <div
              className="flex items-center justify-center rounded-full"
              style={
                configured
                  ? { width: 58, height: 58, background: 'var(--color-accent)', color: 'var(--color-on-accent)', boxShadow: '0 10px 30px -10px rgba(255,255,255,0.35)' }
                  : { width: 58, height: 58, background: 'var(--color-surface-high)', color: 'var(--color-text-3)' }
              }
            >
              <CloudIcon />
            </div>
            {busy && (
              <span
                className="absolute rounded-full border-2 border-transparent border-t-[var(--color-accent)]"
                style={{ inset: -5, animation: 'spin 800ms linear infinite' }}
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[17px] font-semibold">
              {configured && <span className="rounded-full" style={{ width: 8, height: 8, background: 'var(--color-income)', boxShadow: '0 0 0 4px rgba(62,224,143,0.15)' }} />}
              {configured ? 'المزامنة مفعّلة' : 'المزامنة غير مربوطة'}
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--color-text-3)]">
              {configured
                ? lastSynced
                  ? `آخر مزامنة ${formatRelative(lastSynced)}`
                  : 'لم تتم أي مزامنة بعد'
                : 'اربط Google Sheets لحفظ نسخة مشفّرة من بياناتك'}
            </div>
          </div>
        </div>

        {configured && (
          <>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Chip tone="good">
                <RefreshIcon />
                رفع تلقائي
              </Chip>
              <Chip>
                <LockIcon />
                تشفير كامل
              </Chip>
              <Chip>
                <RecordsIcon />
                <span className="num">{recordsCount.toLocaleString('en-US')}</span> سجل
              </Chip>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={handlePush} disabled={busy} className="qb-btn-primary flex items-center justify-center gap-2 py-3 text-[13px] disabled:opacity-40">
                <UploadIcon size={16} />
                رفع الآن
              </button>
              <button
                onClick={() => setConfirmPullOpen(true)}
                disabled={busy}
                className="qb-press flex items-center justify-center gap-2 rounded-full py-3 text-[13px] font-semibold disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--color-border-strong)' }}
              >
                <DownloadIcon size={16} />
                سحب واستبدال
              </button>
            </div>
            <div className="mt-2.5 text-center text-[11px] leading-relaxed text-[var(--color-text-3)]">
              كل تعديل يُرفع تلقائيًا بالخلفية — الأزرار للمزامنة الفورية عند الحاجة.
            </div>
          </>
        )}
      </div>

      {/* خطوات الربط — قبل الربط فقط */}
      {!configured && (
        <>
          <SectionHead title="طريقة الربط" hint="٣ خطوات" />
          <div className="qb-card px-4 py-1.5">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3 border-t border-[var(--color-border)] py-3 first:border-t-0">
                <span className="num flex flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-high)] text-[11.5px] font-bold" style={{ width: 24, height: 24 }}>
                  {i + 1}
                </span>
                <div className="text-[12.5px] leading-relaxed text-[var(--color-text-2)]">{step}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* إعدادات الربط */}
      <SectionHead title="إعدادات الربط" hint="محفوظة على هذا الجهاز فقط" />
      <div className="qb-card overflow-hidden">
        <button onClick={() => setConnOpen((o) => !o)} aria-expanded={connOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-right">
          <div className="flex flex-shrink-0 items-center justify-center rounded-full" style={{ width: 38, height: 38, background: 'rgba(139,123,255,0.14)', color: 'var(--color-transfer)' }}>
            <LinkIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold">Web App والرمز السري</div>
            <div className="mt-0.5 truncate text-[11px] text-[var(--color-text-3)]">
              {configured ? <span dir="ltr" className="num">{shortenUrl(getSheetsWebAppUrl())}</span> : 'غير مربوط — أدخل الرابط والرمز'}
            </div>
          </div>
          <ChevronDown open={connOpen} />
        </button>
        <div className="grid" style={{ gridTemplateRows: connOpen ? '1fr' : '0fr', transition: 'grid-template-rows 300ms cubic-bezier(0.22,1,0.36,1)' }}>
          <div className="overflow-hidden">
            <div className="px-4 pb-4">
              <Field label="رابط Web App">
                <input
                  dir="ltr"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full min-w-0 bg-transparent py-3 text-[13px] outline-none placeholder:text-[var(--color-text-3)]"
                />
              </Field>
              <Field label="الرمز السري">
                <input
                  dir="ltr"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="نفس الرمز الموضوع بالسكربت"
                  className="w-full min-w-0 bg-transparent py-3 text-[13px] outline-none placeholder:text-[var(--color-text-3)]"
                />
                <button type="button" onClick={() => setShowToken((s) => !s)} className="flex-shrink-0 text-[11.5px] font-semibold text-[var(--color-text-2)]">
                  {showToken ? 'إخفاء' : 'إظهار'}
                </button>
              </Field>
              <button onClick={handleSaveCredentials} disabled={!canSave} className="qb-btn-primary w-full py-3 text-center text-[13.5px]">
                {configured ? 'حفظ التغييرات' : 'ربط'}
              </button>
              {configured && (
                <button onClick={() => setConfirmClearOpen(true)} className="block w-full pb-0.5 pt-3 text-center text-[12px] font-semibold text-[var(--color-expense)]">
                  إزالة الربط من هذا الجهاز
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* النسخة الاحتياطية المحلية */}
      <SectionHead title="نسخة احتياطية محلية" hint="ملف JSON على جهازك" />
      <div className="qb-card overflow-hidden">
        <div className="grid grid-cols-3">
          {[
            { v: <span dir="ltr" className="num">{formatBytes(backupSizeBytes)}</span>, k: 'حجم البيانات' },
            { v: <span className="num">{recordsCount.toLocaleString('en-US')}</span>, k: 'سجل' },
            { v: lastExported ? formatRelative(lastExported) : 'لم يتم', k: 'آخر تصدير' },
          ].map((s, i) => (
            <div key={i} className="border-s border-[var(--color-border)] px-2 py-3.5 text-center first:border-s-0">
              <div className="truncate text-[15px] font-bold">{s.v}</div>
              <div className="mt-0.5 text-[10.5px] text-[var(--color-text-3)]">{s.k}</div>
            </div>
          ))}
        </div>
        <ActionRow
          icon={<UploadIcon />}
          iconStyle={{ background: 'var(--color-accent-soft)', color: 'var(--color-text)' }}
          title="تصدير نسخة احتياطية"
          desc="يحفظ كل بياناتك في ملف على جهازك"
          onClick={handleExportBackup}
        />
        <ActionRow
          icon={<DownloadIcon />}
          iconStyle={{ background: 'rgba(46,230,200,0.12)', color: 'var(--color-owed-to)' }}
          title="استعادة من ملف"
          desc="يستبدل بياناتك الحالية بالكامل"
          onClick={() => fileInputRef.current?.click()}
        />
      </div>
      <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleFileChosen} className="hidden" />

      <div className="mt-3.5 flex items-start justify-center gap-1.5 px-2 text-center text-[11px] leading-relaxed text-[var(--color-text-3)]">
        <span className="mt-0.5 flex-shrink-0">
          <LockIcon />
        </span>
        <span>بياناتك تُشفَّر بالكامل قبل الإرسال، وGoogle Sheets لا يخزّن أي بيانات مالية مقروءة.</span>
      </div>

    </ScreenScroll>
  )
}
