/**
 * فتح التطبيق ببصمة الإصبع/الوجه عبر WebAuthn (Platform Authenticator) —
 * طبقة إضافية فوق الرقم السري، مو بديل عنه. بما إن التطبيق بلا خادم،
 * نستخدم نجاح "التحقق البيومتري المحلي" (navigator.credentials.get لا
 * يرفض) كإثبات كافٍ لفتح القفل، بدون تحقق تشفيري من توقيع من طرف خادم —
 * السرّ المحمي محلي فقط (بيانات التطبيق)، مو حساب على خادم بعيد.
 */

const CRED_ID_KEY = 'qbnomia.biometric.credentialId'
const ENABLED_KEY = 'qbnomia.biometric.enabled'

function bufToBase64Url(buf: ArrayBuffer): string {
  let str = ''
  for (const b of new Uint8Array(buf)) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBuf(b64url: string): ArrayBuffer {
  const padded = b64url + '='.repeat((4 - (b64url.length % 4)) % 4)
  const str = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
  return bytes.buffer
}

function hasWebAuthn(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window && typeof navigator.credentials?.create === 'function'
}

export async function isBiometricSupported(): Promise<boolean> {
  if (!hasWebAuthn()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function isBiometricEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === '1' && Boolean(localStorage.getItem(CRED_ID_KEY))
}

export async function enableBiometric(): Promise<boolean> {
  if (!hasWebAuthn()) return false
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const userId = crypto.getRandomValues(new Uint8Array(16))
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'QB-Nomia', id: window.location.hostname },
        user: { id: userId, name: 'qbnomia-user', displayName: 'مستخدم QB-Nomia' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null
    if (!credential) return false
    localStorage.setItem(CRED_ID_KEY, bufToBase64Url(credential.rawId))
    localStorage.setItem(ENABLED_KEY, '1')
    return true
  } catch {
    return false
  }
}

export function disableBiometric(): void {
  localStorage.removeItem(CRED_ID_KEY)
  localStorage.removeItem(ENABLED_KEY)
}

export async function verifyBiometric(): Promise<boolean> {
  const credId = localStorage.getItem(CRED_ID_KEY)
  if (!credId || !hasWebAuthn()) return false
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: base64UrlToBuf(credId), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000,
      },
    })
    return Boolean(assertion)
  } catch {
    return false
  }
}
