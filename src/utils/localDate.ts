import type { LocalDate } from '../types/domain'

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function isLocalDate(value: string): value is LocalDate {
  const match = LOCAL_DATE_PATTERN.exec(value)

  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day, 12)

  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day
}

export function assertLocalDate(value: string): asserts value is LocalDate {
  if (!isLocalDate(value)) {
    throw new Error(`无效的本地日期: ${value}`)
  }
}

export function toLocalDate(date: Date): LocalDate {
  if (Number.isNaN(date.getTime())) {
    throw new Error('无法从无效 Date 生成本地日期')
  }

  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}` as LocalDate
}

export function todayLocalDate(now = new Date()): LocalDate {
  return toLocalDate(now)
}

export function parseLocalDate(value: LocalDate): Date {
  assertLocalDate(value)
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function addLocalDays(value: LocalDate, days: number): LocalDate {
  if (!Number.isInteger(days)) {
    throw new Error('days 必须是整数')
  }

  const date = parseLocalDate(value)
  date.setDate(date.getDate() + days)
  return toLocalDate(date)
}

export function compareLocalDates(left: LocalDate, right: LocalDate): number {
  assertLocalDate(left)
  assertLocalDate(right)
  return left.localeCompare(right)
}

export function localDateFromTimestamp(timestamp: string): LocalDate {
  if (isLocalDate(timestamp)) return timestamp

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`无效的时间戳: ${timestamp}`)
  }

  return toLocalDate(date)
}
