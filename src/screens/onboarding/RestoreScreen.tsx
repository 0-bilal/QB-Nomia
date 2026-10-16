import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../state/AuthContext'
import { ScreenHeader } from '../../components/ScreenHeader'
import { ScreenScroll } from '../../components/ScreenScroll'
import { Icons, ObIcon, ObNote, ObPrimary } from '../../components/onboarding/ObUi'
import { UrlField } from '../../components/onboarding/UrlField'
import { clearSheetsSyncCredentials, setSheetsSyncCredentials } from '../../config/sheetsSync'
import { haptic } from '../../lib/haptics'
import { markIntroSeen } from '../../lib/onboarding'
import { checkWebAppUrl } from '../../lib/scriptCode'
import { probeSheets, pullFromSheets } from '../../lib/sheetsSync'
import { notify } from '../../lib/notify'
import { useData } from '../../state/DataContext'

/** «عندي نسخة احتياطية»: من أول شاشة، قبل الرقم السري — يربط ويسحب ويفك التشفير. */
export function RestoreScreen() {
  const { hasPin } = useAuth()
  if (hasPin) return <Navigate to="/" replace />
  return <RestoreScreenInner />
}

function RestoreScreenInner() {
  const navigate = useNavigate()
  const { importSnapshot } = useData()
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const ready = checkWebAppUrl(url) === 'ok' && token.trim().length > 0

  async function restore() {
    setBusy(true)
    setError('')
    const cleanToken = token.replace(/\s+/g, '')
    try {
      const { hasData } = await probeSheets(url, cleanToken)
      if (!hasData) throw new Error('الربط سليم، لكن ما فيه نسخة محفوظة بهذا الجدول بعد')
      setSheetsSyncCredentials(url, cleanToken)
      importSnapshot(await pullFromSheets())
      markIntroSeen()
      haptic('success')
      notify('success', 'رجعت بياناتك. أنشئ رقمًا سريًا لهذا الجهاز')
      navigate('/setup', { replace: true })
    } catch (err) {
      clearSheetsSyncCredentials()
      haptic('warning')
      setError(err instanceof Error ? err.message : 'تعذّر الاسترجاع')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScreenScroll
      header={<ScreenHeader title="استرجاع نسختك" onBack={() => navigate(-1)} />}
      footer={
        <div className="safe-bottom px-5 pb-5 pt-2">
          <ObPrimary disabled={!ready || busy} onClick={restore}>
            {busy ? 'جارٍ الاسترجاع…' : 'استرجع بياناتي'}
          </ObPrimary>
        </div>
      }
    >
      <p className="mb-5 text-[12.5px] leading-[1.8] text-[var(--color-text-3)]">
        الصق رابط Web App والرمز السري اللي استخدمتهم في جهازك القديم. تلقاهم هناك في المزيد ← المزامنة، أو حيث حفظت الرمز.
      </p>
      <div className="mb-2 text-[12px] font-semibold text-[var(--color-text-2)]">رابط Web App</div>
      <UrlField value={url} onChange={setUrl} />
      <div className="mb-2 mt-3 text-[12px] font-semibold text-[var(--color-text-2)]">الرمز السري</div>
      <div className="flex h-[52px] items-center rounded-[17px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 focus-within:border-[var(--color-accent-line)]">
        <input
          dir="ltr"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="الرمز السري"
          className="min-w-0 flex-1 bg-transparent text-left font-mono text-[13px] outline-none placeholder:text-[var(--color-text-3)]"
        />
      </div>
      {error && (
        <div className="mt-3 rounded-[16px] border p-3 text-[12px] leading-[1.7]" style={{ color: 'var(--color-expense)', borderColor: 'color-mix(in srgb, var(--color-expense) 32%, transparent)', background: 'color-mix(in srgb, var(--color-expense) 8%, transparent)' }}>
          {error}
        </div>
      )}
      <ObNote icon={<ObIcon size={18}>{Icons.lock}</ObIcon>}>
        الاسترجاع يستبدل أي بيانات على هذا الجهاز بنسختك، ويفك تشفيرها هنا بجوالك. الرمز يبقى محفوظ على هذا الجهاز عشان يكمّل النسخ تلقائيًا.
      </ObNote>
    </ScreenScroll>
  )
}
