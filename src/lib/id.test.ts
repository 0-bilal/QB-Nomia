import { describe, expect, it } from 'vitest'
import { makeId } from './id'

describe('makeId', () => {
  it('generates a non-empty string', () => {
    expect(makeId().length).toBeGreaterThan(0)
  })

  it('generates unique ids across calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => makeId()))
    expect(ids.size).toBe(200)
  })
})
