import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AmountPad } from '../components/AmountPad'
import { PickerField } from '../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../components/SelectSheet'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'
import { formatMoney } from '../lib/format'

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
  const { accounts, vehicleOdometerKm, logOilChange, logFuel } = useData()

  const [odometerKm, setOdometerKm] = useState(vehicleOdometerKm !== null ? String(vehicleOdometerKm) : '')
  const [liters, setLiters] = useState('')
  const [cost, setCost] = useState('')
  const [isFullTank, setIsFullTank] = useState(true)
  const [activeField, setActiveField] = useState<FieldKey>('odometer')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)

  const numericOdometer = Number(odometerKm)
  const numericLiters = Number(liters)
  const numericCost = Number(cost)
  const hasCost = numericCost > 0
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const canSave = numericOdometer > 0 && (type !== 'fuel' || numericLiters > 0) && (!hasCost || !!accountId)

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
        accountId: hasCost ? accountId : undefined,
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
      header={<ScreenHeader title={type === 'oil' ? 'تسجيل تغيير الزيت' : 'تسجيل تعبئة وقود'} onBack={() => navigate(-1)} cancelLabel="إلغاء" className="pt-8 pb-6" />}
      footer={
        <div className="px-5 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#0A0A0C] disabled:opacity-40"
            style={{ background: 'var(--color-vehicle)' }}
          >
            تسجيل
          </button>
        </div>
      }
    >
      <div className="mb-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr)` }}>
        {fields.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveField(f.key)}
            className="qb-press rounded-2xl border px-2 py-2.5 text-center"
            style={
              activeField === f.key
                ? { borderColor: 'var(--color-vehicle)', background: 'rgba(56,189,248,0.14)' }
                : { borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }
            }
          >
            <div className="text-[10.5px] text-[var(--color-text-3)]">{f.label}</div>
            <div className="num text-[13px] font-bold" style={{ color: !f.value ? 'var(--color-text-3)' : activeField === f.key ? 'var(--color-vehicle)' : 'var(--color-text)' }}>
              {f.value ? `${f.value}${f.unit ? ` ${f.unit}` : ''}` : '—'}
            </div>
          </button>
        ))}
      </div>

      <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
        <span className="num text-[36px] font-bold">{activeValue || '0'}</span>
        {activeUnit && <span className="flex-shrink-0 text-[13px] font-semibold text-[var(--color-text-3)]">{activeUnit}</span>}
      </div>
      <div className="mb-5 flex justify-center">
        <AmountPad value={activeValue} onChange={setActiveValue} color="var(--color-vehicle)" />
      </div>

      {type === 'oil' && activeField === 'odometer' && (
        <div className="mb-5 -mt-2 px-1 text-center text-[11px] leading-relaxed text-[var(--color-text-3)]">
          يبدأ حساب الفاصل التالي (5000 كم افتراضيًا) من هذا الرقم
        </div>
      )}

      {type === 'fuel' && (
        <>
          <button
            type="button"
            onClick={() => setIsFullTank((v) => !v)}
            className="qb-card qb-press mb-5 flex w-full items-center justify-between px-4 py-3.5 text-right"
          >
            <div>
              <div className="text-[13.5px] font-bold">تعبئة كاملة (لين آخر الخزان)</div>
              <div className="text-[11.5px] text-[var(--color-text-3)]">هذا هو الوضع الطبيعي عند التعبئة — عطّلها فقط لو عبّيت جزء من الخزان</div>
            </div>
            <div
              className="flex h-6 w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors"
              style={{ background: isFullTank ? 'var(--color-vehicle)' : 'rgba(255,255,255,0.14)' }}
            >
              <div className="h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: isFullTank ? 'translateX(-20px)' : 'translateX(0)' }} />
            </div>
          </button>
          {!isFullTank && (
            <div className="mb-5 -mt-3 px-1 text-[11px] leading-relaxed text-[var(--color-text-3)]">
              التعبئة الجزئية تُسجَّل بالسجل وبالتكلفة، بس ما تدخل بحساب معدل الاستهلاك — لازم تعبئة كاملة عشان الحساب يكون دقيق.
            </div>
          )}
        </>
      )}

      {hasCost && (
        <div className="mb-5">
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
            selectedId={accountId}
            onSelect={(v) => {
              setAccountId(v)
              setAccountSheetOpen(false)
            }}
            onClose={() => setAccountSheetOpen(false)}
            emptyLabel="لا توجد حسابات بعد"
            footer={
              <button
                onClick={() => {
                  setAccountSheetOpen(false)
                  navigate('/accounts/new')
                }}
                className="qb-press mt-1 w-full rounded-2xl border border-dashed py-2.5 text-[12.5px] font-semibold"
                style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'var(--color-accent)' }}
              >
                + إضافة حساب جديد
              </button>
            }
          />

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
            onClick={() => (accounts.length === 0 ? navigate('/accounts/new') : setAccountSheetOpen(true))}
          />
        </div>
      )}
    </ScreenScroll>
  )
}
