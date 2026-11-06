import { useEffect, useState, type ReactNode } from 'react'
import { SheetHandle } from './SheetHandle'
import { HoldToConfirm } from './HoldToConfirm'
import { useData, type DataSnapshot } from '../state/DataContext'
import { useSyncConflict } from '../hooks/useSyncConflict'
import { isSheetsSyncConfigured } from '../config/sheetsSync'
import { fetchRemoteCopy, pullFromSheets, pushToSheets, type RemoteCopy } from '../lib/sheetsSync'
import { conflictDiff, getLocalEditedAt, newerSide, type ConflictDiff, type DiffItem } from '../lib/syncConflict'
import { agoLabel, countLabel } from '../lib/forgotPin'
import { downloadSnapshotFile } from '../lib/backup'
import { formatAmount } from '../lib/format'
import { MONTHS_AR } from '../lib/txFilters'
import { notify } from '../lib/notify'

const TX: [string, string, string, string] = ['حركة', 'حركتين', 'حركات', 'حركة']
const SUB = 'var(--color-subscription)'

function Icon({ children, size = 18, width = 1.9 }: { children: ReactNode; size?: number; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
const PhoneIcon = () => <Icon><path d="M9 2.5h6a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-13a3 3 0 0 1 3-3zM11 18h2" /></Icon>
const CloudIcon = () => <Icon><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1 0 9.5z" /></Icon>
const SplitIcon = () => <Icon size={20}><path d="M6 3v6a6 6 0 0 0 6 6 6 6 0 0 1 6 6M18 3v6a6 6 0 0 1-6 6" /></Icon>

const dayMonth = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS_AR[Number(iso.slice(5, 7)) - 1]}`
const onlyCount = (n: number) => (n === 0 ? 'ما فيها حركات ناقصة' : `فيها ${countLabel(n, TX)} مو موجودة`)

/** بطاقة الرئيسية: تظهر طول ما فيه تعارض، وتفتح ورقة الحل. */
export function SyncConflictCard({ className = '' }: { className?: string }) {
  const conflict = useSyncConflict()
  const [open, setOpen] = useState(false)
  if (!conflict || !isSheetsSyncConfigured()) return null
  return (
    <>
      <div
        className={`flex items-start gap-3 rounded-[22px] border p-3.5 ${className}`}
        style={{ background: `color-mix(in srgb, ${SUB} 9%, var(--color-surface))`, borderColor: `color-mix(in srgb, ${SUB} 32%, transparent)` }}
      >
        <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[13px]" style={{ background: `color-mix(in srgb, ${SUB} 16%, transparent)`, color: SUB }}>
          <SplitIcon />
        </span>
        <div className="flex-1">
          <div className="text-[13.5px] font-semibold">المزامنة متوقفة</div>
          <div className="mt-0.5 text-[12px] leading-[1.7] text-[var(--color-text-2)]">
            فيه تعديلات انحفظت في Google Sheets من {conflict.remote ? conflict.remote.deviceLabel : 'جهاز ثاني'}، وهذا الجهاز عنده تعديلات ما انرفعت. اختر وش تعتمد.
          </div>
          <button type="button" onClick={() => setOpen(true)} className="qb-press mt-2.5 inline-flex h-[34px] items-center rounded-full bg-[var(--color-accent)] px-3.5 text-[12.5px] font-bold text-[var(--color-on-accent)]">
            حلّ التعارض
          </button>
        </div>
      </div>
      {open && <SyncConflictSheet onClose={() => setOpen(false)} />}
    </>
  )
}

type Side = 'local' | 'remote'
type Loaded = { remote: RemoteCopy | null; local: DataSnapshot; diff: ConflictDiff }

/** ورقة الحل (الخيار 2 المعتمد): تختار النسخة، ثم صفحة توضّح وش بيضيع بالضبط، ثم ضغط مطوّل. */
export function SyncConflictSheet({ onClose }: { onClose: () => void }) {
  const { exportSnapshot, importSnapshot } = useData()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [pick, setPick] = useState<Side | null>(null)
  const [working, setWorking] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetchRemoteCopy()
      .then((remote) => {
        if (!alive) return
        const local = exportSnapshot()
        setLoaded({ remote, local, diff: remote ? conflictDiff(local, remote.snapshot) : { localOnly: [], remoteOnly: [] } })
      })
      .catch((err) => alive && setLoadError(err instanceof Error ? err.message : 'تعذّر الوصول لـ Google Sheets'))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  async function resolve(side: Side) {
    setWorking(true)
    try {
      if (side === 'local') {
        await pushToSheets(exportSnapshot(), { force: true })
        notify('success', 'انرفعت نسخة هذا الجهاز · المزامنة رجعت')
      } else {
        importSnapshot(await pullFromSheets())
        notify('success', 'انحفظت نسخة Sheets · المزامنة رجعت')
      }
      onClose()
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'تعذّرت المزامنة، جرّب مرة ثانية')
      setWorking(false)
    }
  }

  const remoteMeta = loaded?.remote?.meta ?? null
  const newer = loaded ? newerSide(getLocalEditedAt(), remoteMeta?.savedAt ?? null) : null
  const localAgo = getLocalEditedAt()
  const remoteWhen = remoteMeta ? `آخر حفظ ${agoLabel(remoteMeta.savedAt)} من ${remoteMeta.deviceLabel}` : 'من إصدار أقدم من التطبيق'

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 200ms ease-out both' }} onClick={working ? undefined : onClose} aria-hidden="true" />
      <div
        className="relative max-h-[92%] w-full max-w-[480px] overflow-y-auto rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-5"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={working ? () => {} : onClose} />

        {!loaded ? (
          <div className="pb-8 pt-2 text-center">
            <div className="text-[17px] font-semibold">نسختين مختلفتين</div>
            {loadError ? (
              <>
                <div className="mt-2 text-[12.5px] leading-[1.7] text-[var(--color-expense)]">{loadError}</div>
                <button type="button" onClick={() => (setLoadError(''), setAttempt((n) => n + 1))} className="qb-press mt-4 h-[44px] rounded-full bg-white/[0.06] px-5 text-[13px] font-semibold">
                  جرّب مرة ثانية
                </button>
              </>
            ) : (
              <div className="mt-2 text-[12.5px] text-[var(--color-text-2)]">نجيب نسخة Google Sheets ونقارنها بهذا الجهاز…</div>
            )}
          </div>
        ) : pick === null ? (
          <>
            <div className="text-[17px] font-semibold">نسختين مختلفتين</div>
            <div className="mt-1 text-[12.5px] leading-[1.75] text-[var(--color-text-2)]">هذا الجهاز وGoogle Sheets تعدّلوا كل واحد لحاله. أي وحدة تبقى؟ بنوريك وش بيضيع قبل ما تأكد.</div>
            <ChoiceRow
              icon={<PhoneIcon />}
              title="اعتمد نسخة هذا الجهاز"
              newer={newer === 'local'}
              detail={`${localAgo ? `آخر تعديل ${agoLabel(localAgo)} · ` : ''}${onlyCount(loaded.diff.localOnly.length)} في Sheets`}
              onClick={() => setPick('local')}
            />
            <ChoiceRow
              icon={<CloudIcon />}
              title="اعتمد نسخة Google Sheets"
              newer={newer === 'remote'}
              detail={`${remoteWhen} · ${onlyCount(loaded.diff.remoteOnly.length)} هنا`}
              onClick={() => setPick('remote')}
            />
            <div className="safe-bottom pb-6">
              <button type="button" onClick={onClose} className="mt-3.5 block w-full py-1.5 text-center text-[13px] font-semibold text-[var(--color-text-3)]">
                بعدين (تبقى المزامنة متوقفة)
              </button>
            </div>
          </>
        ) : (
          <ConfirmStep
            side={pick}
            lost={pick === 'local' ? loaded.diff.remoteOnly : loaded.diff.localOnly}
            working={working}
            downloaded={downloaded}
            onBack={() => setPick(null)}
            onDownload={() => {
              downloadSnapshotFile(loaded.local)
              setDownloaded(true)
            }}
            onConfirm={() => resolve(pick)}
          />
        )}
      </div>
    </div>
  )
}

function ChoiceRow({ icon, title, detail, newer, onClick }: { icon: ReactNode; title: string; detail: string; newer: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="qb-press mt-2.5 flex w-full items-center gap-3 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-void)] p-3.5 text-start">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-white/[0.06] text-[var(--color-text-2)]">{icon}</span>
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold">
          {title}
          {newer && <NewerBadge />}
        </div>
        <div className="mt-0.5 text-[11.5px] leading-[1.6] text-[var(--color-text-3)]">{detail}</div>
      </div>
      <span className="text-[var(--color-text-3)]">
        <Icon><path d="m15 6-6 6 6 6" /></Icon>
      </span>
    </button>
  )
}

function NewerBadge() {
  return (
    <span className="ms-1.5 inline-flex h-5 items-center rounded-full px-2 align-middle text-[10.5px] font-bold" style={{ background: 'color-mix(in srgb, var(--color-income) 16%, transparent)', color: 'var(--color-income)' }}>
      الأحدث
    </span>
  )
}

function ConfirmStep({
  side,
  lost,
  working,
  downloaded,
  onBack,
  onDownload,
  onConfirm,
}: {
  side: Side
  lost: DiffItem[]
  working: boolean
  downloaded: boolean
  onBack: () => void
  onDownload: () => void
  onConfirm: () => void
}) {
  const keepLocal = side === 'local'
  const shown = lost.slice(0, 3)
  return (
    <div style={{ animation: 'qb-rise 300ms var(--ease-out-expo) both' }}>
      <button type="button" onClick={onBack} disabled={working} className="mb-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-text-2)]">
        <Icon size={16}><path d="m9 6 6 6-6 6" /></Icon>
        رجوع
      </button>
      <div className="text-[17px] font-semibold">{keepLocal ? 'اعتماد نسخة هذا الجهاز' : 'اعتماد نسخة Google Sheets'}</div>

      <div className="mt-3.5 rounded-[18px] border px-3.5 py-3" style={{ background: 'color-mix(in srgb, var(--color-expense) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--color-expense) 28%, transparent)' }}>
        <div className="text-[13px] font-semibold text-[var(--color-expense)]">{keepLocal ? 'بينمسح من Google Sheets' : 'بينمسح من هذا الجهاز'}</div>
        <div className="mt-0.5 text-[12px] leading-[1.7] text-[var(--color-text-2)]">
          {lost.length > 0
            ? `${countLabel(lost.length, TX)} ${keepLocal ? 'انسجلت من الجهاز الثاني' : 'انسجلت هنا وما انرفعت'}، ومعها أي تعديل أو حذف سويته ${keepLocal ? 'هناك' : 'هنا'}.`
            : `ما فيه حركات ناقصة، لكن أي تعديل أو حذف سويته ${keepLocal ? 'من الجهاز الثاني' : 'هنا'} بيضيع.`}
        </div>
        {shown.length > 0 && (
          <div className="mt-2.5 overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-[var(--color-void)]">
            {shown.map((t, i) => (
              <div key={t.id} className={`flex items-center gap-2.5 px-3 py-2 text-[12.5px] ${i ? 'border-t border-[var(--color-border)]' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="truncate">{t.label}</div>
                  <div className="text-[11px] text-[var(--color-text-3)]">{dayMonth(t.date)}</div>
                </div>
                <span className="num text-[13px] font-semibold" style={{ color: t.sign === 1 ? 'var(--color-income)' : 'var(--color-text)' }}>
                  {t.sign === 1 ? '+' : t.sign === -1 ? '-' : ''}
                  {formatAmount(t.amount)}
                </span>
              </div>
            ))}
            {lost.length > 3 && (
              <div className="border-t border-[var(--color-border)] px-3 py-2 text-[11.5px] text-[var(--color-text-3)]">
                و<span className="num">{lost.length - 3}</span> غيرها
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2.5 rounded-[18px] border px-3.5 py-3 text-[12px] leading-[1.7] text-[var(--color-text-2)]" style={{ background: 'color-mix(in srgb, var(--color-income) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--color-income) 26%, transparent)' }}>
        <b className="font-semibold text-[var(--color-income)]">يبقى: </b>
        {keepLocal ? 'كل اللي على هذا الجهاز، وينرفع لـ Sheets' : 'نسخة Sheets كاملة، وتنحفظ على هذا الجهاز'}، والمزامنة ترجع تشتغل.
      </div>

      <HoldToConfirm label={working ? 'جارٍ المزامنة…' : 'اضغط مطوّلًا للتأكيد'} color={SUB} disabled={working} onConfirm={onConfirm} />
      <div className="safe-bottom pb-6">
        {!keepLocal && (
          <button type="button" onClick={onDownload} disabled={working || downloaded} className="mt-3 flex w-full items-center justify-center gap-1.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-text-2)]">
            <Icon size={16}>{downloaded ? <path d="M5 13l4 4L19 7" /> : <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />}</Icon>
            {downloaded ? 'تم تنزيل الملف' : 'نزّل نسخة هذا الجهاز كملف أولًا'}
          </button>
        )}
      </div>
    </div>
  )
}
