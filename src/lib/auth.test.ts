import { describe, expect, it } from 'vitest'
import { FREE_PIN_ATTEMPTS, configuredDigits, hasPinConfigured, lockoutDurationMs, pinLockoutRemainingMs, resetPin, setupPin, verifyPin } from './auth'

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

describe('wrong-PIN cooldown', () => {
  const T0 = 1_000_000

  async function failTimes(n: number, now = T0) {
    for (let i = 0; i < n; i++) await verifyPin('0000', now)
  }

  it('allows the first few wrong attempts without any wait', async () => {
    await setupPin('1234')
    await failTimes(FREE_PIN_ATTEMPTS - 1)
    expect(pinLockoutRemainingMs(T0)).toBe(0)
    expect(await verifyPin('1234', T0)).toBe(true)
  })

  it('locks for 30 seconds after the 5th wrong attempt, even for the correct PIN', async () => {
    await setupPin('1234')
    await failTimes(FREE_PIN_ATTEMPTS)
    expect(pinLockoutRemainingMs(T0)).toBe(30_000)
    expect(await verifyPin('1234', T0 + 29_000)).toBe(false)
    expect(await verifyPin('1234', T0 + 30_000)).toBe(true)
  })

  it('doubles the wait with each further failure, capped at 15 minutes', () => {
    expect(lockoutDurationMs(4)).toBe(0)
    expect(lockoutDurationMs(5)).toBe(30_000)
    expect(lockoutDurationMs(6)).toBe(60_000)
    expect(lockoutDurationMs(7)).toBe(120_000)
    expect(lockoutDurationMs(50)).toBe(15 * 60_000)
  })

  it('attempts during the wait do not extend or count', async () => {
    await setupPin('1234')
    await failTimes(FREE_PIN_ATTEMPTS)
    await verifyPin('0000', T0 + 1000)
    expect(pinLockoutRemainingMs(T0 + 1000)).toBe(29_000)
  })

  it('a correct PIN clears the failure count', async () => {
    await setupPin('1234')
    await failTimes(FREE_PIN_ATTEMPTS - 1)
    expect(await verifyPin('1234', T0)).toBe(true)
    await failTimes(FREE_PIN_ATTEMPTS - 1)
    expect(pinLockoutRemainingMs(T0)).toBe(0)
  })

  it('resetPin clears the cooldown too', async () => {
    await setupPin('1234')
    await failTimes(FREE_PIN_ATTEMPTS)
    resetPin()
    expect(pinLockoutRemainingMs(T0)).toBe(0)
  })
})
