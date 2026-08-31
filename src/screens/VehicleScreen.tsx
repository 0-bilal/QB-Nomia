import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatDate } from '../lib/format'
import { computeOilChangeStatus } from '../lib/vehicleMaintenance'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 8 16 10.5" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13.5 5 8a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5.5" />
      <path d="M2.5 13.5h19v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-4Z" />
      <circle cx="7" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** حوار مبسّط لإدخال قيمة رقمية واحدة (العداد أو الفاصل) — نفس نمط SetBudgetDialog بشاشة الفئات. */
function NumberEntryDialog({
  open,
  title,
  description,
  initialValue,
  onSave,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  initialValue: number | null
  onSave: (value: number) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue ? String(initialValue) : '')

  if (!open) return null

  const numeric = Number(value)
  const canSave = value.trim() !== '' && numeric > 0

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onCancel} aria-hidden="true" />
      <div
        className="relative w-full max-w-[320px] rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 text-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]"
        style={{ animation: 'speed-dial-in 200ms ease-out both' }}
      >
        <div className="mb-1.5 text-[15px] font-bold">{title}</div>
        <div className="mb-4 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">{description}</div>
        <div dir="ltr" className="mb-4 flex items-center justify-center gap-2">
          <input
            autoFocus
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="0"
            className="num w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] px-4 py-3 text-center text-[18px] font-bold outline-none placeholder:text-[var(--color-text-3)]"
          />
          <span className="flex-shrink-0 text-[13px] font-semibold text-[var(--color-text-3)]">كم</span>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 rounded-2xl border border-[var(--color-border)] py-2.75 text-[13px] font-semibold text-[var(--color-text-2)]">
            إلغاء
          </button>
          <button
            onClick={() => canSave && onSave(numeric)}
            disabled={!canSave}
            className="flex-1 rounded-2xl py-2.75 text-[13px] font-bold text-[#0A0A0C] disabled:opacity-40"
            style={{ background: 'var(--color-vehicle)' }}
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  )
}

export function VehicleScreen() {
  const navigate = useNavigate()
  const {
    vehicleOdometerKm,
    setVehicleOdometerKm,
    vehicleOilIntervalKm,
    setVehicleOilIntervalKm,
    vehicleOilBaselineKm,
    oilChanges,
    accounts,
  } = useData()

  const [odometerDialogOpen, setOdometerDialogOpen] = useState(false)
  const [intervalDialogOpen, setIntervalDialogOpen] = useState(false)

  const hasBaseline = vehicleOdometerKm !== null && vehicleOilBaselineKm !== null
  const oil = hasBaseline ? computeOilChangeStatus(vehicleOdometerKm!, vehicleOilBaselineKm!, vehicleOilIntervalKm) : null
  const pct = oil ? Math.min(100, Math.max(0, oil.pct)) : 0

  function handleSaveOdometer(km: number) {
    setVehicleOdometerKm(km)
    setOdometerDialogOpen(false)
  }

  return (
    <ScreenScroll header={<ScreenHeader title="صيانة السيارة" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
      <NumberEntryDialog
        open={odometerDialogOpen}
        title="عداد السيارة الحالي"
        description="كم قطعت السيارة إجمالًا حتى الآن (بالكيلومتر)"
        initialValue={vehicleOdometerKm}
        onSave={handleSaveOdometer}
        onCancel={() => setOdometerDialogOpen(false)}
      />
      <NumberEntryDialog
        open={intervalDialogOpen}
        title="فاصل تغيير الزيت"
        description="كل كم كيلومتر توصي بتغيير الزيت لسيارتك (الافتراضي 5000)"
        initialValue={vehicleOilIntervalKm}
        onSave={(v) => {
          setVehicleOilIntervalKm(v)
          setIntervalDialogOpen(false)
        }}
        onCancel={() => setIntervalDialogOpen(false)}
      />

      <div className="qb-card-elevated mb-5 p-4.5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ width: 44, height: 44, background: 'rgba(56,189,248,0.14)', color: 'var(--color-vehicle)' }}>
            <CarIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold">سيارتي</div>
            <div className="truncate text-[11px] text-[var(--color-text-3)]">تتبّع الممشى وموعد تغيير الزيت</div>
          </div>
        </div>

        <button onClick={() => setOdometerDialogOpen(true)} className="qb-press mb-3 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
          <div className="text-[12px] text-[var(--color-text-3)]">عداد السيارة الحالي</div>
          <div className="flex items-center gap-2">
            <span className="num text-[15px] font-bold">{vehicleOdometerKm !== null ? `${vehicleOdometerKm.toLocaleString('en-US')} كم` : 'ما تحدد بعد'}</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-3)]" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <EditIcon />
            </div>
          </div>
        </button>

        {!hasBaseline ? (
          <div className="rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(56,189,248,0.4)', color: 'var(--color-text-2)' }}>
            {vehicleOdometerKm === null
              ? 'حدّد عداد السيارة الحالي، ثم اضغط "تم تغيير الزيت" أول مرة عشان يبدأ التتبّع.'
              : 'اضغط "تم تغيير الزيت" أول مرة عشان يبدأ حساب الممشى منذ آخر تغيير.'}
          </div>
        ) : (
          <>
            <div className="num mb-2 flex items-baseline justify-between">
              <span className="text-[19px] font-bold" style={{ color: oil!.overdue ? 'var(--color-expense)' : 'var(--color-vehicle)' }}>
                {Math.round(oil!.drivenSinceLastChange).toLocaleString('en-US')} كم
              </span>
              <span className="text-[12px] text-[var(--color-text-3)]">من {vehicleOilIntervalKm.toLocaleString('en-US')} كم</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: oil!.overdue ? 'var(--color-expense)' : oil!.dueSoon ? 'var(--color-subscription)' : 'var(--color-vehicle)' }}
              />
            </div>
            <div className="mt-1.5 text-[11px]" style={{ color: oil!.overdue ? 'var(--color-expense)' : 'var(--color-text-3)' }}>
              {oil!.overdue
                ? `تجاوزت الفاصل الموصى به بـ ${Math.round(-oil!.remainingKm).toLocaleString('en-US')} كم`
                : `متبقي ${Math.round(oil!.remainingKm).toLocaleString('en-US')} كم لتغيير الزيت`}
            </div>
          </>
        )}

        <button
          onClick={() => setIntervalDialogOpen(true)}
          className="qb-press mt-3 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5"
        >
          <span className="text-[11.5px] text-[var(--color-text-3)]">فاصل تغيير الزيت</span>
          <span className="num text-[12.5px] font-semibold">{vehicleOilIntervalKm.toLocaleString('en-US')} كم</span>
        </button>

        <button
          onClick={() => navigate('/vehicle/log-oil-change')}
          disabled={vehicleOdometerKm === null}
          className="qb-press mt-3 w-full rounded-2xl py-2.75 text-[12.5px] font-bold disabled:opacity-40"
          style={{ background: 'rgba(56,189,248,0.18)', color: 'var(--color-vehicle)' }}
        >
          تم تغيير الزيت
        </button>
      </div>

      <div className="qb-section-label mb-2 px-1">سجل تغييرات الزيت</div>
      {oilChanges.length === 0 ? (
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">لا يوجد سجل بعد</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {oilChanges.map((log) => {
            const account = log.accountId ? accounts.find((a) => a.id === log.accountId) : undefined
            return (
              <div key={log.id} className="qb-card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-bold">{formatDate(log.date)}</div>
                  <div className="num text-[12.5px] font-semibold text-[var(--color-text-2)]">{log.odometerKm.toLocaleString('en-US')} كم</div>
                </div>
                {log.cost && account && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-3)]">
                    <AccountTypeIcon type={account.type} size={13} />
                    <span>{account.name} · {ACCOUNT_TYPE_LABELS[account.type]}</span>
                    <span className="num mr-auto font-semibold" style={{ color: ACCOUNT_ICON_COLOR[account.type] }}>
                      {formatMoney(log.cost)}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </ScreenScroll>
  )
}
