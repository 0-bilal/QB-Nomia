import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { formatMoney } from '../lib/format'
import { buildReportData, type ReportExtras } from '../lib/reportData'
import { computeVehicleCostStats } from '../lib/fuelConsumption'
import type { ReactNode } from 'react'
import { ListGroup, SectionTitle } from '../components/ui'

function currentMonthValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M8.5 17v-4h1.2a1.3 1.3 0 0 1 0 2.6H8.5M12.3 17v-4h1a1.5 1.5 0 0 1 0 4h-1ZM17.5 17v-4h2M17.5 15h1.6" />
    </svg>
  )
}
function ExcelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v4h4" />
      <path d="M8 13.5 12 20M12 13.5 8 20" />
    </svg>
  )
}

export function ExportReportScreen() {
  const navigate = useNavigate()
  const { transactions, categories, incomeSources, accounts, subscriptions, commitments, totalIOwe, totalOwedToMe, fuelLogs, oilChanges } = useData()
  const [monthValue, setMonthValue] = useState(currentMonthValue())
  const [busy, setBusy] = useState<'pdf' | 'excel' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [includeSubscriptions, setIncludeSubscriptions] = useState(false)
  const [includeCommitments, setIncludeCommitments] = useState(false)
  const [includeDebts, setIncludeDebts] = useState(false)
  const [includeVehicle, setIncludeVehicle] = useState(false)

  const extras = useMemo<ReportExtras>(() => {
    const result: ReportExtras = {}
    if (includeSubscriptions) {
      result.subscriptions = subscriptions
        .filter((s) => s.status === 'active')
        .map((s) => ({ name: s.name, cost: s.cost, billingCycleLabel: s.billingCycle === 'monthly' ? 'شهري' : 'سنوي' }))
    }
    if (includeCommitments) {
      result.commitments = commitments
        .filter((c) => c.status === 'active')
        .map((c) => ({ name: c.name, cost: c.cost ?? 0 }))
    }
    if (includeDebts) {
      result.debts = { totalIOwe, totalOwedToMe }
    }
    if (includeVehicle) {
      const stats = computeVehicleCostStats(fuelLogs, oilChanges)
      result.vehicleCostPerKm = stats.costPerKm
    }
    return result
  }, [includeSubscriptions, includeCommitments, includeDebts, includeVehicle, subscriptions, commitments, totalIOwe, totalOwedToMe, fuelLogs, oilChanges])

  const data = useMemo(
    () => buildReportData(monthValue, transactions, categories, incomeSources, accounts, extras),
    [monthValue, transactions, categories, incomeSources, accounts, extras],
  )

  async function handleExportPdf() {
    if (busy) return
    setBusy('pdf')
    setErrorMsg('')
    try {
      const { exportReportPdf } = await import('../lib/exportPdf')
      await exportReportPdf(data, `qb-nomia-report-${monthValue}.pdf`)
    } catch {
      setErrorMsg('تعذّر إنشاء ملف PDF — حاول مرة أخرى')
    } finally {
      setBusy(null)
    }
  }

  async function handleExportExcel() {
    if (busy) return
    setBusy('excel')
    setErrorMsg('')
    try {
      const { exportReportExcel } = await import('../lib/exportExcel')
      await exportReportExcel(data, `qb-nomia-report-${monthValue}.xlsx`)
    } catch {
      setErrorMsg('تعذّر إنشاء ملف Excel — حاول مرة أخرى')
    } finally {
      setBusy(null)
    }
  }

  return (
    <ScreenScroll header={<ScreenHeader title="تصدير التقرير" onBack={() => navigate(-1)} />}>
      <label className="mb-5 flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[var(--color-text-3)]">
        <span className="flex-shrink-0 text-[12.5px] font-medium">الشهر</span>
        <input
          type="month"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
          className="num min-w-0 flex-1 bg-transparent py-3 text-[var(--color-text)] outline-none"
          style={{ colorScheme: 'dark', boxShadow: 'none' }}
        />
      </label>

      {/* معاينة بشكل ورقة تقرير مصغّرة */}
      <div className="qb-rise mb-6 flex justify-center">
        <div
          className="relative w-[78%] rounded-[22px] bg-[#f4f4f6] p-5 text-[#0a0a0c]"
          style={{ transform: 'rotate(-2deg)', boxShadow: '0 30px 60px -24px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="num text-[12px] font-bold">QB·Nomia</span>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--color-accent-b)' }} />
          </div>
          <div className="mb-3 text-[14px] font-semibold">{data.periodLabel}</div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-[12px] bg-black/[0.05] p-2">
              <div className="text-[9px] opacity-60">الدخل</div>
              <div className="num text-[12px] font-bold text-[#0f9a57]">{formatMoney(data.income)}</div>
            </div>
            <div className="rounded-[12px] bg-black/[0.05] p-2">
              <div className="text-[9px] opacity-60">المصروف</div>
              <div className="num text-[12px] font-bold text-[#d6303f]">{formatMoney(data.expense)}</div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {[90, 72, 84, 60].map((w, i) => (
              <div key={i} className="h-1.5 rounded-full bg-black/[0.08]" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="mt-3 text-[9.5px] opacity-60">{data.transactionRows.length} حركة مسجّلة</div>
        </div>
      </div>

      <SectionTitle title="أقسام إضافية" hint="اختر ما يُضاف للتقرير بجانب الملخص والحركات" />
      <ListGroup className="mb-6">
        <ExtraToggle label="الاشتراكات النشطة" checked={includeSubscriptions} onChange={setIncludeSubscriptions} />
        <ExtraToggle label="الالتزامات النشطة" checked={includeCommitments} onChange={setIncludeCommitments} divider />
        <ExtraToggle label="ملخص الديون" checked={includeDebts} onChange={setIncludeDebts} divider />
        <ExtraToggle label="تكلفة السيارة لكل كيلومتر" checked={includeVehicle} onChange={setIncludeVehicle} divider />
      </ListGroup>

      {errorMsg && (
        <div className="mb-4 rounded-[20px] px-4 py-3 text-[12.5px] font-semibold" style={{ background: 'rgba(255,95,109,0.1)', color: 'var(--color-expense)' }}>
          {errorMsg}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <ExportTile
          onClick={handleExportPdf}
          disabled={busy !== null}
          busy={busy === 'pdf'}
          color="var(--color-expense)"
          icon={<PdfIcon />}
          title="PDF"
          sub="A4 جاهز للطباعة"
        />
        <ExportTile
          onClick={handleExportExcel}
          disabled={busy !== null}
          busy={busy === 'excel'}
          color="var(--color-income)"
          icon={<ExcelIcon />}
          title="Excel"
          sub="ملخص + كل الحركات"
        />
      </div>
    </ScreenScroll>
  )
}

function ExportTile({ onClick, disabled, busy, color, icon, title, sub }: { onClick: () => void; disabled: boolean; busy: boolean; color: string; icon: ReactNode; title: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="qb-press flex aspect-square flex-col justify-between rounded-[28px] border p-4 text-right disabled:opacity-60"
      style={{ borderColor: `color-mix(in srgb, ${color} 28%, transparent)`, background: `radial-gradient(120% 120% at 100% 0%, color-mix(in srgb, ${color} 22%, transparent), transparent 60%), var(--color-surface)` }}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: color, color: '#0a0a0c' }}>
        {busy ? <span className="h-5 w-5 rounded-full border-2 border-black/30 border-t-black" style={{ animation: 'spin 700ms linear infinite' }} /> : icon}
      </span>
      <span>
        <span className="block text-[18px] font-semibold">{busy ? 'جارٍ الإنشاء...' : `تنزيل ${title}`}</span>
        <span className="block text-[11.5px] text-[var(--color-text-3)]">{sub}</span>
      </span>
    </button>
  )
}

function ExtraToggle({ label, checked, onChange, divider = false }: { label: string; checked: boolean; onChange: (v: boolean) => void; divider?: boolean }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-right ${divider ? 'border-t qb-divider' : ''}`} role="switch" aria-checked={checked}>
      <span className="text-[14px] font-medium">{label}</span>
      <span
        className="flex h-[30px] w-[52px] flex-shrink-0 items-center rounded-full p-[3px] transition-colors duration-300"
        style={{ background: checked ? 'var(--color-accent)' : 'rgba(255,255,255,0.14)' }}
      >
        <span
          className="h-6 w-6 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-300"
          style={{ background: checked ? '#0a0a0c' : '#fff', transform: checked ? 'translateX(-22px)' : 'translateX(0)' }}
        />
      </span>
    </button>
  )
}
