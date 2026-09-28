import { useRef, useState, type ChangeEvent } from 'react'
import { useAppState } from '../app/AppState'
import {
  createBackupFileName,
  downloadBackupFile,
  parseBackup,
} from '../backup/backupService'
import { Button } from '../components/Button'
import { SurfaceCard } from '../components/SurfaceCard'
import { todayLocalDate, validateSettings } from '../domain'
import type { AppSettings, ReviewIntervals } from '../types/domain'

export function SettingsPage() {
  const {
    settings,
    saveSettings,
    clearLearningData,
    storageError,
    createBackup,
    restoreBackup,
  } = useAppState()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<AppSettings>(() => ({
    ...settings,
    reviewIntervals: [...settings.reviewIntervals],
  }))
  const [message, setMessage] = useState('')

  function updateInterval(index: number, value: number): void {
    setDraft((current) => {
      const reviewIntervals = [...current.reviewIntervals] as ReviewIntervals
      reviewIntervals[index] = value

      for (let nextIndex = index + 1; nextIndex < reviewIntervals.length; nextIndex += 1) {
        if (reviewIntervals[nextIndex] <= reviewIntervals[nextIndex - 1]) {
          reviewIntervals[nextIndex] = reviewIntervals[nextIndex - 1] + 1
        }
      }

      return { ...current, reviewIntervals }
    })
    setMessage('')
  }

  function handleSave(): void {
    const errors = validateSettings(draft)
    if (errors.length > 0) {
      setMessage(errors.join('；'))
      return
    }
    saveSettings(draft)
    setMessage('设置已保存，将从下一次相关计算开始生效。')
  }

  function handleClear(): void {
    if (!window.confirm('确定要清空全部学习数据吗？此操作无法撤销。')) return
    if (!window.confirm('请再次确认：将清空所有错词、复习记录和听写记录，但保留当前设置。')) return
    clearLearningData()
    setMessage('学习数据已清空，设置已保留。')
  }

  function handleExport(): void {
    try {
      const payload = createBackup()
      downloadBackupFile(payload, createBackupFileName(todayLocalDate()))
      setMessage('备份已导出。')
    } catch {
      setMessage('导出备份失败，请稍后重试。')
    }
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return

    try {
      const payload = parseBackup(await file.text())
      const confirmed = window.confirm('导入会覆盖当前所有学习数据，是否继续？')
      if (!confirmed) return
      restoreBackup(payload)
      setDraft({ ...payload.settings, reviewIntervals: [...payload.settings.reviewIntervals] })
      setMessage('备份导入成功，当前学习数据已恢复。')
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : '无法识别这个备份文件')
    } finally {
      input.value = ''
    }
  }

  return (
    <div className="primary-page settings-page page-enter">
      <header className="primary-title settings-title">
        <h1>设置</h1>
      </header>

      {storageError && (
        <p className="storage-warning" role="alert">
          本地数据暂时无法读取或保存。为避免覆盖原数据，已暂停自动保存；可通过“清空全部数据”重新建立存储。
        </p>
      )}

      <section className="settings-section" aria-labelledby="rules-title">
        <h2 id="rules-title">学习规则</h2>
        <SurfaceCard className="rules-card">
          <label>
            <span>每次听写最多</span>
            <span className="number-control">
              <input
                type="number"
                min="1"
                value={draft.sessionMax}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, sessionMax: Number(event.target.value) }))
                  setMessage('')
                }}
                aria-label="每次听写最多词数"
              />
              <span>个词</span>
            </span>
          </label>
          <label>
            <span>连续答对</span>
            <span className="number-control number-control--green">
              <input
                type="number"
                min="1"
                max="5"
                value={draft.eliminationTarget}
                onChange={(event) => {
                  const nextTarget = Math.max(1, Math.min(5, Number(event.target.value)))
                  setDraft((current) => ({ ...current, eliminationTarget: nextTarget }))
                  setMessage('')
                }}
                aria-label="连续答对次数"
              />
              <span>次消灭</span>
            </span>
          </label>
        </SurfaceCard>
      </section>

      <section className="settings-section" aria-labelledby="interval-title">
        <h2 id="interval-title">复习间隔（天）</h2>
        <SurfaceCard className="interval-card">
          <div className="interval-options">
            {draft.reviewIntervals.map((interval, index) => (
              <input
                type="number"
                min="1"
                key={index}
                value={interval}
                disabled={index >= draft.eliminationTarget}
                aria-label={`第 ${index + 1} 个复习间隔`}
                onChange={(event) => updateInterval(index, Number(event.target.value))}
              />
            ))}
          </div>
          <p>当前使用前 {draft.eliminationTarget} 个间隔；启用项需为严格递增的正整数</p>
        </SurfaceCard>
      </section>

      {message && <p className="form-message settings-message" role="status">{message}</p>}
      <Button className="save-settings" fullWidth onClick={handleSave}>保存设置</Button>

      <section className="settings-section data-section" aria-labelledby="data-title">
        <h2 id="data-title">数据</h2>
        <div className="data-actions">
          <button className="outline-action outline-action--blue" type="button" onClick={handleExport}>导出备份</button>
          <button className="outline-action" type="button" onClick={() => importInputRef.current?.click()}>导入备份</button>
          <input
            ref={importInputRef}
            hidden
            type="file"
            accept=".json,application/json"
            aria-label="选择备份文件"
            onChange={handleImport}
          />
        </div>
      </section>

      <section className="settings-section danger-section" aria-labelledby="danger-title">
        <h2 id="danger-title">危险操作</h2>
        <button className="danger-action" type="button" onClick={handleClear}>
          <strong>清空全部数据</strong>
          <span>需要两次确认</span>
        </button>
      </section>
    </div>
  )
}
