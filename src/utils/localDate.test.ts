import { describe, expect, it } from 'vitest'
import { addLocalDays, isLocalDate, parseLocalDate, toLocalDate } from './localDate'

describe('本地 YYYY-MM-DD 工具', () => {
  it('格式化本地日历日期', () => {
    expect(toLocalDate(new Date(2026, 8, 28, 23, 30))).toBe('2026-09-28')
  })

  it('可跨月加天数', () => {
    expect(addLocalDays('2026-09-30', 1)).toBe('2026-10-01')
  })

  it('正确处理闰年', () => {
    expect(addLocalDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addLocalDays('2028-02-29', 1)).toBe('2028-03-01')
  })

  it('拒绝不存在的日期', () => {
    expect(isLocalDate('2026-02-29')).toBe(false)
    expect(() => parseLocalDate('2026-02-29')).toThrow('无效的本地日期')
  })
})
