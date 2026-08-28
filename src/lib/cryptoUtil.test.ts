import { describe, expect, it } from 'vitest'
import { decryptJSON, encryptJSON } from './cryptoUtil'

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
})
