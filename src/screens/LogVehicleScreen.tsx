import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { FixedPadDock } from '../components/FixedPadDock'
import { PickerField } from '../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../components/SelectSheet'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'
import { formatMoney } from '../lib/format'
import { colorFor } from '../components/Avatar'
import { ContributorPicker } from '../components/ContributorPicker'

type FieldKey = 'odometer' | 'liters' | 'cost'

/**
 * شاشة تسجيل واحدة مشتركة لتغيير الزيت وتعبئة الوقود (بدل شاشتين منفصلتين).
 * لوحة أرقام (AmountPad) وحدة بس بأي وقت — أزرار فوقها تبدّل أي حقل هي
 * تكتب فيه حاليًا، بدل تكرار لوحة الأرقام لكل حقل.
 */
export function LogVehicleScreen() {
  const navigate = useNavigate()
  const { type: rawType } = useParams<{ type: string }>()
  const type: 'oil' | 'fuel' = rawType === 'fuel' ? 'fuel' : 'oil'
  const { accounts, people, vehicleOdometerKm, logOilChange, logFuel } = useData()

  const [odometerKm, setOdometerKm] = useState(vehicleOdometerKm !== null ? String(vehicleOdometerKm) : '')
  const [liters, setLiters] = useState('')
  const [cost, setCost] = useState('')
  const [isFullTank, setIsFullTank] = useState(true)
  const [activeField, setActiveField] = useState<FieldKey>('odometer')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  // تعبئة دفعها شخص آخر (مساهمة): التكلفة تُحفظ بدون خصم من أي حساب.
  const [paidBy, setPaidBy] = useState<string | null>(null)
  const payer = type === 'fuel' && paidBy ? people.find((p) => p.id === paidBy) : undefined

  const numericOdometer = Number(odometerKm)
  const numericLiters = Number(liters)
  const numericCost = Number(cost)
  const hasCost = numericCost > 0
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const canSave = numericOdometer > 0 && (type !== 'fuel' || numericLiters > 0) && (!hasCost || !!accountId || !!payer)

  function handleSave() {
    if (!canSave) return
    if (type === 'oil') {
      logOilChange({ odometerKm: numericOdometer, cost: hasCost ? numericCost : undefined, accountId: hasCost ? accountId : undefined })
    } else {
      logFuel({
        odometerKm: numericOdometer,
        liters: numericLiters,
        isFullTank,
        cost: hasCost ? numericCost : undefined,
        accountId: hasCost && !payer ? accountId : undefined,
        paidByPersonId: hasCost && payer ? payer.id : undefined,
      })
    }
    navigate('/vehicle', { replace: true })
  }

  const fields: { key: FieldKey; label: string; value: string; unit: string | null }[] = [
    { key: 'odometer', label: 'العداد', value: odometerKm, unit: 'كم' },
  ]
  if (type === 'fuel') fields.push({ key: 'liters', label: 'الوقود', value: liters, unit: 'لتر' })
  fields.push({ key: 'cost', label: 'التكلفة', value: cost, unit: null })

  const activeValue = activeField === 'odometer' ? odometerKm : activeField === 'liters' ? liters : cost
  const setActiveValue = activeField === 'odometer' ? setOdometerKm : activeField === 'liters' ? setLiters : setCost
  const activeUnit = fields.find((f) => f.key === activeField)?.unit ?? null

  return (
    <ScreenScroll
      largeTitle={false}
      contentClassName="px-5"
      header={<ScreenHeader title={type === 'oil' ? 'تسجيل تغيير الزيت' : 'تسجيل تعبئة وقود'} onBack={() => navigate(-1)} cancelLabel="إلغاء" className="pt-8 pb-6" />}
      footer={
        <FixedPadDock
          amount={activeValue}
          onAmountChange={setActiveValue}
          color="var(--color-vehicle)"
          canSave={canSave}
          onSave={handleSave}
          saveLabel="تسجيل"
          chips={
            type === 'fuel' ? (
              <button
                type="button"
                role="switch"
                aria-checked={isFullTank}
                onClick={() => setIsFullTank((v) => !v)}
                className="qb-press flex h-9 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold"
                style={
                  isFullTank
                    ? { borderColor: 'color-mix(in srgb, var(--color-vehicle) 40%, transparent)', background: 'color-mix(in srgb, var(--color-vehicle) 14%, transparent)', color: 'var(--color-text)' }
                    : { borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-2)' }
                }
              >
                <span
                  className="flex h-[18px] w-[30px] items-center rounded-full p-[2px] transition-colors duration-300"
                  style={{ background: isFullTank ? 'var(--color-vehicle)' : 'rgba(255,255,255,0.14)' }}
                >
                  <span className="h-[14px] w-[14px] rounded-full bg-white transition-transform duration-300" style={{ transform: isFullTank ? 'translateX(-12px)' : 'translateX(0)' }} />
                </span>
                تعبئة كاملة
              </button>
            ) : undefined
          }
        />
      }
    >
      <div className="mb-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr)` }}>
        {fields.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveField(f.key)}
            className="qb-press rounded-[20px] border px-2 py-3 text-center"
            style={
              activeField === f.key
                ? { borderColor: 'transparent', background: 'var(--color-vehicle)', color: '#0a0a0c', transition: 'background 200ms ease' }
                : { borderColor: 'var(--color-border)', background: 'var(--color-surface)' }
            }
          >
            <div className="text-[11px] font-medium" style={{ opacity: activeField === f.key ? 0.7 : 1, color: activeField === f.key ? undefined : 'var(--color-text-3)' }}>
              {f.label}
            </div>
            <div className="num text-[14px] font-bold" style={{ color: activeField === f.key ? undefined : !f.value ? 'var(--color-text-3)' : 'var(--color-text)' }}>
              {f.value ? `${f.value}${f.unit ? ` ${f.unit}` : ''}` : '—'}
            </div>
          </button>
        ))}
      </div>

      <div className="mb-1 text-center text-[12.5px] text-[var(--color-text-2)]">{fields.find((f) => f.key === activeField)?.label}</div>
      <div dir="ltr" className="mb-3 flex items-baseline justify-center gap-2" style={{ color: 'var(--color-vehicle)' }}>
        <span key={activeValue} className="num text-[50px] font-bold leading-tight tracking-tight" style={{ animation: 'qb-pop 260ms var(--ease-spring) both' }}>
          {activeValue || '0'}
        </span>
        <span className="flex-shrink-0 text-[17px] font-medium opacity-60">{activeUnit ?? 'ر.س'}</span>
      </div>

      {type === 'oil' && activeField === 'odometer' && (
        <div className="mb-3 -mt-1 px-1 text-center text-[11px] leading-relaxed text-[var(--color-text-3)]">
          يبدأ حساب الفاصل التالي (5000 كم افتراضيًا) من هذا الرقم
        </div>
      )}

      {type === 'fuel' && !isFullTank && (
        <div className="mb-3 -mt-1 px-1 text-center text-[11px] leading-relaxed text-[var(--color-text-3)]">
          التعبئة الجزئية تُسجَّل بالتكلفة، بس ما تدخل بحساب معدل الاستهلاك
        </div>
      )}

      {hasCost && (
        <div className="mb-3">
          <SelectSheet
            open={accountSheetOpen}
            title="اختر الحساب الذي يُخصم منه"
            items={accounts.map(
              (a): SelectSheetItem => ({
                id: a.id,
                icon: <AccountTypeIcon type={a.type} size={17} />,
                iconColor: ACCOUNT_ICON_COLOR[a.type],
                iconBg: ACCOUNT_ICON_BG[a.type],
                title: a.name,
                subtitle: ACCOUNT_TYPE_LABELS[a.type],
                trailing: (
                  <span className="num font-bold" style={{ color: ACCOUNT_ICON_COLOR[a.type] }}>
                    {formatMoney(a.balance)}
                  </span>
                ),
              }),
            )}
            selectedId={payer ? undefined : accountId}
            onSelect={(v) => {
              setAccountId(v)
              setPaidBy(null)
              setAccountSheetOpen(false)
            }}
            onClose={() => setAccountSheetOpen(false)}
            emptyLabel="لا توجد حسابات بعد"
            footer={
              <>
              {type === 'fuel' && (
                <ContributorPicker
                  people={people.filter((p) => p.isContributor)}
                  selectedId={paidBy}
                  onPick={(pid) => {
                    setPaidBy(pid)
                    setAccountSheetOpen(false)
                  }}
                />
              )}
              <button
                onClick={() => {
                  setAccountSheetOpen(false)
                  navigate('/accounts/new')
                }}
                className="qb-press mt-1 w-full rounded-full py-3 text-[13px] font-semibold"
                style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
              >
                + إضافة حساب جديد
              </button>
              </>
            }
          />

          {payer ? (
            <PickerField
              label="من دفع؟"
              icon={<span className="text-[15px] font-bold">{payer.name.trim().charAt(0) || '؟'}</span>}
              iconColor={colorFor(payer.name)}
              iconBg={`${colorFor(payer.name)}22`}
              title={`دفعها ${payer.name}`}
              subtitle="لن تُخصم من أي حساب · تظهر في «المساهمات»"
              onClick={() => setAccountSheetOpen(true)}
            />
          ) : (
          <PickerField
            label="يُخصم من حساب"
            icon={selectedAccount ? <AccountTypeIcon type={selectedAccount.type} /> : <AccountTypeIcon type="cash" />}
            iconColor={selectedAccount ? ACCOUNT_ICON_COLOR[selectedAccount.type] : 'var(--color-text-3)'}
            iconBg={selectedAccount ? ACCOUNT_ICON_BG[selectedAccount.type] : 'rgba(255,255,255,0.08)'}
            title={selectedAccount?.name ?? (accounts.length === 0 ? 'لا توجد حسابات' : 'اختر حسابًا')}
            placeholder={!selectedAccount}
            subtitle={selectedAccount ? ACCOUNT_TYPE_LABELS[selectedAccount.type] : undefined}
            trailing={
              selectedAccount ? (
                <span className="num text-[13.5px] font-bold" style={{ color: ACCOUNT_ICON_COLOR[selectedAccount.type] }}>
                  {formatMoney(selectedAccount.balance)}
                </span>
              ) : undefined
            }
            onClick={() => (accounts.length === 0 && !(type === 'fuel' && people.some((p) => p.isContributor)) ? navigate('/accounts/new') : setAccountSheetOpen(true))}
          />
          )}
        </div>
      )}
    </ScreenScroll>
  )
}
