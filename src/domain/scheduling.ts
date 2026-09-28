import type { LocalDate, ReviewIntervals } from '../types/domain'
import { addLocalDays, compareLocalDates } from '../utils/localDate'

type CalculateNextReviewDateInput = {
  cycleStartDate: LocalDate
  reviewStage: number
  reviewIntervals: ReviewIntervals
  today: LocalDate
}

export function calculateNextReviewDate({
  cycleStartDate,
  reviewStage,
  reviewIntervals,
  today,
}: CalculateNextReviewDateInput): LocalDate {
  if (!Number.isInteger(reviewStage) || reviewStage < 0 || reviewStage >= reviewIntervals.length) {
    throw new Error(`无效的复习阶段: ${reviewStage}`)
  }

  const scheduledDate = addLocalDays(cycleStartDate, reviewIntervals[reviewStage])

  if (compareLocalDates(scheduledDate, today) <= 0) {
    return addLocalDays(today, 1)
  }

  return scheduledDate
}
