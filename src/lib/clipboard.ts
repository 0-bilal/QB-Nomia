import { useEffect, useState } from 'react'

/** نسخ نص للحافظة — مع بديل للمتصفحات القديمة أو WebView بدون صلاحية الحافظة. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // متصفحات قديمة أو WebView بدون صلاحية الحافظة.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

/** حالة «انتسخ» لثانية ونص بعد النسخ. */
export function useCopied(): [boolean, () => void] {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!on) return
    const t = window.setTimeout(() => setOn(false), 1600)
    return () => clearTimeout(t)
  }, [on])
  return [on, () => setOn(true)]
}
