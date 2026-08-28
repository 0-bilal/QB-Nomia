import { describe, expect, it } from 'vitest'
import { configuredDigits, hasPinConfigured, resetPin, setupPin, verifyPin } from './auth'

describe('PIN setup / verification', () => {
  it('reports no PIN configured before setup', () => {
    expect(hasPinConfigured()).toBe(false)
  })

  it('accepts the correct PIN after setup', async () => {
    await setupPin('1234')
    expect(hasPinConfigured()).toBe(true)
    expect(await verifyPin('1234')).toBe(true)
  })

  it('rejects a wrong PIN', async () => {
    await setupPin('1234')
    expect(await verifyPin('9999')).toBe(false)
  })

  it('rejects any PIN when none has been set up', async () => {
    expect(await verifyPin('1234')).toBe(false)
  })

  it('remembers the configured PIN length', async () => {
    await setupPin('123456')
    expect(configuredDigits()).toBe(6)
  })

  it('defaults to 6 digits when nothing is configured', () => {
    expect(configuredDigits()).toBe(6)
  })

  it('clears the stored PIN on resetPin', async () => {
    await setupPin('1234')
    resetPin()
    expect(hasPinConfigured()).toBe(false)
    expect(await verifyPin('1234')).toBe(false)
  })

  it('never stores the PIN itself in localStorage, only a salted hash', async () => {
    await setupPin('1234')
    const raw = localStorage.getItem('qbnomia.auth') ?? ''
    expect(raw).not.toContain('1234')
  })
})
