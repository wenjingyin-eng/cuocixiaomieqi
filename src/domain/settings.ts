import type { AppSettings } from '../types/domain'

export const DEFAULT_APP_SETTINGS: Readonly<AppSettings> = Object.freeze({
  sessionMax: 20,
  eliminationTarget: 3,
  reviewIntervals: Object.freeze([1, 3, 7, 15, 30]) as unknown as AppSettings['reviewIntervals'],
})

export function createDefaultSettings(): AppSettings {
  return {
    sessionMax: DEFAULT_APP_SETTINGS.sessionMax,
    eliminationTarget: DEFAULT_APP_SETTINGS.eliminationTarget,
    reviewIntervals: [...DEFAULT_APP_SETTINGS.reviewIntervals],
  }
}

export function validateSettings(settings: AppSettings): string[] {
  const errors: string[] = []

  if (
    !Number.isInteger(settings.sessionMax)
    || settings.sessionMax <= 0
    || settings.sessionMax > 100
  ) {
    errors.push('sessionMax 必须是 1 到 100 之间的整数')
  }

  if (
    !Number.isInteger(settings.eliminationTarget)
    || settings.eliminationTarget <= 0
    || settings.eliminationTarget > 5
  ) {
    errors.push('eliminationTarget 必须是 1 到 5 之间的整数')
  }

  if (settings.reviewIntervals.length !== 5) {
    errors.push('reviewIntervals 必须包含 5 个间隔')
  }

  settings.reviewIntervals.forEach((interval, index) => {
    if (!Number.isInteger(interval) || interval <= 0) {
      errors.push(`reviewIntervals[${index}] 必须是正整数`)
    }

    if (index > 0 && interval <= settings.reviewIntervals[index - 1]) {
      errors.push('reviewIntervals 必须严格递增')
    }
  })

  return [...new Set(errors)]
}

export function assertValidSettings(settings: AppSettings): void {
  const errors = validateSettings(settings)

  if (errors.length > 0) {
    throw new Error(errors.join('；'))
  }
}
