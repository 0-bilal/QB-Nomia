import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { SheetHandle } from '../../components/SheetHandle'
import { useData } from '../../state/DataContext'
import { BUSINESS_NAME, clientPayments, clientSchedule, clientStatus, cycleLabel, daysBetween, kindLabel, whatsappLink } from '../../lib/business'
import { localIso } from '../../lib/homeFeed'
import { formatAmount } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import { notify } from '../../lib/notify'
import { getHideBalancesDefault } from '../../lib/privacy'
import { showUndoToast } from '../../lib/undoToast'
import { rise } from '../../lib/motion'
import { MONTHS_AR } from '../../lib/txFilters'
import { KindTile, Money, StatusChip, Svg, soft, statusColor } from './BusinessWidgets'

const dayMonth = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS_AR[Number(d.slice(5, 7)) - 1]}`

/** تفاصيل عميل: الاشتراك والدورة الحالية، تحصيل، تذكير واتساب، إيقاف، وسجل التحصيل. */
export function BusinessClientScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { businessClients, transactions, accounts, setBusinessClientStatus, deleteBusinessClient } = useData()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const [remindOpen, setRemindOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const client = businessClients.find((c) => c.id === id)
  const today = localIso(new Date())

  const schedule = useMemo(() => (client ? clientSchedule(client, transactions) : null), [client, transactions])
  const history = useMemo(
    () => (client ? clientPayments(client.id, transactions).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')) : []),
    [client, transactions],
  )

  if (!client || !schedule) {
    return (
      <ScreenScroll header={<ScreenHeader title={BUSINESS_NAME} onBack={() => navigate(-1)} />}>
        <div className="qb-card px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">هذا العميل غير موجود</div>
      </ScreenScroll>
    )
  }

  const status = clientStatus(client, schedule.nextDueDate, today)
  const color = statusColor(status.key)
  const paused = client.status === 'paused'
  const span = Math.max(1, daysBetween(schedule.periodStart, schedule.nextDueDate))
  const progress = Math.max(0, Math.min(1, daysBetween(schedule.periodStart, today) / span))
  const message = `السلام عليكم، معك ${BUSINESS_NAME}.\nنذكّركم بتجديد اشتراك ${client.service} لـ${client.name} بقيمة ${formatAmount(schedule.remaining)} ر.س، ${status.days < 0 ? 'وكان موعده' : 'وموعده'} ${dayMonth(schedule.nextDueDate)}.\nشاكرين لكم.`
  const wa = whatsappLink(client.phone, message)

  function remove() {
    if (!client) return
    const snapshot = client
    deleteBusinessClient(client.id)
    haptic('warning')
    showUndoToast(`تم حذف ${client.name}`, (data) => data.restoreBusinessClient(snapshot))
    navigate('/business', { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title={client.name}
          onBack={() => navigate(-1)}
          right={
            <div className="flex items-center gap-2">
              <EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />
              <button
                onClick={() => navigate(`/business/${client.id}/edit`)}
                aria-label="تعديل"
                className="qb-glass-circle qb-press flex items-center justify-center rounded-full border"
                style={{ width: 40, height: 40 }}
              >
                <Svg size={17}>
                  <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
                </Svg>
              </button>
            </div>
          }
        />
      }
    >
      <ConfirmDialog
        open={confirmDelete}
        title="حذف العميل"
        message="بيتحذف العميل واشتراكه. حركات التحصيل تبقى في الحركات والتقارير كدخل حصل فعلًا."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />

      <section className="qb-card-elevated qb-rise relative overflow-hidden p-4" style={rise(0)}>
        <div className="flex items-center gap-3">
          <KindTile kind={client.kind} paused={paused} size={52} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-bold">{client.name}</div>
            <div className="mt-0.5 text-[11.5px] text-[var(--color-text-3)]">
              {kindLabel(client.kind)} · عميل من {dayMonth(client.since)} <span className="num">{client.since.slice(0, 4)}</span>
            </div>
          </div>
          {status.key !== 'active' && <StatusChip status={status} />}
        </div>

        <div className="mt-3.5 rounded-[18px] border border-[var(--color-border)] bg-white/[0.03] px-3.5 py-2.5">
          {(
            [
              ['الخدمة', <b key="v">{client.service}</b>],
              [
                'الاشتراك',
                <span key="v">
                  <Money value={client.amount} hidden={hidden} className="text-[13.5px]" /> <span className="text-[11px] text-[var(--color-text-3)]">· {cycleLabel(client.cycleMonths)}</span>
                </span>,
              ],
              [
                'التجديد القادم',
                <b key="v">
                  {dayMonth(schedule.nextDueDate)} <span className="num font-medium text-[var(--color-text-3)]">{schedule.nextDueDate.slice(0, 4)}</span>
                </b>,
              ],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-1.5 text-[12.5px]">
              <span className="text-[var(--color-text-3)]">{k}</span>
              {v}
            </div>
          ))}
          {schedule.credit > 0 && (
            <div className="flex items-center justify-between py-1.5 text-[12.5px]">
              <span className="text-[var(--color-text-3)]">محصّل من الدورة</span>
              <span className="text-[12px]" style={{ color: 'var(--color-subscription)' }}>
                <span className="num font-semibold">{hidden ? '•••' : formatAmount(schedule.credit)}</span> · باقي <span className="num font-semibold">{hidden ? '•••' : formatAmount(schedule.remaining)}</span>
              </span>
            </div>
          )}
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-high)]">
              <i className="block h-full rounded-full" style={{ width: `${progress * 100}%`, background: status.key === 'active' ? 'var(--color-text-2)' : color, transition: 'width 700ms cubic-bezier(.22,1,.36,1)' }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[10.5px] text-[var(--color-text-3)]">
              <span>{dayMonth(schedule.periodStart)}</span>
              <span>{status.key === 'late' ? 'فات الموعد' : 'الدورة الحالية'}</span>
              <span>{dayMonth(schedule.nextDueDate)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-[2fr_1fr_1fr] gap-2">
          <button
            disabled={paused || accounts.length === 0}
            onClick={() => navigate(`/business/${client.id}/collect`)}
            className="qb-press flex h-[46px] items-center justify-center gap-1.5 rounded-[15px] text-[13px] font-bold disabled:opacity-35"
            style={{ background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent-b))', color: 'var(--color-on-accent)' }}
          >
            <Svg size={16}>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </Svg>
            تحصيل {hidden ? '' : formatAmount(schedule.remaining)}
          </button>
          <button
            disabled={!wa}
            onClick={() => setRemindOpen(true)}
            className="qb-press flex h-[46px] items-center justify-center gap-1.5 rounded-[15px] border border-[var(--color-border-strong)] bg-white/[0.05] text-[13px] font-semibold disabled:opacity-35"
          >
            <Svg size={16}>
              <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
            </Svg>
            تذكير
          </button>
          <button
            onClick={() => {
              haptic('tick')
              setBusinessClientStatus(client.id, paused ? 'active' : 'paused')
              notify('info', paused ? `فعّلت ${client.name}` : `أوقفت ${client.name}`)
            }}
            className="qb-press flex h-[46px] items-center justify-center rounded-[15px] border border-[var(--color-border-strong)] bg-white/[0.05] text-[13px] font-semibold"
          >
            {paused ? 'تفعيل' : 'إيقاف'}
          </button>
        </div>
        {!client.phone && <div className="mt-2 text-center text-[11px] text-[var(--color-text-3)]">أضف جوال العميل من «تعديل» عشان تقدر تذكّره بالواتساب</div>}
      </section>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="qb-card qb-rise rounded-[18px] p-3" style={rise(1)}>
          <Money value={schedule.totalPaid} hidden={hidden} className="text-[17px]" color="var(--color-income)" />
          <div className="mt-0.5 text-[10.5px] text-[var(--color-text-3)]">مجموع ما حصّلته منه</div>
        </div>
        <div className="qb-card qb-rise rounded-[18px] p-3" style={rise(2)}>
          <Money value={(client.amount * 12) / client.cycleMonths} hidden={hidden} className="text-[17px]" />
          <div className="mt-0.5 text-[10.5px] text-[var(--color-text-3)]">قيمته السنوية</div>
        </div>
      </div>

      <div className="mb-2.5 mt-6 flex items-baseline justify-between px-1">
        <div className="qb-section-title">سجل التحصيل</div>
        <span className="num text-[11.5px] text-[var(--color-text-3)]">{history.length}</span>
      </div>
      <div className="qb-card overflow-hidden">
        {history.length === 0 ? (
          <div className="px-6 py-7 text-center text-[12.5px] text-[var(--color-text-3)]">ما فيه تحصيل مسجّل بعد</div>
        ) : (
          history.map((t, i) => {
            const acc = accounts.find((a) => a.id === t.accountId)
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/add/transaction/${t.id}`)}
                className={`qb-press flex w-full items-center gap-3 px-3.5 py-3 text-right ${i ? 'border-t border-[var(--color-border)]' : ''}`}
              >
                <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[12px]" style={{ background: soft('var(--color-income)'), color: 'var(--color-income)' }}>
                  <Svg size={15} width={2.6}>
                    <path d="M5 12l5 5L20 7" />
                  </Svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{t.note ?? client.service}</span>
                  <span className="mt-0.5 block text-[11px] text-[var(--color-text-3)]">
                    <span className="num">
                      {dayMonth(t.date)} {t.date.slice(0, 4)}
                    </span>
                    {acc ? ` · ${acc.name}` : ''}
                  </span>
                </span>
                <Money value={t.amount} hidden={hidden} sign className="text-[14px]" color="var(--color-income)" />
              </button>
            )
          })
        )}
      </div>
      <p className="mt-3 px-2 text-center text-[11px] leading-relaxed text-[var(--color-text-3)]">
        كل تحصيل حركة دخل «{BUSINESS_NAME}» في الحركات. حذفها أو تعديل مبلغها يرجّع موعد التجديد تلقائيًا.
      </p>

      <button onClick={() => setConfirmDelete(true)} className="mt-4 w-full py-3 text-center text-[12.5px] font-semibold text-[var(--color-expense)]">
        حذف العميل
      </button>

      {remindOpen && (
        <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 200ms ease-out both' }} onClick={() => setRemindOpen(false)} />
          <div
            className="relative w-full max-w-[480px] rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-5 pb-6"
            style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
          >
            <SheetHandle onDismiss={() => setRemindOpen(false)} />
            <div className="text-[17px] font-semibold">تذكير بالتجديد</div>
            <div className="mt-1 text-[12px] text-[var(--color-text-3)]">رسالة جاهزة تنفتح في واتساب العميل، وتقدر تعدّلها قبل الإرسال.</div>
            <div className="mt-3 whitespace-pre-line rounded-[18px] border border-[var(--color-border-strong)] bg-[var(--color-void)] p-3.5 text-[13px] leading-[1.9] text-[var(--color-text-2)]">{message}</div>
            <div className="safe-bottom mt-4 flex gap-2">
              <button
                onClick={() => {
                  if (wa) window.open(wa, '_blank', 'noopener')
                  setRemindOpen(false)
                }}
                className="qb-press flex h-[50px] flex-[2] items-center justify-center gap-2 rounded-[17px] text-[14px] font-bold"
                style={{ background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent-b))', color: 'var(--color-on-accent)' }}
              >
                <Svg size={17}>
                  <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />
                </Svg>
                فتح واتساب
              </button>
              <button onClick={() => setRemindOpen(false)} className="qb-press h-[50px] flex-1 rounded-[17px] border border-[var(--color-border-strong)] bg-white/[0.05] text-[13.5px] font-semibold">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </ScreenScroll>
  )
}
