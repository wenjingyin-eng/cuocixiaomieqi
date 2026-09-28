import { describe, expect, it } from 'vitest'
import { shouldBlockSessionNavigation } from './sessionNavigation'

describe('shouldBlockSessionNavigation', () => {
  it('有未提交 Session 时阻止离开听写流程', () => {
    expect(shouldBlockSessionNavigation(true, '/dictation', '/')).toBe(true)
    expect(shouldBlockSessionNavigation(true, '/review', '/library')).toBe(true)
    expect(shouldBlockSessionNavigation(true, '/review', '/settings')).toBe(true)
  })

  it('允许听写与核对页面之间切换', () => {
    expect(shouldBlockSessionNavigation(true, '/dictation', '/review')).toBe(false)
    expect(shouldBlockSessionNavigation(true, '/review', '/dictation')).toBe(false)
  })

  it('没有 Session 时不阻止导航', () => {
    expect(shouldBlockSessionNavigation(false, '/dictation', '/')).toBe(false)
  })
})
