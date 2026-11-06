import { describe, expect, it } from 'vitest'
import { decryptJSON, deriveAuthKey, encryptJSON, payloadScheme } from './cryptoUtil'

describe('encryptJSON / decryptJSON', () => {
  it('round-trips arbitrary JSON data with the correct secret', async () => {
    const data = { accounts: [{ id: 'a1', balance: 500 }], note: 'سري جدًا' }
    const payload = await encryptJSON('correct-secret', data)
    const decrypted = await decryptJSON<typeof data>('correct-secret', payload)
    expect(decrypted).toEqual(data)
  })

  it('produces a different ciphertext each time (random IV)', async () => {
    const payload1 = await encryptJSON('secret', { x: 1 })
    const payload2 = await encryptJSON('secret', { x: 1 })
    expect(payload1).not.toBe(payload2)
  })

  it('fails to decrypt with the wrong secret', async () => {
    const payload = await encryptJSON('secret-a', { x: 1 })
    await expect(decryptJSON('secret-b', payload)).rejects.toThrow()
  })

  it('fails to decrypt a corrupted payload', async () => {
    await expect(decryptJSON('secret', 'not-a-valid-payload===')).rejects.toThrow()
  })

  it('compresses the payload so a realistic data set stays far below the 50,000-char Google Sheets cell limit', async () => {
    const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
    const transactions = Array.from({ length: 400 }, (_, i) => ({
      id: id(i), type: 'expense', amount: 40 + i, date: '2026-09-15', accountId: id(9001), categoryId: id(9002 + (i % 20)), note: 'بنزين محطة', createdAt: '2026-09-15T10:00:00.000Z',
    }))
    const payload = await encryptJSON('secret', { transactions })
    expect(payload.startsWith('gz1:')).toBe(true)
    expect(payload.length).toBeLessThan(50000)
    expect(await decryptJSON('secret', payload)).toEqual({ transactions })
  })

  it('still decrypts legacy uncompressed payloads already stored in the sheet', async () => {
    const secret = 'legacy-secret'
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
    const key = await crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt'])
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify({ x: 'قديم' }))))
    const combined = new Uint8Array([...iv, ...ct])
    const legacyPayload = btoa(String.fromCharCode(...combined))
    expect(await decryptJSON(secret, legacyPayload)).toEqual({ x: 'قديم' })
  })
})

describe('الصيغة v2: مفتاح دخول منفصل عن مفتاح التشفير', () => {
  const token = 'Kp7mWx2QnR9vTz4HbJ8sLd3FgY6cAe5N'

  it('مفتاح الدخول ثابت لنفس الرمز، 64 خانة hex، ومختلف عن الرمز نفسه', async () => {
    const a = await deriveAuthKey(token)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await deriveAuthKey(token)).toBe(a)
    expect(a).not.toContain(token)
    expect(await deriveAuthKey(token + 'x')).not.toBe(a)
  })

  it('يشفّر ويفك بالرمز، والحمولة تبدأ ببادئة v2', async () => {
    const data = { accounts: [{ id: 'a1', balance: 500 }] }
    const payload = await encryptJSON(token, data, 'v2')
    expect(payload.startsWith('v2')).toBe(true)
    expect(payloadScheme(payload)).toBe('v2')
    expect(await decryptJSON(token, payload)).toEqual(data)
  })

  it('مفتاح الدخول (اللي يعرفه السكربت) ما يقدر يفك الحمولة', async () => {
    const payload = await encryptJSON(token, { secret: 1 }, 'v2')
    await expect(decryptJSON(await deriveAuthKey(token), payload)).rejects.toThrow()
  })

  it('الحمولة القديمة (v1) تبقى تنقرأ بنفس الرمز', async () => {
    const old = await encryptJSON(token, { legacy: true })
    expect(payloadScheme(old)).toBe('v1')
    expect(await decryptJSON(token, old)).toEqual({ legacy: true })
  })

  it('مفتاح v2 مختلف عن مفتاح v1: نفس البيانات بالصيغتين ما تتشابه', async () => {
    const v1 = await encryptJSON(token, { x: 1 })
    const v2 = await encryptJSON(token, { x: 1 }, 'v2')
    expect(v1.replace(/^gz1:/, '')).not.toBe(v2.replace(/^v2g?:/, ''))
  })
})

