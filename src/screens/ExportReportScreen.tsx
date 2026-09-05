import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { formatMoney } from '../lib/format'
import { buildReportData, type ReportExtras } from '../lib/reportData'
import { computeVehicleCostStats } from '../lib/fuelConsumption'

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
    <ScreenScroll header={<ScreenHeader title="تصدير التقرير" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">الشهر</label>
      <input
        type="month"
        value={monthValue}
        onChange={(e) => setMonthValue(e.target.value)}
        className="num mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none"
        style={{ colorScheme: 'dark' }}
      />

      <div className="qb-card mb-5 p-4">
        <div className="qb-section-label mb-3">معاينة سريعة — {data.periodLabel}</div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <div className="mb-1 text-[11px] text-[var(--color-text-3)]">الدخل</div>
            <div className="num text-[15px] font-bold" style={{ color: 'var(--color-income)' }}>{formatMoney(data.income)}</div>
          </div>
          <div>
            <div className="mb-1 text-[11px] text-[var(--color-text-3)]">المصروف</div>
            <div className="num text-[15px] font-bold" style={{ color: 'var(--color-expense)' }}>{formatMoney(data.expense)}</div>
          </div>
        </div>
        <div className="mt-3 text-[11.5px] text-[var(--color-text-3)]">{data.transactionRows.length} حركة مسجّلة في هذه الفترة</div>
      </div>

      <div className="qb-card mb-5 p-4">
        <div className="qb-section-label mb-3">بيانات إضافية (اختياري)</div>
        <div className="flex flex-col gap-3">
          <ExtraToggle label="الاشتراكات النشطة" checked={includeSubscriptions} onChange={setIncludeSubscriptions} />
          <ExtraToggle label="الالتزامات النشطة" checked={includeCommitments} onChange={setIncludeCommitments} />
          <ExtraToggle label="ملخص الديون" checked={includeDebts} onChange={setIncludeDebts} />
          <ExtraToggle label="تكلفة السيارة لكل كيلومتر" checked={includeVehicle} onChange={setIncludeVehicle} />
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-2xl border px-4 py-3 text-[12px] font-semibold" style={{ borderColor: 'rgba(255,92,92,0.3)', background: 'rgba(255,92,92,0.08)', color: 'var(--color-expense)' }}>
          {errorMsg}
        </div>
      )}

      <button
        onClick={handleExportPdf}
        disabled={busy !== null}
        className="qb-press mb-3 flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-right disabled:opacity-60"
        style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'var(--color-surface)' }}
      >
        <div className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]" style={{ width: 42, height: 42, background: 'rgba(255,92,92,0.14)', color: 'var(--color-expense)' }}>
          <PdfIcon />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-bold">{busy === 'pdf' ? 'جارٍ إنشاء PDF...' : 'تنزيل PDF (A4)'}</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">جاهز للطباعة مباشرة على ورق A4</div>
        </div>
      </button>

      <button
        onClick={handleExportExcel}
        disabled={busy !== null}
        className="qb-press mb-5 flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-right disabled:opacity-60"
        style={{ borderColor: 'rgba(255,255,255,0.2)', background: 'var(--color-surface)' }}
      >
        <div className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]" style={{ width: 42, height: 42, background: 'rgba(34,197,94,0.14)', color: 'var(--color-income)' }}>
          <ExcelIcon />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-bold">{busy === 'excel' ? 'جارٍ إنشاء Excel...' : 'تنزيل Excel'}</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">ملف منسّق بورقتين: ملخص وكل الحركات</div>
        </div>
      </button>
    </ScreenScroll>
  )
}

function ExtraToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-[13px] font-semibold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 flex-shrink-0 accent-[var(--color-income)]"
      />
    </label>
  )
}
