/** مفتاح الصيغة القديمة (v1): SHA-256 للرمز نفسه — نفس الرمز اللي يعرفه السكربت. */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/**
 * الصيغة الجديدة (v2): من رمز المستخدم نشتق مفتاحين مستقلين بـ HKDF-SHA256.
 * - مفتاح الدخول (authKey): الوحيد اللي ينكتب في كود Apps Script ويُرسَل له.
 * - مفتاح التشفير: ما يطلع من الجهاز أبدًا.
 * HKDF أحادي الاتجاه: من مفتاح الدخول ما ينحسب الرمز ولا مفتاح التشفير.
 */
const HKDF_SALT = new TextEncoder().encode('qbnomia.sync.v2')

async function hkdfBase(token: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(token), 'HKDF', false, ['deriveBits', 'deriveKey'])
}

function hkdfParams(info: string): HkdfParams {
  return { name: 'HKDF', hash: 'SHA-256', salt: HKDF_SALT, info: new TextEncoder().encode(info) }
}

/** مفتاح الدخول للسكربت (64 خانة hex) — مشتق من الرمز، وما يفك أي شيء. */
export async function deriveAuthKey(token: string): Promise<string> {
  const bits = await crypto.subtle.deriveBits(hkdfParams('auth'), await hkdfBase(token), 256)
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('')
}

async function deriveEncKeyV2(token: string): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(hkdfParams('enc'), await hkdfBase(token), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}


function canCompress(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

async function pipeThrough(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(bytes as BodyInit).body!.pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

/**
 * بادئات الحمولة: JSON ← (gzip) ← AES-GCM ← base64.
 * - v2g: / v2: الصيغة الجديدة (مفتاح HKDF منفصل)، مضغوطة أو لا.
 * - gz1: / بدون بادئة: الصيغة القديمة v1 (مفتاح SHA-256 للرمز) — تبقى قابلة للقراءة.
 * الضغط مهم لأن Google Sheets يرفض أي خلية فوق 50,000 حرف.
 */
const GZIP_PREFIX = 'gz1:'
const V2_GZIP_PREFIX = 'v2g:'
const V2_PREFIX = 'v2:'

export type SyncScheme = 'v1' | 'v2'

async function seal(key: CryptoKey, data: unknown): Promise<{ body: string; compressed: boolean }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const json = new TextEncoder().encode(JSON.stringify(data))
  const compressed = canCompress()
  const plaintext = compressed ? await pipeThrough(json, new CompressionStream('gzip')) : json
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext as BufferSource)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return { body: bytesToBase64(combined), compressed }
}

async function open<T>(key: CryptoKey, body: string, compressed: boolean): Promise<T> {
  const combined = base64ToBytes(body)
  const decrypted = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: combined.slice(0, 12) }, key, combined.slice(12)))
  const plaintext = compressed ? await pipeThrough(decrypted, new DecompressionStream('gzip')) : decrypted
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

/** يشفّر أي قيمة JSON بالرمز ويعيدها كنص واحد. `scheme` يحدد الصيغة (الافتراضي v1 للتوافق مع السكربتات القديمة). */
export async function encryptJSON(secret: string, data: unknown, scheme: SyncScheme = 'v1'): Promise<string> {
  if (scheme === 'v2') {
    const { body, compressed } = await seal(await deriveEncKeyV2(secret), data)
    return (compressed ? V2_GZIP_PREFIX : V2_PREFIX) + body
  }
  const { body, compressed } = await seal(await deriveKey(secret), data)
  return (compressed ? GZIP_PREFIX : '') + body
}

/** يفك أي حمولة صادرة من encryptJSON بنفس الرمز — يتعرّف على الصيغة من البادئة، فيقرأ القديم والجديد. */
export async function decryptJSON<T>(secret: string, payload: string): Promise<T> {
  if (payload.startsWith(V2_GZIP_PREFIX)) return open<T>(await deriveEncKeyV2(secret), payload.slice(V2_GZIP_PREFIX.length), true)
  if (payload.startsWith(V2_PREFIX)) return open<T>(await deriveEncKeyV2(secret), payload.slice(V2_PREFIX.length), false)
  const compressed = payload.startsWith(GZIP_PREFIX)
  return open<T>(await deriveKey(secret), compressed ? payload.slice(GZIP_PREFIX.length) : payload, compressed)
}

/** صيغة الحمولة المخزّنة (لمعرفة هل بيانات الجدول انتقلت للصيغة الجديدة). */
export function payloadScheme(payload: string): SyncScheme {
  return payload.startsWith(V2_GZIP_PREFIX) || payload.startsWith(V2_PREFIX) ? 'v2' : 'v1'
}
