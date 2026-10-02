async function deriveKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
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

/**
 * بادئة الحمولة المضغوطة: JSON ← gzip ← AES-GCM ← base64. الضغط يصغّر الحمولة عدة أضعاف — مهم لأن
 * Google Sheets يرفض أي خلية فوق 50,000 حرف، والنسخة غير المضغوطة تتجاوزها بعد ~120 حركة فقط.
 * الحمولات القديمة (بدون بادئة) تبقى قابلة لفك التشفير.
 */
const GZIP_PREFIX = 'gz1:'

function canCompress(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined'
}

async function pipeThrough(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(bytes as BodyInit).body!.pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

/** يشفّر أي قيمة JSON بمفتاح مشتق من السر عبر AES-GCM، ويعيدها كنص base64 واحد (IV + النص المشفّر) — مضغوطة بـ gzip قبل التشفير متى ما دعمها المتصفح. */
export async function encryptJSON(secret: string, data: unknown): Promise<string> {
  const key = await deriveKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const json = new TextEncoder().encode(JSON.stringify(data))
  const compress = canCompress()
  const plaintext = compress ? await pipeThrough(json, new CompressionStream('gzip')) : json
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext as BufferSource)

  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)
  return (compress ? GZIP_PREFIX : '') + bytesToBase64(combined)
}

/** يفك تشفير نص base64 (من encryptJSON) بنفس السر، ويعيد القيمة الأصلية — يدعم الحمولات المضغوطة والقديمة غير المضغوطة. */
export async function decryptJSON<T>(secret: string, payload: string): Promise<T> {
  const compressed = payload.startsWith(GZIP_PREFIX)
  const key = await deriveKey(secret)
  const combined = base64ToBytes(compressed ? payload.slice(GZIP_PREFIX.length) : payload)
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const decrypted = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext))
  const plaintext = compressed ? await pipeThrough(decrypted, new DecompressionStream('gzip')) : decrypted
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}
