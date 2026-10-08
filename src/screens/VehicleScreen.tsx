import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatDate } from '../lib/format'
import { computeOilChangeStatus } from '../lib/vehicleMaintenance'
import { computeFuelGaps, computeFuelStats, computeVehicleCostStats } from '../lib/fuelConsumption'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AmountPad } from '../components/AmountPad'
import type { FuelLog, OilChangeLog } from '../types'
import { Badge, EmptyState, IconBubble, ListGroup, ListItem, RingProgress, SectionTitle, Segmented, StatTile } from '../components/ui'
import { rise } from '../lib/motion'

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 8 16 10.5" />
    </svg>
  )
}

function CarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13.5 5 8a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5.5" />
      <path d="M2.5 13.5h19v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-4Z" />
      <circle cx="7" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FuelIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="mb-1 text-center text-[12.5px] text-[var(--color-text-2)]">{label}</div>
      <div dir="ltr" className="mb-5 flex items-baseline justify-center gap-2" style={{ color }}>
        <span key={value} className="num text-[44px] font-bold tracking-tight" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }}>{value || '0'}</span>
        <span className="flex-shrink-0 text-[16px] font-medium opacity-60">{unit}</span>
      </div>
      <div className="mb-4">
        <AmountPad value={value} onChange={setValue} color={color} />
      </div>
      <div className="flex gap-2.5">
        <button onClick={onCancel} className="qb-press flex-1 rounded-full bg-white/[0.06] py-3 text-[13.5px] font-medium text-[var(--color-text)]">
          إلغاء
        </button>
        <button
          onClick={() => canSave && onSave(numeric)}
          disabled={!canSave}
          className="qb-press flex-1 rounded-full py-3 text-[13.5px] font-semibold text-[#0A0A0C] disabled:opacity-35"
          style={{ background: color }}
        >
          حفظ
        </button>
      </div>
    </div>
  )
}

type OperationType = 'oil' | 'fuel'
type CombinedLogEntry = { kind: 'oil'; log: OilChangeLog } | { kind: 'fuel'; log: FuelLog }

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

  const [activeType, setActiveType] = useState<OperationType>('oil')
  const [editing, setEditing] = useState<'odometer' | 'interval' | 'fuelCapacity' | null>(null)

  const hasBaseline = vehicleOdometerKm !== null && vehicleOilBaselineKm !== null
  const oil = hasBaseline ? computeOilChangeStatus(vehicleOdometerKm!, vehicleOilBaselineKm!, vehicleOilIntervalKm) : null
  const pct = oil ? Math.min(100, Math.max(0, oil.pct)) : 0
  const nextChangeKm = hasBaseline ? vehicleOilBaselineKm! + vehicleOilIntervalKm : null

  const fuelStats = computeFuelStats(fuelLogs, fuelTankCapacityL)
  const costStats = computeVehicleCostStats(fuelLogs, oilChanges)
  const fuelGaps = computeFuelGaps(fuelLogs)

  const combinedLogs: CombinedLogEntry[] = [
    ...oilChanges.map((log): CombinedLogEntry => ({ kind: 'oil', log })),
    ...fuelLogs.map((log): CombinedLogEntry => ({ kind: 'fuel', log })),
  ].sort((a, b) => (a.log.date === b.log.date ? b.log.odometerKm - a.log.odometerKm : a.log.date < b.log.date ? 1 : -1))

  const vColor = 'var(--color-vehicle)'
  const oilColor = oil ? (oil.overdue ? 'var(--color-expense)' : oil.dueSoon ? 'var(--color-subscription)' : vColor) : vColor

  return (
    <ScreenScroll header={<ScreenHeader title="صيانة السيارة" onBack={() => navigate(-1)} />}>
      <div className="qb-card-elevated qb-rise mb-4 p-5">
        {editing === 'odometer' ? (
          <InlineNumberEditor
            label="عداد السيارة الحالي"
            unit="كم"
            initialValue={vehicleOdometerKm}
            color={vColor}
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
            color={vColor}
            onSave={(v) => {
              setVehicleOilIntervalKm(v)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        ) : editing === 'fuelCapacity' ? (
          <InlineNumberEditor
            label="سعة خزان الوقود"
            unit="لتر"
            initialValue={fuelTankCapacityL}
            color={vColor}
            onSave={(v) => {
              setFuelTankCapacityL(v)
              setEditing(null)
            }}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <div className="mb-5 flex items-center gap-3">
              <IconBubble color={vColor} size={46}>
                <CarIcon />
              </IconBubble>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-semibold">سيارتي</div>
                <div className="truncate text-[11.5px] text-[var(--color-text-3)]">الممشى، الزيت، واستهلاك الوقود</div>
              </div>
            </div>

            <button onClick={() => setEditing('odometer')} className="qb-press mb-5 block w-full text-right">
              <div className="mb-1 flex items-center gap-2 text-[12.5px] text-[var(--color-text-2)]">
                عداد السيارة
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-[var(--color-text-2)]">
                  <EditIcon />
                </span>
              </div>
              {vehicleOdometerKm !== null ? (
                <div dir="ltr" className="num flex items-baseline justify-end gap-2">
                  <span className="text-[40px] font-bold leading-none tracking-tight">{vehicleOdometerKm.toLocaleString('en-US')}</span>
                  <span className="text-[15px] font-medium text-[var(--color-text-3)]">كم</span>
                </div>
              ) : (
                <div className="text-[18px] font-semibold text-[var(--color-text-3)]">اضغط لتحديد العداد</div>
              )}
            </button>

            <Segmented
              options={[
                ['oil', 'تغيير الزيت'],
                ['fuel', 'تعبئة وقود'],
              ]}
              value={activeType}
              onChange={setActiveType}
              color={vColor}
              className="mb-4"
            />

            {activeType === 'oil' ? (
              <>
                {!hasBaseline ? (
                  <div className="mb-4 rounded-[20px] bg-white/[0.04] p-4 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
                    {vehicleOdometerKm === null
                      ? 'حدّد عداد السيارة الحالي، ثم اضغط "تم تغيير الزيت" أول مرة عشان يبدأ التتبّع.'
                      : 'اضغط "تم تغيير الزيت" أول مرة عشان يبدأ حساب الممشى منذ آخر تغيير.'}
                  </div>
                ) : (
                  <div className="mb-4 flex items-center gap-4">
                    <RingProgress pct={pct} size={100} color={oilColor}>
                      <span className="num text-[20px] font-bold leading-none">{Math.round(100 - pct)}%</span>
                      <span className="mt-1 text-[9.5px] text-[var(--color-text-3)]">عمر الزيت</span>
                    </RingProgress>
                    <div className="min-w-0 flex-1">
                      <div className="num text-[20px] font-bold" style={{ color: oilColor }}>
                        {Math.round(oil!.drivenSinceLastChange).toLocaleString('en-US')} كم
                      </div>
                      <div className="text-[11.5px] text-[var(--color-text-3)]">منذ آخر تغيير</div>
                      <div className="mt-2 text-[11.5px] font-medium" style={{ color: oil!.overdue ? 'var(--color-expense)' : 'var(--color-text-2)' }}>
                        {oil!.overdue
                          ? `تجاوزت الفاصل بـ ${Math.round(-oil!.remainingKm).toLocaleString('en-US')} كم`
                          : `متبقي ${Math.round(oil!.remainingKm).toLocaleString('en-US')} كم`}
                      </div>
                      <div className="num text-[11px] text-[var(--color-text-3)]">التغيير القادم عند {nextChangeKm!.toLocaleString('en-US')} كم</div>
                    </div>
                  </div>
                )}

                <button onClick={() => setEditing('interval')} className="qb-press mb-4 flex w-full items-center justify-between rounded-[18px] bg-white/[0.04] px-4 py-3">
                  <span className="text-[12px] text-[var(--color-text-3)]">فاصل تغيير الزيت</span>
                  <span className="num text-[13px] font-semibold">{vehicleOilIntervalKm.toLocaleString('en-US')} كم</span>
                </button>

                <button
                  onClick={() => navigate('/vehicle/log/oil')}
                  disabled={vehicleOdometerKm === null}
                  className="qb-press w-full rounded-full py-3.5 text-[14px] font-semibold text-[#0a0a0c] disabled:opacity-35"
                  style={{ background: vColor, boxShadow: '0 14px 30px -14px var(--color-vehicle)' }}
                >
                  تم تغيير الزيت
                </button>
              </>
            ) : (
              <>
                {fuelStats.avgKmPerLiter === null ? (
                  <div className="mb-4 rounded-[20px] bg-white/[0.04] p-4 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
                    سجّل تعبئتين كاملتين على الأقل (لين آخر الخزان) عشان يبدأ حساب معدل الاستهلاك والمدى المتوقع.
                  </div>
                ) : (
                  <div className="mb-4 grid grid-cols-2 gap-2.5">
                    <div className="rounded-[18px] bg-white/[0.04] p-3.5">
                      <div className="mb-1 text-[11px] text-[var(--color-text-3)]">معدل الاستهلاك</div>
                      <div className="num text-[17px] font-bold" style={{ color: vColor }}>
                        {fuelStats.avgKmPerLiter.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                        <span className="text-[11px] font-medium text-[var(--color-text-3)]"> كم/لتر</span>
                      </div>
                    </div>
                    <div className="rounded-[18px] bg-white/[0.04] p-3.5">
                      <div className="mb-1 text-[11px] text-[var(--color-text-3)]">لكل 100 كم</div>
                      <div className="num text-[17px] font-bold" style={{ color: vColor }}>
                        {fuelStats.avgLitersPer100Km!.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                        <span className="text-[11px] font-medium text-[var(--color-text-3)]"> لتر</span>
                      </div>
                    </div>
                    {fuelStats.estimatedRangeKm !== null && (
                      <div className="col-span-2 flex items-center justify-between rounded-[18px] bg-white/[0.04] px-3.5 py-3">
                        <span className="text-[11.5px] text-[var(--color-text-3)]">المدى التقديري بخزان كامل</span>
                        <span className="num text-[15px] font-bold" style={{ color: vColor }}>
                          {Math.round(fuelStats.estimatedRangeKm).toLocaleString('en-US')} كم
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button onClick={() => setEditing('fuelCapacity')} className="qb-press mb-4 flex w-full items-center justify-between rounded-[18px] bg-white/[0.04] px-4 py-3">
                  <span className="text-[12px] text-[var(--color-text-3)]">سعة خزان الوقود</span>
                  <span className="num text-[13px] font-semibold">{fuelTankCapacityL !== null ? `${fuelTankCapacityL.toLocaleString('en-US')} لتر` : 'ما تحدد بعد'}</span>
                </button>

                <button
                  onClick={() => navigate('/vehicle/log/fuel')}
                  className="qb-press w-full rounded-full py-3.5 text-[14px] font-semibold text-[#0a0a0c]"
                  style={{ background: vColor, boxShadow: '0 14px 30px -14px var(--color-vehicle)' }}
                >
                  تسجيل تعبئة وقود
                </button>
              </>
            )}
          </>
        )}
      </div>

      {costStats.costPerKm !== null && (
        <div className="qb-rise mb-6 grid grid-cols-2 gap-3" style={rise(1)}>
          <StatTile
            className="col-span-2"
            label={`تكلفة الكيلومتر (آخر ${Math.round(costStats.drivenKm).toLocaleString('en-US')} كم)`}
            value={`${costStats.costPerKm.toLocaleString('en-US', { maximumFractionDigits: 2 })} ر.س/كم`}
            color={vColor}
          />
          <StatTile label="الوقود" value={formatMoney(costStats.fuelCostTotal)} color="var(--color-fuel)" icon={<FuelIcon size={17} />} />
          <StatTile label="الزيت" value={formatMoney(costStats.oilCostTotal)} color={vColor} icon={<CarIcon size={17} />} sub={`الإجمالي ${formatMoney(costStats.totalCost)}`} />
        </div>
      )}

      <SectionTitle title="سجل العمليات" />
      {combinedLogs.length === 0 ? (
        <EmptyState title="لا يوجد سجل بعد" desc="كل تغيير زيت أو تعبئة وقود تسجّلها تظهر هنا." />
      ) : (
        <ListGroup className="qb-rise">
          {combinedLogs.map((entry, i) => {
            const account = entry.log.accountId ? accounts.find((a) => a.id === entry.log.accountId) : undefined
            const gap = entry.kind === 'fuel' ? fuelGaps.get(entry.log.id) : undefined
            const c = entry.kind === 'oil' ? vColor : 'var(--color-fuel)'
            const details = [
              gap ? `قطعت ${Math.round(gap.drivenKm).toLocaleString('en-US')} كم` : '',
              gap && gap.kmPerLiter !== null ? `${gap.kmPerLiter.toLocaleString('en-US', { maximumFractionDigits: 1 })} كم/لتر` : '',
              entry.log.cost && account ? account.name : '',
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <ListItem
                key={`${entry.kind}-${entry.log.id}`}
                divider={i > 0}
                leading={<IconBubble color={c}>{entry.kind === 'oil' ? <CarIcon size={19} /> : <FuelIcon size={19} />}</IconBubble>}
                title={
                  <span className="flex items-center gap-2">
                    {entry.kind === 'oil' ? 'تغيير زيت' : 'تعبئة وقود'}
                    {entry.kind === 'fuel' && entry.log.isFullTank && <Badge color={c}>كاملة</Badge>}
                  </span>
                }
                subtitle={`${formatDate(entry.log.date)} · ${entry.log.odometerKm.toLocaleString('en-US')} كم${details ? ` · ${details}` : ''}`}
                trailing={
                  <div className="flex flex-col items-end">
                    {entry.log.cost ? <span className="num text-[14px] font-bold">{formatMoney(entry.log.cost)}</span> : null}
                    {entry.kind === 'fuel' && <span className="num text-[11px] text-[var(--color-text-3)]">{entry.log.liters.toLocaleString('en-US')} لتر</span>}
                  </div>
                }
              />
            )
          })}
        </ListGroup>
      )}
    </ScreenScroll>
  )
}
