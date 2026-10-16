/**
 * معالج النسخة الاحتياطية: يولّد رمزًا سريًا عشوائيًا ويحقنه داخل كود
 * Apps Script نفسه، فالمستخدم ينسخ الكود جاهزًا بدون ما يعدّل أي سطر.
 * مصدر الكود واحد: google-apps-script/Code.gs (يُستورد كنص وقت البناء).
 */
import CODE_GS from '../../google-apps-script/Code.gs?raw'

export const TOKEN_PLACEHOLDER = 'CHANGE-ME-TO-A-LONG-RANDOM-SECRET'
export const APPS_SCRIPT_CREATE_URL = 'https://script.google.com/create'

// بدون الأحرف المتشابهة (0/O، 1/l/I) — أسهل لو احتاج يقرأه أو يكتبه بيده.
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
export const TOKEN_LENGTH = 32

export function generateSyncToken(length = TOKEN_LENGTH): string {
  const out: string[] = []
  // رفض العيّنات فوق آخر مضاعف كامل للأبجدية — توزيع متساوٍ بدون انحياز.
  const limit = 256 - (256 % TOKEN_ALPHABET.length)
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (b < limit) out.push(TOKEN_ALPHABET[b % TOKEN_ALPHABET.length])
      if (out.length === length) break
    }
  }
  return out.join('')
}

/** يعرض الرمز مقسّمًا لمجموعات من 8 لسهولة القراءة. */
export function groupToken(token: string): string {
  return token.replace(/(.{8})(?=.)/g, '$1 ')
}

/** كود Code.gs كاملًا وفيه الرمز بدل القيمة الافتراضية. */
export function buildScriptCode(token: string, source: string = CODE_GS): string {
  return source.replace(`'${TOKEN_PLACEHOLDER}'`, `'${token.replace(/[\\']/g, '')}'`)
}

export type WebAppUrlCheck = 'empty' | 'ok' | 'dev' | 'bad'

/** رابط Web App المنشور: script.google.com/macros/s/<id>/exec (ويُقبل حساب Workspace /a/macros/<domain>/s/). */
export function checkWebAppUrl(raw: string): WebAppUrlCheck {
  const url = raw.trim()
  if (!url) return 'empty'
  if (/^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[\w-]{20,}\/exec\/?$/.test(url)) return 'ok'
  if (/^https:\/\/script\.google\.com\/.*\/dev\/?$/.test(url)) return 'dev'
  return 'bad'
}
