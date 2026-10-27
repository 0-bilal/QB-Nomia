import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { AmountHero } from '../../components/AmountHero'
import { DatePicker } from '../../components/DatePicker'
import { AccountSelectField, FixedPadDock, NoteChip, type DockEditor } from '../../components/FixedPadDock'
import { useData } from '../../state/DataContext'
import { BUSINESS_NAME, clientSchedule, clientStatus, cycleLabel } from '../../lib/business'
import { localIso } from '../../lib/homeFeed'
import { formatAmount } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import { notify } from '../../lib/notify'
import { MONTHS_AR } from '../../lib/txFilters'
import { KindTile, StatusChip, soft } from './BusinessWidgets'

const COLOR = 'var(--color-income)'
const dayMonth = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS_AR[Number(d.slice(5, 7)) - 1]}`

/** تحصيل من عميل — لوحة ثابتة: المبلغ يبدأ بالمتبقي من الدورة، والحفظ يسجّل دخل «برمجيات QB». */
export function CollectPaymentScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { businessClients, transactions, accounts, collectClientPayment } = useData()
  const client = businessClients.find((c) => c.id === id)
  const schedule = client ? clientSchedule(client, transactions) : null
  const remaining = schedule ? Math.round(schedule.remaining * 100) / 100 : 0

  const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : '')
  const [prefilled, setPrefilled] = useState(remaining > 0)
  const [periods, setPeriods] = useState<number | null>(1)
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [date, setDate] = useState(localIso(new Date()))
  const [note, setNote] = useState('')
  const [editingNote, setEditingNote] = useState(false)

  if (!client || !schedule) {
    return (
      <ScreenScroll header={<ScreenHeader title={BUSINESS_NAME} onBack={() => navigate(-1)} />}>
        <div className="qb-card px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">هذا العميل غير موجود</div>
      </ScreenScroll>
    )
  }

  const numeric = Number(amount)
  const canSave = numeric > 0 && !!accountId
  // معاينة أثر التحصيل على الجدول: نفس الحساب الفعلي مع حركة افتراضية.
  const after = numeric > 0 ? clientSchedule(client, [...transactions, { id: 'preview', type: 'income', amount: numeric, date, accountId, clientId: client.id, createdAt: new Date().toISOString() }]) : null
  const status = clientStatus(client, schedule.nextDueDate, localIso(new Date()))

  function changeAmount(next: string) {
    setPeriods(null)
    if (prefilled) {
      // المبلغ المقترح يُستبدل بأول ضغطة: رقم يبدأ مبلغًا جديدًا، والحذف يمسحه.
      setPrefilled(false)
      setAmount(next.length > amount.length ? next.slice(amount.length).replace(/^\./, '0.') : '')
      return
    }
    setAmount(next)
  }

  function pickPeriods(n: number) {
    if (!client) return
    haptic('tick')
    setPeriods(n)
    setPrefilled(true)
    setAmount(String(Math.round((remaining + client.amount * (n - 1)) * 100) / 100))
  }

  function save() {
    if (!canSave || !client) return
    collectClientPayment({ clientId: client.id, amount: numeric, accountId, date, note })
    haptic('success')
    notify('success', `تم تحصيل ${formatAmount(numeric)} ر.س من ${client.name}`)
    navigate(-1)
  }

  const editor: DockEditor | null = editingNote ? { value: note, onChange: setNote, placeholder: `${client.service} — ${client.name}`, onDone: () => setEditingNote(false) } : null
  const quick: [number, string][] = [
    [1, schedule.credit > 0 ? 'باقي الدورة' : 'دورة وحدة'],
    [2, 'دورتين'],
    ...(client.cycleMonths === 1 ? ([[12, 'سنة كاملة']] as [number, string][]) : []),
  ]

  return (
    <ScreenScroll
      largeTitle={false}
      contentClassName="px-5"
      header={<ScreenHeader title="تحصيل دفعة" onBack={() => navigate(-1)} cancelLabel="إلغاء" className="pt-8 pb-6" right={<div className="w-10" />} />}
      footer={
        <FixedPadDock
          amount={amount}
          onAmountChange={changeAmount}
          color={COLOR}
          canSave={canSave}
          onSave={save}
          saveLabel="تحصيل"
          editor={editor}
          chips={
            <>
              <DatePicker chip value={date} onChange={setDate} color={COLOR} />
              <NoteChip note={note} onClick={() => setEditingNote(true)} />
            </>
          }
        />
      }
    >
      <div className="qb-card mb-3 flex items-center gap-3 px-3.5 py-2.5">
        <KindTile kind={client.kind} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold">{client.name}</div>
          <div className="truncate text-[11px] text-[var(--color-text-3)]">
            {client.service} · {cycleLabel(client.cycleMonths)}
          </div>
        </div>
        {status.key !== 'active' && status.key !== 'paused' && <StatusChip status={status} small />}
      </div>

      <AmountHero amount={amount} color={COLOR} label="مبلغ التحصيل" className="mb-1" />
      <div className="mb-2.5 min-h-[20px] text-center text-[11.5px]" style={{ color: after && after.credit > 0 ? 'var(--color-subscription)' : 'var(--color-text-3)' }}>
        {after &&
          (after.nextDueDate === schedule.nextDueDate ? (
            <>
              يبقى <span className="num">{formatAmount(after.remaining)}</span> ر.س على العميل، والموعد ما يتقدّم لين تكتمل الدورة
            </>
          ) : (
            <>
              التجديد الجاي يصير{' '}
              <b className="font-semibold text-[var(--color-text)]">
                {dayMonth(after.nextDueDate)} <span className="num">{after.nextDueDate.slice(0, 4)}</span>
              </b>
              {after.credit > 0 && (
                <>
                  {' '}
                  · زيادة <span className="num">{formatAmount(after.credit)}</span> محسوبة من الدورة الجاية
                </>
              )}
            </>
          ))}
      </div>
      <div className="mb-3 flex justify-center gap-1.5">
        {quick.map(([n, label]) => (
          <button
            key={n}
            type="button"
            onClick={() => pickPeriods(n)}
            className="qb-press h-[30px] rounded-full border px-3 text-[11.5px] font-semibold"
            style={periods === n ? { background: soft(COLOR), borderColor: soft(COLOR, 40), color: COLOR } : { background: 'rgba(255,255,255,.05)', borderColor: 'var(--color-border)', color: 'var(--color-text-2)' }}
          >
            {label}
          </button>
        ))}
      </div>

      <AccountSelectField label="يُودع في حساب" accountId={accountId} onChange={setAccountId} />
      <div className="mb-2 text-center text-[11px] text-[var(--color-text-3)]">ينزل كحركة دخل بمصدر «{BUSINESS_NAME}»</div>
    </ScreenScroll>
  )
}
