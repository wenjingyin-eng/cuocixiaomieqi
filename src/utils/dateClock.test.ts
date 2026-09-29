import { describe, expect, it } from 'vitest'
import { getRealTimestamp, getToday } from './dateClock'

describe('业务时钟', () => {
  it('统一返回设备当地日期和实际时间戳', () => {
    const now = new Date(2026, 8, 29, 9, 30)
    expect(getToday(now)).toBe('2026-09-29')
    expect(getRealTimestamp(now)).toBe(now.toISOString())
  })
})
