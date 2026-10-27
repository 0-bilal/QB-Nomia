import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { AmountHero } from '../../components/AmountHero'
import { DatePicker } from '../../components/DatePicker'
import { FixedPadDock, NoteChip, type DockEditor } from '../../components/FixedPadDock'
import { useData } from '../../state/DataContext'
import { BUSINESS_NAME, CLIENT_KINDS, CYCLES, addMonths, clientSchedule } from '../../lib/business'
import { localIso } from '../../lib/homeFeed'
import { formatAmount } from '../../lib/format'
import { haptic } from '../../lib/haptics'
import { notify } from '../../lib/notify'
import type { BusinessClientKind } from '../../types'
import { KindIcon } from './BusinessWidgets'

const COLOR = 'var(--color-income)'
type Editing = 'name' | 'service' | 'phone' | null

/** عميل جديد أو تعديل: الاسم والنوع والخدمة تُكتب في القسم الثابت، والقيمة باللوحة، والموعد والجوال كبسولات. */
export function BusinessClientFormScreen() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { businessClients, transactions, addBusinessClient, updateBusinessClient } = useData()
  const existing = id ? businessClients.find((c) => c.id === id) : undefined
  const today = localIso(new Date())

  const [name, setName] = useState(existing?.name ?? '')
  const [kind, setKind] = useState<BusinessClientKind>(existing?.kind ?? 'store')
  const [service, setService] = useState(existing?.service ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [cycle, setCycle] = useState(existing?.cycleMonths ?? 1)
  const [due, setDue] = useState(() => (existing ? clientSchedule(existing, transactions).nextDueDate : addMonths(today, 1)))
  const [dueTouched, setDueTouched] = useState(!!existing)
  // عميل جديد يبدأ بكتابة الاسم — ثم «تم» يرجّع لوحة الأرقام.
  const [editing, setEditing] = useState<Editing>(existing ? null : 'name')

  if (id && !existing) {
    return (
      <ScreenScroll header={<ScreenHeader title={BUSINESS_NAME} onBack={() => navigate(-1)} />}>
        <div className="qb-card px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">هذا العميل غير موجود</div>
      </ScreenScroll>
    )
  }

  const numeric = Number(amount)
  const canSave = !!name.trim() && !!service.trim() && numeric > 0 && !!due

  function pickCycle(m: number) {
    haptic('tick')
    setCycle(m)
    // الموعد الافتراضي لعميل جديد: بعد دورة من اليوم، ما لم يختر المستخدم تاريخًا بنفسه.
    if (!dueTouched) setDue(addMonths(today, m))
  }

  function save() {
    if (!canSave) return
    const input = { name, kind, service, phone, amount: numeric, cycleMonths: cycle, nextDueDate: due }
    if (existing) {
      updateBusinessClient(existing.id, input)
      notify('success', 'تم حفظ التعديل')
      navigate(-1)
    } else {
      const newId = addBusinessClient(input)
      haptic('success')
      notify('success', `انضاف ${name.trim()}`)
      navigate(`/business/${newId}`, { replace: true })
    }
  }

  const editor: DockEditor | null =
    editing === 'name'
      ? { value: name, onChange: setName, placeholder: 'مثال: مطعم الريف', onDone: () => setEditing(service ? null : 'service') }
      : editing === 'service'
        ? { value: service, onChange: setService, placeholder: 'نظام كاشير، متجر إلكتروني…', onDone: () => setEditing(null) }
        : editing === 'phone'
          ? { value: phone, onChange: setPhone, placeholder: '05xxxxxxxx', onDone: () => setEditing(null) }
          : null

  const field = (key: Exclude<Editing, null>, label: string, value: string, placeholder: string) => (
    <>
      <div className="mx-1 mb-1.5 text-[12px] font-medium text-[var(--color-text-3)]">{label}</div>
      <button
        type="button"
        onClick={() => setEditing(key)}
        className="qb-press mb-3 flex h-[50px] w-full items-center rounded-[18px] border bg-[var(--color-surface)] px-4 text-right text-[14px]"
        style={{ borderColor: editing === key ? 'var(--color-accent-line)' : 'var(--color-border)', color: value ? 'var(--color-text)' : 'var(--color-text-3)' }}
      >
        <span className="truncate">{value || placeholder}</span>
      </button>
    </>
  )

  return (
    <ScreenScroll
      largeTitle={false}
      contentClassName="px-5"
      header={<ScreenHeader title={existing ? 'تعديل العميل' : 'عميل جديد'} onBack={() => navigate(-1)} cancelLabel="إلغاء" className="pt-8 pb-6" right={<div className="w-10" />} />}
      footer={
        <FixedPadDock
          amount={amount}
          onAmountChange={setAmount}
          color={COLOR}
          canSave={canSave}
          onSave={save}
          editor={editor}
          chips={
            <>
              <DatePicker
                chip
                value={due}
                onChange={(v) => {
                  setDue(v)
                  setDueTouched(true)
                }}
                color={COLOR}
                placeholder="التجديد"
              />
              <NoteChip note={phone} placeholder="جوال للتذكير" onClick={() => setEditing('phone')} />
            </>
          }
        />
      }
    >
      {field('name', 'اسم العميل', name, 'مثال: مطعم الريف')}

      <div className="mb-3 grid grid-cols-4 gap-1.5">
        {CLIENT_KINDS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              haptic('tick')
              setKind(k)
            }}
            className="qb-press flex h-[60px] flex-col items-center justify-center gap-1 rounded-[17px] border text-[11px] font-semibold"
            style={
              kind === k
                ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', borderColor: 'var(--color-accent)', transition: 'all 250ms var(--ease-spring)' }
                : { background: 'var(--color-surface)', color: 'var(--color-text-2)', borderColor: 'var(--color-border)', transition: 'all 250ms var(--ease-spring)' }
            }
          >
            <KindIcon kind={k} size={19} />
            {label}
          </button>
        ))}
      </div>

      {field('service', 'الخدمة', service, 'نظام كاشير، متجر إلكتروني…')}

      <AmountHero amount={amount} color={COLOR} label="قيمة الاشتراك" className="mb-2.5" />
      <div className="mb-2.5 flex gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {CYCLES.map(([m]) => (
          <button
            key={m}
            type="button"
            onClick={() => pickCycle(m)}
            className="h-[34px] flex-1 rounded-full text-[12px] font-semibold"
            style={cycle === m ? { background: 'var(--color-accent)', color: 'var(--color-on-accent)', transition: 'all 300ms var(--ease-spring)' } : { color: 'var(--color-text-2)' }}
          >
            {m === 1 ? 'شهري' : m === 12 ? 'سنوي' : `${m} أشهر`}
          </button>
        ))}
      </div>
      <div className="mb-3 min-h-[18px] text-center text-[11.5px] text-[var(--color-text-3)]">
        {numeric > 0 && (
          <>
            يضيف <b className="num font-semibold" style={{ color: COLOR }}>{formatAmount(numeric / cycle)}</b> لدخلك المتكرر شهريًا،{' '}
            <span className="num">{formatAmount((numeric * 12) / cycle)}</span> سنويًا
          </>
        )}
      </div>
      {existing && <div className="mb-3 text-center text-[11px] text-[var(--color-text-3)]">تغيير القيمة أو الدورة أو الموعد يبدأ الجدول من الموعد المختار.</div>}
    </ScreenScroll>
  )
}
