import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatAmount, formatDate } from '../lib/format'
import { haptic } from '../lib/haptics'
import { localIso } from '../lib/homeFeed'
import { showUndoToast } from '../lib/undoToast'
import {
  DEFAULT_LOG_FILTER,
  advancedKeys,
  averageKmPerLiter,
  buildVehicleEntries,
  filterToQuick,
  filterVehicleEntries,
  groupVehicleByMonth,
  quickToFilter,
  type FuelEntry,
  type OilEntry,
  type QuickFilter,
  type VehicleEntry,
  type VehicleLogFilter,
} from '../lib/vehicleLog'
import { EmptyState } from './ui'
import { SheetHandle } from './SheetHandle'

const FUEL = 'var(--color-fuel)'
const OIL = 'var(--color-vehicle)'
const soft = (c: string, p = 16) => `color-mix(in srgb, ${c} ${p}%, transparent)`
const n0 = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })
const n1 = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 1 })
const n2 = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const daysLabel = (d: number) => (d === 1 ? 'يوم' : d === 2 ? 'يومين' : d >= 3 && d <= 10 ? 'أيام' : 'يوم')
const countLabel = (n: number) => (n === 1 ? 'عملية' : n === 2 ? 'عمليتين' : `${n} ${n <= 10 ? 'عمليات' : 'عملية'}`)

function Svg({ size = 18, width = 2, children }: { size?: number; width?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
const FuelGlyph = () => (
  <Svg size={19}>
    <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M3 21h13M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3M7 8h5" />
  </Svg>
)
const OilGlyph = () => (
  <Svg size={19}>
    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
  </Svg>
)

const QUICK: [QuickFilter, string][] = [
  ['all', 'الكل'],
  ['fuel', 'وقود'],
  ['oil', 'زيت'],
  ['full', 'كاملة'],
  ['partial', 'جزئية'],
  ['others', 'دفعها غيري'],
]

type OptKey = 'type' | 'fill' | 'period' | 'payer' | 'sort'
const OPTS: Record<OptKey, [string, string][]> = {
  type: [
    ['all', 'الكل'],
    ['fuel', 'وقود'],
    ['oil', 'زيت'],
  ],
  fill: [
    ['all', 'الكل'],
    ['full', 'كاملة'],
    ['partial', 'جزئية'],
  ],
  period: [
    ['all', 'الكل'],
    ['month', 'هذا الشهر'],
    ['3m', 'آخر 3 أشهر'],
    ['year', 'هذه السنة'],
  ],
  payer: [
    ['all', 'الكل'],
    ['me', 'أنا'],
    ['others', 'دفعها غيري'],
  ],
  sort: [
    ['new', 'الأحدث'],
    ['old', 'الأقدم'],
    ['cost', 'الأعلى تكلفة'],
    ['kpl', 'الأفضل استهلاكًا'],
  ],
}

function Tile({ k, v, unit, muted = false }: { k: string; v: string; unit?: string; muted?: boolean }) {
  return (
    <div className="rounded-[14px] border border-[var(--color-border)] bg-white/[0.035] p-2.5">
      <div className="text-[10px] text-[var(--color-text-3)]">{k}</div>
      <div className="num mt-0.5 text-[14px] font-bold" style={{ color: muted ? 'var(--color-text-3)' : undefined }}>
        {v}
        {unit && <span className="ms-0.5 font-sans text-[10px] font-medium text-[var(--color-text-3)]">{unit}</span>}
      </div>
    </div>
  )
}

function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="inline-flex h-[26px] items-center gap-1 rounded-full border border-[var(--color-border)] bg-white/[0.05] px-2.5 text-[11px] font-semibold" style={{ color: color ?? 'var(--color-text-2)' }}>
      {children}
    </span>
  )
}

/** سجل العمليات في صيانة السيارة: مقسّم بالشهر (بالرقم)، بفلاتر سريعة ومتقدمة، وكل عملية تنسدل بتفاصيلها. */
export function VehicleLogSection() {
  const navigate = useNavigate()
  const { fuelLogs, oilChanges, accounts, people, vehicleOilIntervalKm, vehicleOdometerKm, deleteFuelLog, deleteOilChange } = useData()
  const [filter, setFilter] = useState<VehicleLogFilter>(DEFAULT_LOG_FILTER)
  const [draft, setDraft] = useState<VehicleLogFilter>(DEFAULT_LOG_FILTER)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const today = localIso(new Date())

  const entries = useMemo(() => buildVehicleEntries(fuelLogs, oilChanges, vehicleOilIntervalKm, vehicleOdometerKm), [fuelLogs, oilChanges, vehicleOilIntervalKm, vehicleOdometerKm])
  const avg = useMemo(() => averageKmPerLiter(entries), [entries])
  const list = useMemo(() => filterVehicleEntries(entries, filter, today), [entries, filter, today])
  const months = useMemo(() => groupVehicleByMonth(list), [list])
  const draftCount = useMemo(() => filterVehicleEntries(entries, draft, today).length, [entries, draft, today])
  const quick = filterToQuick(filter)
  const advanced = advancedKeys(filter)
  const byDate = filter.sort === 'new' || filter.sort === 'old'
  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name
  const usedAccounts = accounts.filter((a) => entries.some((e) => e.log.accountId === a.id))

  function chipLabel(k: (typeof advanced)[number]): string {
    if (k === 'accountId') return accountName(filter.accountId) ?? 'حساب'
    return OPTS[k].find(([v]) => v === filter[k])?.[1] ?? ''
  }

  function toggle(id: string) {
    haptic('tick')
    setOpenId((cur) => (cur === id ? null : id))
  }

  function remove(e: VehicleEntry) {
    const removal = e.kind === 'fuel' ? deleteFuelLog(e.id) : deleteOilChange(e.id)
    if (!removal) return
    haptic('warning')
    setOpenId(null)
    showUndoToast(e.kind === 'fuel' ? 'تم حذف التعبئة' : 'تم حذف تغيير الزيت', (data) => data.restoreVehicleLog(removal))
  }

  function details(e: VehicleEntry) {
    const actions = (
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => navigate(`/vehicle/log/${e.kind}/${e.id}`)}
          className="qb-press flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-[13px] border border-[var(--color-border-strong)] bg-white/[0.05] text-[12.5px] font-semibold"
        >
          <Svg size={15}>
            <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
          </Svg>
          تعديل
        </button>
        <button
          onClick={() => remove(e)}
          className="qb-press flex h-[38px] items-center justify-center gap-1.5 rounded-[13px] border px-3.5 text-[12.5px] font-semibold"
          style={{ color: 'var(--color-expense)', background: soft('var(--color-expense)', 10), borderColor: soft('var(--color-expense)', 28) }}
        >
          <Svg size={15}>
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
          </Svg>
          حذف
        </button>
      </div>
    )

    if (e.kind === 'oil') {
      const o = e as OilEntry
      const pct = o.leftKm !== null ? Math.min(100, Math.max(0, (1 - o.leftKm / vehicleOilIntervalKm) * 100)) : 0
      return (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            <Tile k="العداد" v={n0(o.odometerKm)} unit="كم" />
            <Tile k="من التغيير السابق" v={o.sinceKm ? n0(o.sinceKm) : '—'} unit={o.sinceKm ? 'كم' : undefined} muted={!o.sinceKm} />
            <Tile k="التكلفة" v={o.cost ? formatAmount(o.cost) : '—'} unit={o.cost ? 'ر.س' : undefined} muted={!o.cost} />
          </div>
          {o.latest && o.leftKm !== null && (
            <div className="mt-2.5 rounded-[14px] border border-[var(--color-border)] bg-white/[0.035] px-3 py-2.5">
              <div dir="ltr" className="num flex justify-between text-[10.5px] text-[var(--color-text-3)]">
                <span>{n0(o.odometerKm)}</span>
                <span>{n0(o.nextAtKm)}</span>
              </div>
              <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-high)]" dir="ltr">
                <i className="block h-full rounded-full" style={{ width: `${pct}%`, background: o.leftKm < 500 ? 'var(--color-subscription)' : OIL }} />
              </div>
              <div className="text-center text-[11.5px] text-[var(--color-text-2)]">
                {o.leftKm > 0 ? (
                  <>
                    باقي <b className="num text-[var(--color-text)]">{n0(o.leftKm)}</b> كم على التغيير الجاي
                  </>
                ) : (
                  <span style={{ color: 'var(--color-expense)' }}>
                    تجاوزت موعد التغيير بـ <b className="num">{n0(-o.leftKm)}</b> كم
                  </span>
                )}
              </div>
            </div>
          )}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Chip>
              <span className="num">{formatDate(o.date)}</span>
            </Chip>
            {accountName(o.log.accountId) && <Chip>{accountName(o.log.accountId)}</Chip>}
          </div>
          {actions}
        </>
      )
    }

    const f = e as FuelEntry
    const diff = f.kmPerLiter && avg ? ((f.kmPerLiter - avg) / avg) * 100 : null
    const payer = f.log.paidByPersonId ? people.find((p) => p.id === f.log.paidByPersonId) : undefined
    return (
      <>
        <div className="grid grid-cols-3 gap-1.5">
          <Tile k="الاستهلاك" v={f.kmPerLiter ? n1(f.kmPerLiter) : '—'} unit={f.kmPerLiter ? 'كم/لتر' : undefined} muted={!f.kmPerLiter} />
          <Tile k="سعر اللتر" v={f.pricePerLiter ? n2(f.pricePerLiter) : '—'} unit={f.pricePerLiter ? 'ر.س' : undefined} muted={!f.pricePerLiter} />
          <Tile k="تكلفة الكيلو" v={f.costPerKm ? n2(f.costPerKm) : '—'} unit={f.costPerKm ? 'ر.س' : undefined} muted={!f.costPerKm} />
          <Tile k="اللترات" v={n2(f.log.liters)} unit="لتر" />
          <Tile k="العداد" v={n0(f.odometerKm)} unit="كم" />
          <Tile k="من آخر تعبئة" v={f.days !== null ? String(f.days) : '—'} unit={f.days !== null ? daysLabel(f.days) : undefined} muted={f.days === null} />
        </div>
        {f.prevOdometerKm !== null && f.drivenKm !== null && (
          <div className="mt-2.5 rounded-[14px] border border-[var(--color-border)] bg-white/[0.035] px-3 py-2.5">
            <div dir="ltr" className="num flex justify-between text-[10.5px] text-[var(--color-text-3)]">
              <span>{n0(f.prevOdometerKm)} كم</span>
              <span>{n0(f.odometerKm)} كم</span>
            </div>
            <div className="my-1.5 h-1.5 rounded-full" style={{ background: FUEL }} />
            <div className="text-center text-[11.5px] text-[var(--color-text-2)]">
              قطعت <b className="num text-[var(--color-text)]">{n0(f.drivenKm)}</b> كم من التعبئة السابقة{f.prevFull === false ? ' (كانت جزئية)' : ''}
            </div>
          </div>
        )}
        <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-[var(--color-text-2)]">
          {diff !== null && avg ? (
            <>
              <span
                dir="ltr"
                className="num rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ background: soft(diff >= 0 ? 'var(--color-income)' : 'var(--color-expense)', 15), color: diff >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
              >
                {diff >= 0 ? '▲' : '▼'} {n1(Math.abs(diff))}%
              </span>
              {diff >= 0 ? 'أفضل' : 'أسوأ'} من متوسطك <b className="num text-[var(--color-text)]">{n1(avg)}</b> كم/لتر
            </>
          ) : (
            <span className="text-[var(--color-text-3)]">الاستهلاك يُحسب بين تعبئتين كاملتين فقط</span>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Chip>
            <span className="num">{formatDate(f.date)}</span>
          </Chip>
          <Chip color={f.log.isFullTank ? FUEL : undefined}>{f.log.isFullTank ? 'تعبئة كاملة' : 'تعبئة جزئية'}</Chip>
          {payer ? <Chip color="var(--color-owed-to)">دفعها {payer.name} · مساهمة</Chip> : accountName(f.log.accountId) && <Chip>{accountName(f.log.accountId)}</Chip>}
        </div>
        {actions}
      </>
    )
  }

  function row(e: VehicleEntry, i: number) {
    const open = openId === e.id
    const isFuel = e.kind === 'fuel'
    const f = isFuel ? (e as FuelEntry) : null
    const c = isFuel ? FUEL : OIL
    const sub = f
      ? `${formatDate(e.date)} · ${f.drivenKm ? `${n0(f.drivenKm)} كم` : `${n0(e.odometerKm)} كم`}${f.kmPerLiter ? ` · ${n1(f.kmPerLiter)} كم/ل` : ''}`
      : `${formatDate(e.date)} · ${n0(e.odometerKm)} كم`
    return (
      <div key={`${e.kind}-${e.id}`} className={i ? 'border-t border-[var(--color-border)]' : ''} style={open ? { background: 'linear-gradient(180deg, rgba(255,255,255,.025), transparent 60%)' } : undefined}>
        <button onClick={() => toggle(e.id)} aria-expanded={open} className="flex w-full items-center gap-3 px-3.5 py-3 text-right">
          <span className="grid h-[42px] w-[42px] flex-none place-items-center rounded-[14px]" style={{ background: soft(c), color: c }}>
            {isFuel ? <FuelGlyph /> : <OilGlyph />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
              {isFuel ? 'تعبئة وقود' : 'تغيير زيت'}
              {f?.log.isFullTank && (
                <span className="rounded-full px-[7px] py-px text-[10px] font-semibold" style={{ background: soft(FUEL), color: FUEL }}>
                  كاملة
                </span>
              )}
              {f?.log.paidByPersonId && (
                <span className="rounded-full px-[7px] py-px text-[10px] font-semibold" style={{ background: soft('var(--color-owed-to)', 15), color: 'var(--color-owed-to)' }}>
                  مساهمة
                </span>
              )}
            </span>
            <span className="num mt-[3px] block truncate text-[11px] text-[var(--color-text-3)]">{sub}</span>
          </span>
          <span className="flex-none text-left">
            {e.cost > 0 && (
              <span className="num block text-[14px] font-bold">
                {formatAmount(e.cost)}
                <span className="ms-0.5 font-sans text-[10px] font-medium text-[var(--color-text-3)]">ر.س</span>
              </span>
            )}
            {f && <span className="num mt-0.5 block text-[11px] text-[var(--color-text-3)]">{n2(f.log.liters)} لتر</span>}
          </span>
          <span className="flex-none text-[var(--color-text-3)]" style={{ transform: open ? 'rotate(180deg)' : 'none', color: open ? 'var(--color-text)' : undefined, transition: 'transform 350ms var(--ease-spring)' }}>
            <Svg size={16} width={2.4}>
              <path d="m6 9 6 6 6-6" />
            </Svg>
          </span>
        </button>
        <div className="grid" style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 420ms var(--ease-out-expo)' }}>
          <div className="overflow-hidden">
            <div className="px-3.5 pb-3.5" style={{ opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(-6px)', transition: 'opacity 250ms ease, transform 400ms var(--ease-out-expo)' }}>
              {open && details(e)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const card = (items: VehicleEntry[]) => <div className="qb-card overflow-hidden">{items.map(row)}</div>

  return (
    <section className="qb-rise">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="qb-section-title">سجل العمليات</div>
        {entries.length > 0 && (
          <button
            onClick={() => {
              setDraft(filter)
              setSheetOpen(true)
            }}
            className="qb-press relative inline-flex h-8 items-center gap-1.5 rounded-full border bg-[var(--color-surface)] px-3 text-[12px] font-semibold"
            style={{ borderColor: advanced.length ? 'var(--color-accent-line)' : 'var(--color-border)', color: advanced.length ? 'var(--color-text)' : 'var(--color-text-2)' }}
          >
            <Svg size={15}>
              <path d="M4 6h16M7 12h10M10 18h4" />
            </Svg>
            فلترة
            {advanced.length > 0 && <span className="absolute -left-0.5 -top-0.5 h-[9px] w-[9px] rounded-full border-2 border-[var(--color-bg)] bg-[var(--color-accent)]" />}
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyState title="لا يوجد سجل بعد" desc="كل تغيير زيت أو تعبئة وقود تسجّلها تظهر هنا." />
      ) : (
        <>
          <div className="-mx-5 mb-2.5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
            {QUICK.map(([q, label]) => (
              <button
                key={q}
                onClick={() => {
                  haptic('tick')
                  setOpenId(null)
                  setFilter(quickToFilter(q, filter.sort))
                }}
                className="qb-press h-8 flex-none rounded-full border px-3.5 text-[12px] font-semibold"
                style={quick === q ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderColor: 'var(--color-accent)' } : { background: 'var(--color-surface)', color: 'var(--color-text-2)', borderColor: 'var(--color-border)' }}
              >
                {label}
              </button>
            ))}
          </div>

          {advanced.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {advanced.map((k) => (
                <span key={k} className="inline-flex h-[26px] items-center gap-1 rounded-full border border-[var(--color-border-strong)] bg-white/[0.07] pe-1.5 ps-2.5 text-[11.5px] font-semibold">
                  {chipLabel(k)}
                  <button aria-label="إزالة" onClick={() => setFilter({ ...filter, [k]: DEFAULT_LOG_FILTER[k] })} className="grid h-[18px] w-[18px] place-items-center rounded-full bg-white/[0.08]">
                    <Svg size={10} width={3}>
                      <path d="M6 6l12 12M18 6 6 18" />
                    </Svg>
                  </button>
                </span>
              ))}
              <button onClick={() => setFilter(DEFAULT_LOG_FILTER)} className="px-1.5 text-[11.5px] font-semibold text-[var(--color-text-3)]">
                مسح الكل
              </button>
            </div>
          )}

          {list.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[var(--color-border-strong)] px-5 py-8 text-center text-[12.5px] text-[var(--color-text-3)]">ما فيه عمليات تطابق الفلترة</div>
          ) : byDate ? (
            months.map((m) => (
              <div key={m.key} className="mb-3">
                {/* رأس الشهر يلصق تحت الرأس العائم (top: -8px داخل ScreenScroll). */}
                <div className="sticky z-[3] -mx-5 mb-2 bg-[var(--color-bg)] px-5 pb-2 pt-2.5" style={{ top: -8 }}>
                  <span className="pointer-events-none absolute inset-x-0 top-full h-3" style={{ background: 'linear-gradient(var(--color-bg), transparent)' }} aria-hidden="true" />
                  <div className="flex items-baseline justify-between">
                    <b className="num text-[15px] font-semibold">{m.label}</b>
                    <span className="num text-[13px] font-bold">
                      {formatAmount(m.cost)}
                      <span className="ms-0.5 font-sans text-[10px] font-medium text-[var(--color-text-3)]">ر.س</span>
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2.5 text-[11px] text-[var(--color-text-3)]">
                    <span>{countLabel(m.items.length)}</span>
                    {m.liters > 0 && (
                      <span>
                        <b className="num font-semibold text-[var(--color-text-2)]">{n1(m.liters)}</b> لتر
                      </span>
                    )}
                    {m.drivenKm > 0 && (
                      <span>
                        <b className="num font-semibold text-[var(--color-text-2)]">{n0(m.drivenKm)}</b> كم
                      </span>
                    )}
                    {m.avgKmPerLiter && (
                      <span>
                        متوسط <b className="num font-semibold text-[var(--color-text-2)]">{n1(m.avgKmPerLiter)}</b> كم/لتر
                      </span>
                    )}
                  </div>
                </div>
                {card(m.items)}
              </div>
            ))
          ) : (
            card(list)
          )}
        </>
      )}

      {sheetOpen && (
        <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 200ms ease-out both' }} onClick={() => setSheetOpen(false)} />
          <div
            className="relative flex max-h-[86vh] w-full max-w-[480px] flex-col rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)]"
            style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
          >
            <SheetHandle onDismiss={() => setSheetOpen(false)} />
            <div className="flex items-center justify-between px-5 pb-2">
              <div className="text-[17px] font-semibold">فلترة السجل</div>
              <button onClick={() => setDraft(DEFAULT_LOG_FILTER)} className="text-[12.5px] font-semibold text-[var(--color-text-3)]">
                إعادة ضبط
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5">
              {(
                [
                  ['type', 'النوع'],
                  ['fill', 'التعبئة'],
                  ['period', 'الفترة'],
                  ['accountId', 'الحساب'],
                  ['payer', 'من دفع'],
                  ['sort', 'الترتيب'],
                ] as const
              ).map(([k, title]) => {
                const opts: [string, string][] = k === 'accountId' ? [['all', 'كل الحسابات'], ...usedAccounts.map((a): [string, string] => [a.id, a.name])] : OPTS[k]
                if (k === 'accountId' && usedAccounts.length < 2) return null
                const disabled = k === 'fill' && draft.type === 'oil'
                return (
                  <div key={k}>
                    <div className="mx-0.5 mb-2 mt-3.5 text-[12px] font-semibold text-[var(--color-text-2)]">{title}</div>
                    <div className="flex flex-wrap gap-1.5" style={{ opacity: disabled ? 0.35 : 1 }}>
                      {opts.map(([v, label]) => {
                        const on = draft[k] === v
                        return (
                          <button
                            key={v}
                            disabled={disabled}
                            onClick={() => {
                              haptic('tick')
                              setDraft({ ...draft, [k]: v, ...(k === 'type' && v === 'oil' ? { fill: 'all', payer: 'all' } : {}) } as VehicleLogFilter)
                            }}
                            className="qb-press h-[34px] rounded-full border px-3.5 text-[12px] font-semibold"
                            style={on ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderColor: 'var(--color-accent)' } : { background: 'var(--color-surface)', color: 'var(--color-text-2)', borderColor: 'var(--color-border)' }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              <div className="h-2" />
            </div>
            <div className="safe-bottom px-5 pb-5 pt-3">
              <button
                onClick={() => {
                  setFilter(draft)
                  setOpenId(null)
                  setSheetOpen(false)
                }}
                className="qb-press h-[52px] w-full rounded-[17px] text-[14.5px] font-bold"
                style={{ background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent-b))', color: 'var(--color-on-accent)' }}
              >
                {draftCount === 0 ? 'ما فيه نتائج' : draftCount === 1 ? 'عرض عملية وحدة' : `عرض ${countLabel(draftCount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
