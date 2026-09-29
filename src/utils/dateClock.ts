import type { LocalDate } from '../types/domain'
import { todayLocalDate } from './localDate'

/** The single clock entry point for all scheduling decisions. */
export function getToday(now = new Date()): LocalDate {
  return todayLocalDate(now)
}

export function getRealTimestamp(now = new Date()): string {
  return now.toISOString()
}
