import { describe, expect, it } from 'vitest'
import { createDefaultSettings, validateSettings } from './settings'

describe('默认设置', () => {
  it('使用单次 Session 20 词、连对 3 次和 1/3/7/15/30 天间隔', () => {
    expect(createDefaultSettings()).toEqual({
      sessionMax: 20,
      eliminationTarget: 3,
      reviewIntervals: [1, 3, 7, 15, 30],
    })
  })

  it('每次返回独立的间隔数组', () => {
    const first = createDefaultSettings()
    const second = createDefaultSettings()
    first.reviewIntervals[0] = 2
    expect(second.reviewIntervals).toEqual([1, 3, 7, 15, 30])
  })
})

describe('设置校验', () => {
  it('拒绝非正整数与超过 5 次的消灭目标', () => {
    const errors = validateSettings({
      sessionMax: 0,
      eliminationTarget: 6,
      reviewIntervals: [1, 3, 7, 15, 30],
    })
    expect(errors).toHaveLength(2)
  })

  it('拒绝超过 100 个词的单次听写上限', () => {
    const errors = validateSettings({
      sessionMax: 101,
      eliminationTarget: 3,
      reviewIntervals: [1, 3, 7, 15, 30],
    })
    expect(errors).toContain('sessionMax 必须是 1 到 100 之间的整数')
  })

  it('拒绝非严格递增的复习间隔', () => {
    const errors = validateSettings({
      sessionMax: 20,
      eliminationTarget: 3,
      reviewIntervals: [1, 3, 3, 15, 30],
    })
    expect(errors).toContain('reviewIntervals 必须严格递增')
  })
})
