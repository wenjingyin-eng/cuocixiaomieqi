import { createDefaultSettings, validateSettings } from '../domain/settings'
import { CURRENT_SCHEMA_VERSION } from '../domain/constants'
import type {
  AppSettings,
  BackupPayload,
  DictationResult,
  DictationSession,
  LocalDate,
  ReviewEvent,
  TermRecord,
  WrongCharacterRecord,
} from '../types/domain'

export { CURRENT_SCHEMA_VERSION }
export const APP_STORAGE_KEY = 'cuozi-eliminator:data'

export type PersistedAppData = BackupPayload

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export type LoadAppDataResult =
  | { status: 'empty'; data: PersistedAppData }
  | { status: 'loaded'; data: PersistedAppData }
  | { status: 'error'; data: PersistedAppData; error: Error }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isNonNegativeIntegerArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNonNegativeInteger)
}

function isLocalDate(value: unknown): value is LocalDate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isSettings(value: unknown): value is AppSettings {
  if (!isRecord(value)) return false
  const candidate = value as unknown as AppSettings
  return isPositiveInteger(value.sessionMax)
    && isPositiveInteger(value.eliminationTarget)
    && Array.isArray(value.reviewIntervals)
    && value.reviewIntervals.length === 5
    && value.reviewIntervals.every(isPositiveInteger)
    && (value.preferredVoiceId === undefined || typeof value.preferredVoiceId === 'string')
    && validateSettings(candidate).length === 0
}

function isWrongCharacterRecord(value: unknown): value is WrongCharacterRecord {
  return isRecord(value)
    && isNonNegativeInteger(value.count)
    && isNonNegativeIntegerArray(value.positions)
}

function isTermRecord(value: unknown): value is TermRecord {
  if (!isRecord(value) || !isRecord(value.wrongChars)) return false
  return typeof value.id === 'string'
    && typeof value.text === 'string'
    && (value.status === 'active' || value.status === 'eliminated')
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && isNonNegativeInteger(value.consecutiveCorrect)
    && isNonNegativeInteger(value.reviewStage)
    && isLocalDate(value.cycleStartDate)
    && (value.nextReviewDate === null || isLocalDate(value.nextReviewDate))
    && isNonNegativeInteger(value.wholeTermWrongCount)
    && Object.values(value.wrongChars).every(isWrongCharacterRecord)
}

function isReviewEvent(value: unknown): value is ReviewEvent {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.termId === 'string'
    && isLocalDate(value.date)
    && ['initial_entry', 'manual_reentry', 'dictation'].includes(String(value.source))
    && (value.result === 'correct' || value.result === 'wrong')
    && isNonNegativeIntegerArray(value.wrongCharPositions)
    && isStringArray(value.wrongChars)
}

function isDictationResult(value: unknown): value is DictationResult {
  return isRecord(value)
    && typeof value.termId === 'string'
    && typeof value.correct === 'boolean'
    && isNonNegativeIntegerArray(value.wrongCharPositions)
}

function isDictationSession(value: unknown): value is DictationSession {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.startedAt === 'string'
    && (value.submittedAt === null || typeof value.submittedAt === 'string')
    && isStringArray(value.termIds)
    && Array.isArray(value.results)
    && value.results.every(isDictationResult)
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (
    !isRecord(value)
    || value.schemaVersion !== CURRENT_SCHEMA_VERSION
    || typeof value.exportedAt !== 'string'
    || !isSettings(value.settings)
    || !Array.isArray(value.terms)
    || !value.terms.every(isTermRecord)
    || !Array.isArray(value.reviewEvents)
    || !value.reviewEvents.every(isReviewEvent)
    || !Array.isArray(value.sessions)
    || !value.sessions.every(isDictationSession)
  ) return false

  const payload = value as unknown as BackupPayload
  const termIds = new Set(payload.terms.map((term) => term.id))
  const termTexts = new Set(payload.terms.map((term) => term.text))
  const eventIds = new Set(payload.reviewEvents.map((event) => event.id))
  const sessionIds = new Set(payload.sessions.map((session) => session.id))

  if (termIds.size !== payload.terms.length || termTexts.size !== payload.terms.length) return false
  if (eventIds.size !== payload.reviewEvents.length) return false
  if (sessionIds.size !== payload.sessions.length) return false
  if (payload.reviewEvents.some((event) => !termIds.has(event.termId))) return false

  return payload.sessions.every((session) => {
    const sessionTermIds = new Set(session.termIds)
    const resultTermIds = new Set(session.results.map((result) => result.termId))
    if (sessionTermIds.size !== session.termIds.length) return false
    if (session.termIds.some((termId) => !termIds.has(termId))) return false
    if (session.results.some((result) => !sessionTermIds.has(result.termId))) return false
    if (resultTermIds.size !== session.results.length) return false
    if (session.submittedAt !== null && session.results.length !== session.termIds.length) return false

    return session.results.every((result) => (
      result.correct ? result.wrongCharPositions.length === 0 : result.wrongCharPositions.length > 0
    ))
  })
}

export function createEmptyAppData(now = new Date().toISOString()): PersistedAppData {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now,
    settings: createDefaultSettings(),
    terms: [],
    reviewEvents: [],
    sessions: [],
  }
}

export function migrateAppData(value: unknown): PersistedAppData {
  if (!isRecord(value) || typeof value.schemaVersion !== 'number') {
    throw new Error('本地数据缺少有效的 schemaVersion')
  }

  if (value.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(`本地数据版本 ${value.schemaVersion} 高于当前支持版本`)
  }

  // V1 是首个持久化版本。未来版本迁移在这里逐级追加。
  if (value.schemaVersion !== CURRENT_SCHEMA_VERSION || !isBackupPayload(value)) {
    throw new Error('本地数据格式无效')
  }

  return value
}

export function loadAppData(storage?: StorageLike): LoadAppDataResult {
  const fallback = createEmptyAppData()
  if (!storage) return { status: 'empty', data: fallback }

  try {
    const raw = storage.getItem(APP_STORAGE_KEY)
    if (raw === null) return { status: 'empty', data: fallback }
    return { status: 'loaded', data: migrateAppData(JSON.parse(raw) as unknown) }
  } catch (cause) {
    const error = cause instanceof Error ? cause : new Error('读取本地数据失败')
    return { status: 'error', data: fallback, error }
  }
}

export function saveAppData(
  storage: StorageLike | undefined,
  data: Omit<PersistedAppData, 'schemaVersion' | 'exportedAt'>,
  now = new Date().toISOString(),
): PersistedAppData {
  const payload: PersistedAppData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now,
    settings: { ...data.settings, reviewIntervals: [...data.settings.reviewIntervals] },
    terms: data.terms,
    reviewEvents: data.reviewEvents,
    sessions: data.sessions,
  }

  if (storage) storage.setItem(APP_STORAGE_KEY, JSON.stringify(payload))
  return payload
}

export function getBrowserStorage(): StorageLike | undefined {
  if (typeof window === 'undefined') return undefined
  return window.localStorage
}
