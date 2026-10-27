import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { BigAmount } from '../../components/BigAmount'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { ChipRow, EmptyState, HeaderAddButton } from '../../components/ui'
import { useData } from '../../state/DataContext'
import { BUSINESS_NAME, businessMonth, clientViews, cycleLabel, lastMonths, monthlyCollected, monthlyValue, type ClientStatusKey } from '../../lib/business'
import { localIso } from '../../lib/homeFeed'
import { formatAmount } from '../../lib/format'
import { getHideBalancesDefault } from '../../lib/privacy'
import { rise } from '../../lib/motion'
import { MONTHS_AR } from '../../lib/txFilters'
import { BusinessMark, KindTile, Money, StatusChip, Svg, soft, statusColor } from './BusinessWidgets'

type Filter = 'all' | ClientStatusKey

const FILTERS: [Filter, string][] = [
  ['all', 'الكل'],
  ['late', 'متأخر'],
  ['soon', 'قريب'],
  ['active', 'نشط'],
  ['paused', 'موقوف'],
]

/** سبارك المحصّل لآخر 6 أشهر (من اليسار الأقدم لليمين الآن). */
function CollectedSpark({ values, months }: { values: number[]; months: string[] }) {
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 360, 64 - (v / max) * 52] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  return (
    <div className="relative -mx-5 -mb-5 mt-3 h-[74px] overflow-hidden" dir="ltr">
      <svg viewBox="0 0 360 74" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="biz-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3ee08f" stopOpacity=".22" />
            <stop offset="1" stopColor="#3ee08f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} V74 H0Z`} fill="url(#biz-area)" className="qb-ob-fade" style={{ animationDelay: '1s' }} />
        <path d={line} fill="none" stroke="var(--color-income)" strokeWidth="2" strokeDasharray="600" strokeDashoffset="600" className="qb-ob-draw" style={{ animationDelay: '.2s' }} />
      </svg>
      <div className="absolute inset-x-0 bottom-1 flex justify-between px-3.5 text-[9.5px] text-[var(--color-text-3)]">
        {months.map((m) => (
          <span key={m}>{MONTHS_AR[Number(m.slice(5, 7)) - 1]}</span>
        ))}
      </div>
    </div>
  )
}

/** لوحة «برمجيات QB»: دخل الشهر، المتكرر، التجديدات القادمة، العملاء، وآخر التحصيلات. */
export function BusinessScreen() {
  const navigate = useNavigate()
  const { businessClients, transactions } = useData()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const [filter, setFilter] = useState<Filter>('all')
  const today = localIso(new Date())
  const month = today.slice(0, 7)

  const views = useMemo(() => clientViews(businessClients, transactions, today), [businessClients, transactions, today])
  const stats = useMemo(() => businessMonth(views, transactions, month, today), [views, transactions, month, today])
  const months = useMemo(() => lastMonths(today, 6), [today])
  const series = useMemo(() => monthlyCollected(transactions, months), [transactions, months])
  const payments = useMemo(
    () =>
      transactions
        .filter((t) => t.clientId && t.type === 'income')
        .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        .slice(0, 5),
    [transactions],
  )

  const active = views.filter((v) => v.client.status === 'active')
  const lateCount = views.filter((v) => v.status.key === 'late').length
  const mrr = businessClients.reduce((s, c) => s + monthlyValue(c), 0)
  const renewals = active.filter((v) => v.status.days <= 30)
  const list = views.filter((v) => filter === 'all' || v.status.key === filter)
  const total = stats.collected + stats.late + stats.upcoming
  const pct = (v: number) => (total > 0 ? `${(v / total) * 100}%` : '0%')
  const mask = (n: number) => (hidden ? '•••' : formatAmount(n))

  return (
    <ScreenScroll header={<ScreenHeader title={BUSINESS_NAME} onBack={() => navigate(-1)} right={
            <div className="flex items-center gap-2">
              <EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />
              <HeaderAddButton label="عميل جديد" onClick={() => navigate('/business/new')} />
            </div>
          } />}>
      <div className="-mt-2 mb-4 flex items-center gap-3">
        <BusinessMark size={40} />
        <div className="text-[12.5px] leading-relaxed text-[var(--color-text-3)]">
          {active.length > 0 ? (
            <>
              <span className="num">{active.length}</span> {active.length === 1 ? 'عميل نشط' : 'عملاء نشطين'} · دخل إضافي غير الراتب
            </>
          ) : (
            'عملاؤك واشتراكاتهم وتجديداتهم، ودخلهم منفصل عن راتبك'
          )}
        </div>
      </div>

      {views.length === 0 ? (
        <EmptyState
          icon={<Svg size={24}>{<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13.5 6l-3 12" />}</Svg>}
          title="أضف أول عميل"
          desc="اسم المتجر أو المطعم، الخدمة، قيمة الاشتراك، وموعد التجديد. وكل تحصيل ينزل دخل باسم النشاط."
          actionLabel="عميل جديد"
          onAction={() => navigate('/business/new')}
        />
      ) : (
        <>
          <section className="qb-card-elevated qb-rise relative overflow-hidden p-5" style={rise(0)}>
            <div className="text-[12.5px] font-medium text-[var(--color-text-2)]">دخلك من النشاط · {MONTHS_AR[Number(month.slice(5, 7)) - 1]}</div>
            <div className="mt-1">
              <BigAmount value={stats.collected} hidden={hidden} size={38} />
            </div>
            {total > 0 && (
              <>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[var(--color-surface-high)]">
                  <i className="block h-full" style={{ width: pct(stats.collected), background: 'var(--color-income)', transition: 'width 900ms cubic-bezier(.22,1,.36,1)' }} />
                  <i className="block h-full" style={{ width: pct(stats.late), background: 'var(--color-expense)', opacity: 0.85 }} />
                  <i className="block h-full" style={{ width: pct(stats.upcoming), background: 'rgba(255,255,255,.14)' }} />
                </div>
                <div className="mt-2 flex justify-between gap-2 text-[11px] text-[var(--color-text-3)]">
                  <span>
                    محصّل <b className="num font-semibold text-[var(--color-text-2)]">{mask(stats.collected)}</b>
                  </span>
                  {stats.late > 0 && (
                    <span style={{ color: 'var(--color-expense)' }}>
                      متأخر <b className="num font-semibold">{mask(stats.late)}</b>
                    </span>
                  )}
                  <span>
                    باقي <b className="num font-semibold text-[var(--color-text-2)]">{mask(stats.upcoming)}</b>
                  </span>
                </div>
              </>
            )}
            {!hidden && <CollectedSpark values={series} months={months} />}
          </section>

          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {(
              [
                ['متكرر شهريًا', mask(mrr), 'var(--color-income)', <path key="i" d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" />],
                ['عميل نشط', String(active.length), 'var(--color-text)', <path key="i" d="M4 9h16l-1 10H5zM8 9V6a4 4 0 0 1 8 0v3" />],
                ['متأخر', String(lateCount), lateCount ? 'var(--color-expense)' : 'var(--color-text-3)', <path key="i" d="M12 7v5M12 16v.5M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0" />],
              ] as const
            ).map(([label, value, color, icon], i) => (
              <div key={label} className="qb-card qb-rise rounded-[18px] px-3 py-3" style={rise(i + 1)}>
                <span className="mb-2 grid h-[30px] w-[30px] place-items-center rounded-[10px]" style={{ background: soft(color, 15), color }}>
                  <Svg size={16}>{icon}</Svg>
                </span>
                <div className="num text-[17px] font-bold" style={{ color: label === 'متأخر' && lateCount ? color : undefined }}>
                  {value}
                </div>
                <div className="mt-0.5 text-[10.5px] text-[var(--color-text-3)]">{label}</div>
              </div>
            ))}
          </div>

          {renewals.length > 0 && (
            <>
              <div className="mb-2.5 mt-6 flex items-baseline justify-between px-1">
                <div className="qb-section-title">التجديدات القادمة</div>
                <span className="text-[11.5px] text-[var(--color-text-3)]">30 يوم</span>
              </div>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
                {renewals.map((v, i) => {
                  const color = statusColor(v.status.key)
                  return (
                    <button
                      key={v.client.id}
                      onClick={() => navigate(`/business/${v.client.id}`)}
                      className="qb-press qb-rise relative w-[150px] flex-none overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-right"
                      style={rise(i)}
                    >
                      <span className="absolute inset-y-0 right-0 w-[3px]" style={{ background: v.status.key === 'active' ? 'var(--color-surface-high)' : color }} />
                      <span className="block text-[11px] font-semibold" style={{ color }}>
                        {v.status.key === 'active' ? `${Number(v.schedule.nextDueDate.slice(8, 10))} ${MONTHS_AR[Number(v.schedule.nextDueDate.slice(5, 7)) - 1]}` : v.status.label}
                      </span>
                      <span className="mt-2 block truncate text-[13px] font-semibold">{v.client.name}</span>
                      <span className="block truncate text-[10.5px] text-[var(--color-text-3)]">{v.client.service}</span>
                      <Money value={v.schedule.remaining} hidden={hidden} sign className="mt-2 block text-[17px]" color="var(--color-income)" />
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <div className="mb-2.5 mt-6 px-1">
            <div className="qb-section-title">العملاء</div>
          </div>
          <ChipRow options={FILTERS} value={filter} onChange={setFilter} className="mb-3" />
          <div className="qb-card overflow-hidden">
            {list.length === 0 ? (
              <div className="px-6 py-7 text-center text-[12.5px] text-[var(--color-text-3)]">ما فيه عملاء بهذي الحالة</div>
            ) : (
              list.map((v, i) => {
                const paused = v.client.status === 'paused'
                return (
                  <button
                    key={v.client.id}
                    onClick={() => navigate(`/business/${v.client.id}`)}
                    className={`qb-press flex w-full items-center gap-3 px-3.5 py-3 text-right ${i ? 'border-t border-[var(--color-border)]' : ''}`}
                  >
                    <KindTile kind={v.client.kind} paused={paused} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold" style={{ color: paused ? 'var(--color-text-2)' : undefined }}>
                        {v.client.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-3)]">
                        {v.client.service} · {cycleLabel(v.client.cycleMonths)}
                      </span>
                    </span>
                    <span className="flex flex-none flex-col items-end gap-1">
                      <Money value={v.client.amount} hidden={hidden} className="text-[14px]" color={paused ? 'var(--color-text-3)' : undefined} />
                      <StatusChip status={v.status} due={v.schedule.nextDueDate} small />
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {payments.length > 0 && (
            <>
              <div className="mb-2.5 mt-6 flex items-baseline justify-between px-1">
                <div className="qb-section-title">آخر التحصيلات</div>
                <span className="text-[11px] text-[var(--color-text-3)]">دخل «{BUSINESS_NAME}»</span>
              </div>
              <div className="qb-card overflow-hidden">
                {payments.map((t, i) => {
                  const c = businessClients.find((x) => x.id === t.clientId)
                  return (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/add/transaction/${t.id}`)}
                      className={`qb-press flex w-full items-center gap-3 px-3.5 py-3 text-right ${i ? 'border-t border-[var(--color-border)]' : ''}`}
                    >
                      <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[12px]" style={{ background: soft('var(--color-income)'), color: 'var(--color-income)' }}>
                        <Svg size={16}>
                          <path d="M12 19V5M5 12l7-7 7 7" />
                        </Svg>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{c?.name ?? 'عميل محذوف'}</span>
                        <span className="num mt-0.5 block text-[11px] text-[var(--color-text-3)]">
                          {Number(t.date.slice(8, 10))} {MONTHS_AR[Number(t.date.slice(5, 7)) - 1]}
                          {c ? ` · ${c.service}` : ''}
                        </span>
                      </span>
                      <Money value={t.amount} hidden={hidden} sign className="text-[14px]" color="var(--color-income)" />
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </ScreenScroll>
  )
}
