import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ConfirmDialog } from '../../components/ConfirmDialog'

interface ContactsManager {
  select: (props: string[], opts?: { multiple?: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>>
}

function getContactsAPI(): ContactsManager | null {
  const nav = navigator as Navigator & { contacts?: ContactsManager }
  return nav.contacts ?? null
}

export function AddPersonScreen() {
  const { personId } = useParams<{ personId?: string }>()
  const { people, loanTransactions, addPerson, updatePerson, deletePerson } = useData()
  const navigate = useNavigate()

  const existing = personId ? people.find((p) => p.id === personId) : undefined
  const isEditing = Boolean(existing)

  const [name, setName] = useState(existing?.name ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const contactsSupported = getContactsAPI() !== null

  const theirLoanCount = personId ? loanTransactions.filter((t) => t.personId === personId).length : 0

  async function pickContact() {
    const api = getContactsAPI()
    if (!api) return
    try {
      const [contact] = await api.select(['name', 'tel'], { multiple: false })
      if (contact?.name?.[0]) setName(contact.name[0])
      if (contact?.tel?.[0]) setPhone(contact.tel[0])
    } catch {
      // المستخدم ألغى الاختيار — لا حاجة لأي إجراء
    }
  }

  function handleSave() {
    if (!name.trim()) return
    if (isEditing && personId) {
      updatePerson(personId, { name, phone, note })
      navigate(`/loans/${personId}`, { replace: true })
    } else {
      const person = addPerson({ name, phone, note })
      navigate(`/loans/${person.id}`, { replace: true })
    }
  }

  function handleDelete() {
    if (!personId) return
    deletePerson(personId)
    navigate('/loans', { replace: true })
  }

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-6">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            إلغاء
          </button>
          <div className="text-base font-bold">{isEditing ? 'تعديل شخص' : 'إضافة شخص'}</div>
          {isEditing ? (
            <button onClick={() => setConfirmDeleteOpen(true)} className="text-[13px] font-semibold" style={{ color: 'var(--color-expense)' }}>
              حذف
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      }
      footer={
        <div className="px-5 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#04140D] disabled:opacity-40"
            style={{ background: 'var(--color-accent)' }}
          >
            {isEditing ? 'حفظ التعديلات' : 'حفظ'}
          </button>
        </div>
      }
    >
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="حذف الشخص"
        message={
          theirLoanCount > 0
            ? `فيه ${theirLoanCount} حركة سلفة معه — بتتحذف كلها كمان، ورصيد حساباتها المرتبطة بيرجع لوضعه قبلها.`
            : 'بيتم حذف هذا الشخص نهائيًا.'
        }
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {!isEditing && contactsSupported && (
        <button
          onClick={pickContact}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-3.5 text-[13px] font-semibold"
          style={{ borderColor: 'rgba(0,226,138,0.4)', color: 'var(--color-accent)' }}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6" />
          </svg>
          اختيار من جهات الاتصال
        </button>
      )}

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">الاسم</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: أحمد"
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">رقم الجوال (اختياري)</label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        dir="ltr"
        placeholder="05xxxxxxxx"
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">ملاحظة (اختياري)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="مثال: زميل العمل"
        className="mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />
    </ScreenScroll>
  )
}
