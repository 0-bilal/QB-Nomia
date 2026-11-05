import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { useSyncConflict } from './useSyncConflict'
import { clearConflict, setConflict } from '../lib/syncConflict'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Probe() {
  const conflict = useSyncConflict()
  return <span>{conflict ? 'conflict' : 'none'}</span>
}

describe('useSyncConflict', () => {
  // سباق «التعارض انكشف قبل الاشتراك» ما يتكرر بثبات داخل act — تحققنا منه في المتصفح (Playwright).
  it('يعرض التعارض لحظة تسجيله، ويختفي لحظة حله', () => {
    const el = document.createElement('div')
    const root = createRoot(el)
    act(() => {
      root.render(<Probe />)
      setConflict(null)
    })
    expect(el.textContent).toBe('conflict')
    act(() => clearConflict())
    expect(el.textContent).toBe('none')
    act(() => root.unmount())
  })
})
