import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatDate } from '../lib/format'
import { computeOilChangeStatus } from '../lib/vehicleMaintenance'
import { computeFuelStats } from '../lib/fuelConsumption'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AmountPad } from '../components/AmountPad'
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

function FuelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15" />
      <path d="M4 21h10" />
      <path d="M6.5 11h5" />
      <path d="M14 8.5 17 11v6a1.5 1.5 0 0 0 3 0V9.5a1.5 1.5 0 0 0-.44-1.06L17.5 6.4" />
    </svg>
  )
}

/**
 * محرر مضمّن (مو نافذة منبثقة) بلوحة الأرقام الخاصة بالتطبيق (AmountPad) — نفس
 * هوية إدخال الأرقام بباقي الشاشات (إضافة حركة، تقسيم حساب) بدل حقل نصي عادي.
 */
function InlineNumberEditor({
  label,
  unit,
  initialValue,
  color,
  onSave,
  onCancel,
}: {
  label: string
  unit: string
  initialValue: number | null
  color: string
  onSave: (value: number) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue ? String(initialValue) : '')
  const numeric = Number(value)
  const canSave = value.trim() !== '' && numeric > 0

  return (
    <div>
      <div className="mb-1.5 text-[12px] text-[var(--color-text-3)]">{label}</div>
      <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
        <span className="num text-[32px] font-bold">{value || '0'}</span>
        <span className="flex-shrink-0 text-[13px] font-semibold text-[var(--color-text-3)]">{unit}</span>
      </div>
      <div className="mb-4 flex justify-center">
        <AmountPad value={value} onChange={setValue} color={color} />
      </div>
      <div className="flex gap-2.5">
        <button onClick={onCancel} className="flex-1 rounded-2xl border border-[var(--color-border)] py-2.75 text-[13px] font-semibold text-[var(--color-text-2)]">
          إلغاء
        </button>
        <button
          onClick={() => canSave && onSave(numeric)}
          disabled={!canSave}
          className="flex-1 rounded-2xl py-2.75 text-[13px] font-bold text-[#0A0A0C] disabled:opacity-40"
          style={{ background: color }}
        >
          حفظ
        </button>
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
    fuelTankCapacityL,
    setFuelTankCapacityL,
    fuelLogs,
    accounts,
  } = useData()

  const [editing, setEditing] = useState<'odometer' | 'interval' | 'fuelCapacity' | null>(null)

  const hasBaseline = vehicleOdometerKm !== null && vehicleOilBaselineKm !== null
  const oil = hasBaseline ? computeOilChangeStatus(vehicleOdometerKm!, vehicleOilBaselineKm!, vehicleOilIntervalKm) : null
  const pct = oil ? Math.min(100, Math.max(0, oil.pct)) : 0
  const nextChangeKm = hasBaseline ? vehicleOilBaselineKm! + vehicleOilIntervalKm : null

  const fuelStats = computeFuelStats(fuelLogs, fuelTankCapacityL)

  return (
    <ScreenScroll header={<ScreenHeader title="صيانة السيارة" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
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

        {editing === 'odometer' ? (
          <InlineNumberEditor
            label="عداد السيارة الحالي"
            unit="كم"
            initialValue={vehicleOdometerKm}
            color="var(--color-vehicle)"
            onSave={(v) => {
              setVehicleOdometerKm(v)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        ) : editing === 'interval' ? (
          <InlineNumberEditor
            label="فاصل تغيير الزيت (كل كم كيلومتر توصي بالتغيير)"
            unit="كم"
            initialValue={vehicleOilIntervalKm}
            color="var(--color-vehicle)"
            onSave={(v) => {
              setVehicleOilIntervalKm(v)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <button onClick={() => setEditing('odometer')} className="qb-press mb-3 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
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
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span style={{ color: oil!.overdue ? 'var(--color-expense)' : 'var(--color-text-3)' }}>
                    {oil!.overdue
                      ? `تجاوزت الفاصل الموصى به بـ ${Math.round(-oil!.remainingKm).toLocaleString('en-US')} كم`
                      : `متبقي ${Math.round(oil!.remainingKm).toLocaleString('en-US')} كم لتغيير الزيت`}
                  </span>
                  <span className="num font-semibold text-[var(--color-text-3)]">التغيير القادم عند {nextChangeKm!.toLocaleString('en-US')} كم</span>
                </div>
              </>
            )}

            <button
              onClick={() => setEditing('interval')}
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
          </>
        )}
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

      <div className="qb-card-elevated mb-5 mt-5 p-4.5">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]" style={{ width: 44, height: 44, background: 'rgba(56,189,248,0.14)', color: 'var(--color-vehicle)' }}>
            <FuelIcon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] font-bold">الوقود</div>
            <div className="truncate text-[11px] text-[var(--color-text-3)]">تتبّع الاستهلاك والمدى المتوقع</div>
          </div>
        </div>

        {editing === 'fuelCapacity' ? (
          <InlineNumberEditor
            label="سعة خزان الوقود"
            unit="لتر"
            initialValue={fuelTankCapacityL}
            color="var(--color-vehicle)"
            onSave={(v) => {
              setFuelTankCapacityL(v)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <button onClick={() => setEditing('fuelCapacity')} className="qb-press mb-3 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
              <div className="text-[12px] text-[var(--color-text-3)]">سعة خزان الوقود</div>
              <div className="flex items-center gap-2">
                <span className="num text-[15px] font-bold">{fuelTankCapacityL !== null ? `${fuelTankCapacityL.toLocaleString('en-US')} لتر` : 'ما تحدد بعد'}</span>
                <div className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-3)]" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <EditIcon />
                </div>
              </div>
            </button>

            {fuelStats.avgKmPerLiter === null ? (
              <div className="mb-3 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(56,189,248,0.4)', color: 'var(--color-text-2)' }}>
                سجّل تعبئتين كاملتين على الأقل (لين آخر الخزان) عشان يبدأ حساب معدل الاستهلاك والمدى المتوقع.
              </div>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="mb-1 text-[11px] text-[var(--color-text-3)]">معدل الاستهلاك</div>
                    <div className="num text-[15px] font-bold" style={{ color: 'var(--color-vehicle)' }}>
                      {fuelStats.avgKmPerLiter.toLocaleString('en-US', { maximumFractionDigits: 1 })} كم/لتر
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <div className="mb-1 text-[11px] text-[var(--color-text-3)]">استهلاك لكل 100كم</div>
                    <div className="num text-[15px] font-bold" style={{ color: 'var(--color-vehicle)' }}>
                      {fuelStats.avgLitersPer100Km!.toLocaleString('en-US', { maximumFractionDigits: 1 })} لتر
                    </div>
                  </div>
                </div>
                {fuelStats.estimatedRangeKm !== null && (
                  <div className="mb-3 text-center text-[11.5px] text-[var(--color-text-3)]">
                    المدى التقديري بخزان كامل:{' '}
                    <span className="num font-bold" style={{ color: 'var(--color-vehicle)' }}>
                      {Math.round(fuelStats.estimatedRangeKm).toLocaleString('en-US')} كم
                    </span>
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => navigate('/vehicle/log-fuel')}
              className="qb-press w-full rounded-2xl py-2.75 text-[12.5px] font-bold"
              style={{ background: 'rgba(56,189,248,0.18)', color: 'var(--color-vehicle)' }}
            >
              تسجيل تعبئة وقود
            </button>
          </>
        )}
      </div>

      <div className="qb-section-label mb-2 px-1">سجل تعبئات الوقود</div>
      {fuelLogs.length === 0 ? (
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">لا يوجد سجل بعد</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {fuelLogs.map((log) => {
            const account = log.accountId ? accounts.find((a) => a.id === log.accountId) : undefined
            return (
              <div key={log.id} className="qb-card p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[13px] font-bold">{formatDate(log.date)}</div>
                    {log.isFullTank && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold"
                        style={{ background: 'rgba(56,189,248,0.16)', color: 'var(--color-vehicle)' }}
                      >
                        تعبئة كاملة
                      </span>
                    )}
                  </div>
                  <div className="num text-[12.5px] font-semibold text-[var(--color-text-2)]">
                    {log.liters.toLocaleString('en-US')} لتر · {log.odometerKm.toLocaleString('en-US')} كم
                  </div>
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
