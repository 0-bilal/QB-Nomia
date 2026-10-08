import { useMemo, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { BirthDateField, ColorPicker, GenderSegment, NameInput, PrivacyNote } from '../components/ProfileFields'
import { ToggleRow } from '../components/ToggleRow'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { SheetHandle } from '../components/SheetHandle'
import { useProfile } from '../hooks/useProfile'
import { useData } from '../state/DataContext'
import { getOrInitFirstSeenAt } from '../lib/backup'
import { formatDate } from '../lib/format'
import { daysBetween, localIso } from '../lib/homeFeed'
import { PROFILE_COLORS, PROFILE_COLOR_NAMES, ageLabel, ageOf, saveProfile, type ProfilePrefs, type UserProfile } from '../lib/profile'
import { haptic } from '../lib/haptics'

const svg = { viewBox: '0 0 24 24', width: 17, height: 17, fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const I = {
  user: (
    <svg {...svg}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  ),
  chat: (
    <svg {...svg}>
      <path d="M4 5h16v11H9l-5 4Z" />
    </svg>
  ),
  cal: (
    <svg {...svg}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  palette: (
    <svg {...svg}>
      <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.4-2.2-.7-1.3.2-2.8 1.7-2.8H18a3 3 0 0 0 3-3c0-5.5-4-10-9-10Z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="16.5" cy="11" r="1" />
    </svg>
  ),
  sun: (
    <svg {...svg}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  gift: (
    <svg {...svg}>
      <rect x="3" y="9" width="18" height="12" rx="2" />
      <path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1.5S9 9 12 9c3 0 6 0 6-1.5S14 5 12 9Z" />
    </svg>
  ),
  star: (
    <svg {...svg}>
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9Z" />
    </svg>
  ),
  lock: (
    <svg {...svg}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  trash: (
    <svg {...svg}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  ),
  pen: (
    <svg {...svg} width={15} height={15}>
      <path d="M4 20h4L19 9l-4-4L4 16Z" />
    </svg>
  ),
}

type Field = 'name' | 'gender' | 'birth' | 'color'
const FIELD_TITLE: Record<Field, string> = { name: 'الاسم', gender: 'كيف نخاطبك؟', birth: 'تاريخ الميلاد', color: 'لون الصورة' }

function Row({ icon, label, value, onClick, trailing }: { icon: ReactNode; label: string; value: ReactNode; onClick: () => void; trailing?: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 border-t border-[var(--color-border)] px-3.5 py-3 text-right first:border-t-0 active:bg-white/[0.03]">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[var(--color-text-2)]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-[var(--color-text-3)]">{label}</span>
        <span className="block truncate text-[13.5px] font-semibold">{value}</span>
      </span>
      {trailing ?? <span className="text-[var(--color-text-3)]">{I.pen}</span>}
    </button>
  )
}

/** ورقة تعديل حقل واحد من الملف الشخصي. */
function EditSheet({ field, profile, onClose }: { field: Field; profile: UserProfile; onClose: () => void }) {
  const [draft, setDraft] = useState(profile)
  const valid = draft.name.trim().length > 0
  return (
    <div dir="rtl" className="fixed inset-0 z-[65] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={FIELD_TITLE[field]}
        className="relative w-full max-w-[480px] rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-5 pb-3"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="mb-4 mt-1 text-[17px] font-semibold">{FIELD_TITLE[field]}</div>
        {field === 'name' && <NameInput value={draft.name} onChange={(name) => setDraft({ ...draft, name })} autoFocus />}
        {field === 'gender' && <GenderSegment value={draft.gender} onChange={(gender) => setDraft({ ...draft, gender })} />}
        {field === 'birth' && <BirthDateField value={draft.birthDate ?? ''} onChange={(v) => setDraft({ ...draft, birthDate: v || undefined })} />}
        {field === 'color' && <ColorPicker value={draft.color} onChange={(color) => setDraft({ ...draft, color })} />}
        <button
          disabled={!valid}
          onClick={() => {
            saveProfile({ ...draft, name: draft.name.trim() })
            haptic('success')
            onClose()
          }}
          className="qb-press mt-5 h-12 w-full rounded-2xl text-[14px] font-bold disabled:opacity-40"
          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
        >
          حفظ
        </button>
        <div className="safe-bottom" />
      </div>
    </div>
  )
}

export function ProfileScreen() {
  const navigate = useNavigate()
  const profile = useProfile()
  const { recentActivity } = useData()
  const [editing, setEditing] = useState<Field | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const all = useMemo(() => recentActivity(1000000), [recentActivity])
  // "عضو منذ": أقدم من (أول تشغيل مسجّل، أقدم حركة).
  const [memberSince, daysWithApp] = useMemo(() => {
    const first = getOrInitFirstSeenAt().slice(0, 10)
    const oldest = all.length ? all[all.length - 1].date : first
    const since = oldest < first ? oldest : first
    return [since, Math.max(1, daysBetween(since, localIso(new Date())) + 1)] as const
  }, [all])

  if (!profile) return <Navigate to="/welcome" replace />
  const age = ageOf(profile.birthDate, new Date())
  const setPref = (key: keyof ProfilePrefs) => {
    haptic('tick')
    saveProfile({ ...profile, prefs: { ...profile.prefs, [key]: !profile.prefs[key] } })
  }

  return (
    <ScreenScroll header={<ScreenHeader title="الملف الشخصي" onBack={() => navigate(-1)} />}>
      {editing && <EditSheet field={editing} profile={profile} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={confirmDelete}
        title="حذف معلوماتي"
        message="بيتم حذف اسمك وتاريخ ميلادك من الجهاز، ويرجع الترحيب العام بدون اسم."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={() => {
          saveProfile(null)
          navigate('/more', { replace: true })
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="mb-5 flex flex-col items-center text-center">
        <button onClick={() => setEditing('color')} className="qb-press rounded-full" aria-label="تغيير لون الصورة">
          <ProfileAvatar profile={profile} size={96} />
        </button>
        <div className="mt-3 text-[22px] font-bold">{profile.name}</div>
        <div className="num mt-0.5 text-[12px] text-[var(--color-text-3)]">عضو منذ {formatDate(memberSince)}</div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        {[
          [age !== null ? String(age) : '—', 'العمر'],
          [daysWithApp.toLocaleString('en-US'), 'يوم مع QB'],
          [all.length.toLocaleString('en-US'), 'حركة مسجّلة'],
        ].map(([v, l]) => (
          <div key={l} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-3 text-center">
            <b className="num block text-[16px]">{v}</b>
            <small className="text-[10.5px] text-[var(--color-text-3)]">{l}</small>
          </div>
        ))}
      </div>

      <div className="qb-section-title mb-2.5 px-1">المعلومات</div>
      <div className="qb-card mb-5 overflow-hidden">
        <Row icon={I.user} label="الاسم" value={profile.name} onClick={() => setEditing('name')} />
        <Row icon={I.chat} label="المخاطبة" value={profile.gender === 'm' ? 'أنتَ (مذكّر)' : 'أنتِ (مؤنث)'} onClick={() => setEditing('gender')} />
        <Row
          icon={I.cal}
          label="تاريخ الميلاد"
          value={profile.birthDate ? <span className="num">{`${formatDate(profile.birthDate)}${age !== null ? ` · ${ageLabel(age)}` : ''}`}</span> : 'غير محدد'}
          onClick={() => setEditing('birth')}
        />
        <Row
          icon={I.palette}
          label="لون الصورة"
          value={PROFILE_COLOR_NAMES[profile.color] ?? ''}
          onClick={() => setEditing('color')}
          trailing={<span className="h-[18px] w-[18px] rounded-full" style={{ background: PROFILE_COLORS[profile.color] }} />}
        />
      </div>

      <div className="qb-section-title mb-2.5 px-1">رسائل الترحيب</div>
      <ToggleRow className="mb-2" icon={I.sun} label="الترحيب بالاسم" desc="صباح الخير / مساء الخير بالرئيسية" enabled={profile.prefs.greetByName} onToggle={() => setPref('greetByName')} />
      <ToggleRow className="mb-2" icon={I.gift} label="تهنئة عيد الميلاد" desc="بطاقة خاصة في يوم ميلادك" enabled={profile.prefs.birthday} onToggle={() => setPref('birthday')} />
      <ToggleRow className="mb-2" icon={I.star} label="رسائل المناسبات" desc="الجمعة، يوم الراتب، الرجوع بعد غياب" enabled={profile.prefs.occasions} onToggle={() => setPref('occasions')} />
      <ToggleRow className="mb-5" icon={I.lock} label="الاسم في شاشة القفل" desc="أطفئها لو أحد يشوف جوالك" enabled={profile.prefs.nameOnLock} onToggle={() => setPref('nameOnLock')} />

      <button onClick={() => setConfirmDelete(true)} className="qb-card qb-press mb-2 flex w-full items-center gap-3 px-3.5 py-3 text-right">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,95,109,0.1)] text-[var(--color-expense)]">{I.trash}</span>
        <span>
          <span className="block text-[13.5px] font-semibold text-[var(--color-expense)]">حذف معلوماتي</span>
          <span className="block text-[11px] text-[var(--color-text-3)]">يرجع الترحيب العام بدون اسم</span>
        </span>
      </button>
      <PrivacyNote />
    </ScreenScroll>
  )
}
