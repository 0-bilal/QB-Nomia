import { checkWebAppUrl } from '../../lib/scriptCode'
import { CheckIcon, Icons, ObIcon } from './ObUi'

/** حقل رابط Web App مع زر «لصق» وفحص فوري للرابط. */
export function UrlField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const check = checkWebAppUrl(value)
  const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText

  async function paste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) onChange(text.trim())
    } catch {
      // المتصفح رفض القراءة — يلصق المستخدم بنفسه.
    }
  }

  return (
    <div>
      <div className="flex h-[52px] items-center gap-2 rounded-[17px] border border-[var(--color-border)] bg-[var(--color-surface)] pe-1.5 ps-3.5 focus-within:border-[var(--color-accent-line)]">
        <input
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://script.google.com/macros/s/…/exec"
          autoComplete="off"
          spellCheck={false}
          inputMode="url"
          className="min-w-0 flex-1 bg-transparent text-left font-mono text-[12px] outline-none placeholder:text-[var(--color-text-3)]"
        />
        {canPaste && (
          <button type="button" onClick={paste} className="qb-press flex h-[38px] flex-none items-center gap-1.5 rounded-[13px] bg-[var(--color-surface-high)] px-3 text-[12px] font-semibold">
            <ObIcon size={14}>{Icons.paste}</ObIcon>
            لصق
          </button>
        )}
      </div>
      <div
        className="mt-2 flex min-h-5 items-center gap-1.5 text-[11.5px]"
        style={{ color: check === 'ok' ? 'var(--color-income)' : check === 'empty' ? 'var(--color-text-3)' : 'var(--color-expense)' }}
      >
        {check === 'ok' && (
          <>
            <CheckIcon />
            الرابط سليم
          </>
        )}
        {check === 'empty' && 'الرابط ينتهي بـ /exec'}
        {check === 'dev' && 'هذا رابط الاختبار (/dev). انسخ رابط Web app اللي ينتهي بـ /exec'}
        {check === 'bad' && 'لازم يبدأ بـ script.google.com/macros/s/ وينتهي بـ /exec'}
      </div>
    </div>
  )
}
