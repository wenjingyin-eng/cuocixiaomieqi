import { CURRENT_SCHEMA_VERSION } from '../domain/constants'
import { migrateAppData } from '../storage/storageService'
import type {
  AppSettings,
  BackupPayload,
  DictationSession,
  LocalDate,
  ReviewEvent,
  TermRecord,
} from '../types/domain'

type BackupSource = {
  settings: AppSettings
  terms: TermRecord[]
  reviewEvents: ReviewEvent[]
  sessions: DictationSession[]
}

export function createBackupPayload(
  source: BackupSource,
  exportedAt = new Date().toISOString(),
): BackupPayload {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt,
    settings: {
      ...source.settings,
      reviewIntervals: [...source.settings.reviewIntervals],
    },
    terms: source.terms.map((term) => ({
      ...term,
      wrongChars: Object.fromEntries(
        Object.entries(term.wrongChars).map(([character, record]) => [
          character,
          { count: record.count, positions: [...record.positions] },
        ]),
      ),
    })),
    reviewEvents: source.reviewEvents.map((event) => ({
      ...event,
      wrongCharPositions: [...event.wrongCharPositions],
      wrongChars: [...event.wrongChars],
    })),
    sessions: source.sessions.map((session) => ({
      ...session,
      termIds: [...session.termIds],
      results: session.results.map((result) => ({
        ...result,
        wrongCharPositions: [...result.wrongCharPositions],
      })),
    })),
  }
}

export function serializeBackup(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2)
}

export function parseBackup(content: string): BackupPayload {
  try {
    return migrateAppData(JSON.parse(content) as unknown)
  } catch {
    throw new Error('无法识别这个备份文件')
  }
}

export function createBackupFileName(date: LocalDate): string {
  return `cuozi-backup-${date}.json`
}

export function downloadBackupFile(payload: BackupPayload, fileName: string): void {
  const blob = new Blob([serializeBackup(payload)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
