import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { AmountPad } from '../components/AmountPad'
import { PickerField } from '../components/PickerField'
import { SelectSheet, type SelectSheetItem } from '../components/SelectSheet'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'
import { formatMoney } from '../lib/format'

export function LogFuelScreen() {
  const navigate = useNavigate()
  const { accounts, vehicleOdometerKm, logFuel } = useData()

  const [odometerKm, setOdometerKm] = useState(vehicleOdometerKm !== null ? String(vehicleOdometerKm) : '')
  const [liters, setLiters] = useState('')
  const [isFullTank, setIsFullTank] = useState(true)
  const [hasCost, setHasCost] = useState(false)
  const [cost, setCost] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)

  const numericOdometer = Number(odometerKm)
  const numericLiters = Number(liters)
  const numericCost = Number(cost)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const canSave = numericOdometer > 0 && numericLiters > 0 && (!hasCost || (numericCost > 0 && accountId))

  function handleSave() {
    if (!canSave) return
    logFuel({
      odometerKm: numericOdometer,
      liters: numericLiters,
      isFullTank,
      cost: hasCost ? numericCost : undefined,
      accountId: hasCost ? accountId : undefined,
    })
    navigate('/vehicle', { replace: true })
  }

  return (
    <ScreenScroll
      header={<ScreenHeader title="تسجيل تعبئة وقود" onBack={() => navigate(-1)} cancelLabel="إلغاء" className="pt-8 pb-6" />}
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
      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">عداد السيارة الحالي</label>
      <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
        <span className="num text-[32px] font-bold">{odometerKm || '0'}</span>
        <span className="flex-shrink-0 text-[13px] font-semibold text-[var(--color-text-3)]">كم</span>
      </div>
      <div className="mb-5 flex justify-center">
        <AmountPad value={odometerKm} onChange={setOdometerKm} color="var(--color-vehicle)" />
      </div>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">عدد اللترات المعبَّأة</label>
      <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
        <span className="num text-[32px] font-bold">{liters || '0'}</span>
        <span className="flex-shrink-0 text-[13px] font-semibold text-[var(--color-text-3)]">لتر</span>
      </div>
      <div className="mb-5 flex justify-center">
        <AmountPad value={liters} onChange={setLiters} color="var(--color-vehicle)" />
      </div>

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

      <button
        type="button"
        onClick={() => setHasCost((v) => !v)}
        className="qb-card qb-press mb-5 flex w-full items-center justify-between px-4 py-3.5 text-right"
      >
        <div>
          <div className="text-[13.5px] font-bold">له تكلفة مالية</div>
          <div className="text-[11.5px] text-[var(--color-text-3)]">فعّلها لو تبي تسجّل مصروف التعبئة على أحد حساباتك</div>
        </div>
        <div
          className="flex h-6 w-11 flex-shrink-0 items-center rounded-full p-0.5 transition-colors"
          style={{ background: hasCost ? 'var(--color-vehicle)' : 'rgba(255,255,255,0.14)' }}
        >
          <div className="h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: hasCost ? 'translateX(-20px)' : 'translateX(0)' }} />
        </div>
      </button>

      {hasCost && (
        <>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">التكلفة</label>
          <div dir="ltr" className="mb-4 flex items-baseline justify-center gap-2">
            <span className="num text-[32px] font-bold">{cost || '0'}</span>
          </div>
          <div className="mb-5 flex justify-center">
            <AmountPad value={cost} onChange={setCost} color="var(--color-vehicle)" />
          </div>

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

          <div className="mb-5">
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
        </>
      )}
    </ScreenScroll>
  )
}
