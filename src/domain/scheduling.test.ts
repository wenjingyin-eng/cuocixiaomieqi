import { describe, expect, it } from 'vitest'
import { calculateNextReviewDate } from './scheduling'

const reviewIntervals = [1, 3, 7, 15, 30] as [number, number, number, number, number]

describe('calculateNextReviewDate', () => {
  it('按 cycleStartDate 计算第 1/3/7 天，而不是从每次复习日累加', () => {
    expect(calculateNextReviewDate({
      cycleStartDate: '2026-09-01',
      reviewStage: 0,
      reviewIntervals,
      today: '2026-09-01',
    })).toBe('2026-09-02')

    expect(calculateNextReviewDate({
      cycleStartDate: '2026-09-01',
      reviewStage: 2,
      reviewIntervals,
      today: '2026-09-04',
    })).toBe('2026-09-08')
  })

  it('原 cycle 日期已经到期或过期时返回明天', () => {
    expect(calculateNextReviewDate({
      cycleStartDate: '2026-09-01',
      reviewStage: 1,
      reviewIntervals,
      today: '2026-09-06',
    })).toBe('2026-09-07')
  })

  it('拒绝超出五个间隔的 stage', () => {
    expect(() => calculateNextReviewDate({
      cycleStartDate: '2026-09-01',
      reviewStage: 5,
      reviewIntervals,
      today: '2026-09-01',
    })).toThrow('无效的复习阶段')
  })
})
