import { describe, expect, it } from 'vitest'
import { getHideBalancesDefault, setHideBalancesDefault } from './privacy'

describe('getHideBalancesDefault / setHideBalancesDefault', () => {
  it('defaults to hidden (true) when nothing is stored yet', () => {
    expect(getHideBalancesDefault()).toBe(true)
  })

  it('persists an explicit "show balances" choice', () => {
    setHideBalancesDefault(false)
    expect(getHideBalancesDefault()).toBe(false)
  })

  it('persists an explicit "hide balances" choice', () => {
    setHideBalancesDefault(false)
    setHideBalancesDefault(true)
    expect(getHideBalancesDefault()).toBe(true)
  })
})
