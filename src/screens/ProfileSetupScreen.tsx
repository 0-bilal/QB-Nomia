import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HomeGreeting } from '../components/HomeGreeting'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { BirthDateField, ColorPicker, FieldLabel, GenderSegment, NameInput, PrivacyNote } from '../components/ProfileFields'
import { greetingSubline } from '../lib/greeting'
import { DEFAULT_PREFS, getProfile, markProfileOnboarded, saveProfile, type Gender } from '../lib/profile'
import { haptic } from '../lib/haptics'

/** "عرّفنا بنفسك" — تظهر مرة واحدة بعد إنشاء الرقم السري (قابلة للتخطي). */
export function ProfileSetupScreen() {
  const navigate = useNavigate()
  const existing = getProfile()
  const [name, setName] = useState(existing?.name ?? '')
  const [gender, setGender] = useState<Gender>(existing?.gender ?? 'm')
  const [birthDate, setBirthDate] = useState(existing?.birthDate ?? '')
  const [color, setColor] = useState(existing?.color ?? 0)

  const draft = { name, gender, birthDate: birthDate || undefined, color, prefs: existing?.prefs ?? DEFAULT_PREFS }
  const hour = new Date().getHours()

  function finish() {
    if (name.trim()) {
      saveProfile({ ...draft, name: name.trim() })
      haptic('success')
    } else markProfileOnboarded()
    navigate('/', { replace: true })
  }

  return (
    <div dir="rtl" className="relative isolate flex h-full flex-col overflow-hidden bg-[var(--color-bg)]">
      <div className="qb-aurora" aria-hidden="true" />
      <div className="safe-top relative z-10 flex-1 overflow-y-auto px-5 pb-8 pt-6">
        <div className="mb-1 text-left text-[12px] font-semibold text-[var(--color-text-3)]">٢ من ٢</div>
        <h1 className="text-[27px] font-bold">عرّفنا بنفسك</h1>
        <p className="mb-5 mt-1 text-[12.5px] text-[var(--color-text-3)]">حتى نرحّب بك باسمك ونخصّص التطبيق لك</p>

        <div className="mb-5 flex justify-center">
          <ProfileAvatar profile={{ name, color }} size={84} />
        </div>

        <FieldLabel>الاسم</FieldLabel>
        <NameInput value={name} onChange={setName} autoFocus />

        <div className="mt-4">
          <FieldLabel hint="لصياغة الرسائل">كيف نخاطبك؟</FieldLabel>
          <GenderSegment value={gender} onChange={setGender} />
        </div>

        <div className="mt-4">
          <FieldLabel hint="اختياري — للعمر وتهنئة عيد الميلاد">تاريخ الميلاد</FieldLabel>
          <BirthDateField value={birthDate} onChange={setBirthDate} />
        </div>

        <div className="mt-4">
          <FieldLabel>لون الصورة</FieldLabel>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="mb-5 mt-5 rounded-[22px] border border-white/[0.09] p-3.5" style={{ background: 'linear-gradient(160deg, var(--color-surface-elevated), var(--color-bg))' }}>
          <div className="mb-2.5 text-[10.5px] text-[var(--color-text-3)]">معاينة الترحيب بالرئيسية</div>
          <HomeGreeting
            profile={name.trim() ? draft : null}
            hour={hour}
            subline={greetingSubline(hour, draft, { todaySpent: 0, dailyBudget: null, monthBudgetLeft: null }, (v) => v)}
            onAvatar={() => {}}
          />
        </div>

        <button onClick={finish} className="qb-press h-[54px] w-full rounded-[18px] text-[15px] font-bold" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}>
          ابدأ
        </button>
        <button
          onClick={() => {
            markProfileOnboarded()
            navigate('/', { replace: true })
          }}
          className="w-full py-3.5 text-[13px] font-semibold text-[var(--color-text-3)]"
        >
          تخطي — أضيفها لاحقًا من المزيد
        </button>
        <PrivacyNote />
      </div>
    </div>
  )
}
