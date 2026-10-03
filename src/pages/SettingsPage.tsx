import { useRef, useState, type ChangeEvent } from 'react'
import { useAppState } from '../app/AppState'
import {
  createBackupFileName,
  downloadBackupFile,
  parseBackup,
} from '../backup/backupService'
import { Button } from '../components/Button'
import { SurfaceCard } from '../components/SurfaceCard'
import { validateSettings } from '../domain'
import { resolveVoice } from '../tts/speechService'
import { useSpeechSynthesis } from '../tts/useSpeechSynthesis'
import { getToday } from '../utils/dateClock'
import type { AppSettings, ReviewIntervals } from '../types/domain'

type SettingsFormState = {
  sessionMax: string
  eliminationTarget: string
  reviewIntervals: [string, string, string, string, string]
}

function createSettingsForm(settings: AppSettings): SettingsFormState {
  return {
    sessionMax: String(settings.sessionMax),
    eliminationTarget: String(settings.eliminationTarget),
    reviewIntervals: settings.reviewIntervals.map(String) as SettingsFormState['reviewIntervals'],
  }
}

function buildSettings(form: SettingsFormState, preferredVoiceId?: string): AppSettings {
  return {
    sessionMax: Number(form.sessionMax),
    eliminationTarget: Number(form.eliminationTarget),
    reviewIntervals: form.reviewIntervals.map(Number) as ReviewIntervals,
    ...(preferredVoiceId ? { preferredVoiceId } : {}),
  }
}

function settingsAreEqual(left: AppSettings, right: AppSettings): boolean {
  return left.sessionMax === right.sessionMax
    && left.eliminationTarget === right.eliminationTarget
    && left.preferredVoiceId === right.preferredVoiceId
    && left.reviewIntervals.every((interval, index) => interval === right.reviewIntervals[index])
}

export function SettingsPage() {
  const {
    settings,
    saveSettings,
    clearLearningData,
    storageError,
    createBackup,
    restoreBackup,
  } = useAppState()
  const { allVoices, voices: availableVoices, isReady: voicesReady } = useSpeechSynthesis()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<SettingsFormState>(() => createSettingsForm(settings))
  const [message, setMessage] = useState('')
  const draft = buildSettings(form, settings.preferredVoiceId)
  const hasChanges = !settingsAreEqual(draft, settings)
  const activeIntervalCount = Number.isInteger(draft.eliminationTarget)
    && draft.eliminationTarget >= 1
    && draft.eliminationTarget <= 5
    ? draft.eliminationTarget
    : 0
  const selectedVoice = resolveVoice(availableVoices, settings.preferredVoiceId)

  function updateInterval(index: number, value: string): void {
    setForm((current) => {
      const reviewIntervals = [...current.reviewIntervals] as SettingsFormState['reviewIntervals']
      reviewIntervals[index] = value
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
    setForm(createSettingsForm(draft))
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
      downloadBackupFile(payload, createBackupFileName(getToday()))
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
      setForm(createSettingsForm(payload.settings))
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
                max="100"
                value={form.sessionMax}
                onChange={(event) => {
                  setForm((current) => ({ ...current, sessionMax: event.target.value }))
                  setMessage('')
                }}
                aria-label="每次听写最多词语数"
              />
              <span>个词语</span>
            </span>
          </label>
          <label>
            <span>连续答对</span>
            <span className="number-control number-control--green">
              <input
                type="number"
                min="1"
                max="5"
                value={form.eliminationTarget}
                onChange={(event) => {
                  setForm((current) => ({ ...current, eliminationTarget: event.target.value }))
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
            {form.reviewIntervals.map((interval, index) => (
              <input
                type="number"
                min="1"
                key={index}
                value={interval}
                disabled={index >= activeIntervalCount}
                aria-label={`第 ${index + 1} 个复习间隔`}
                onChange={(event) => updateInterval(index, event.target.value)}
              />
            ))}
          </div>
          <p>当前使用前 {activeIntervalCount || '—'} 个间隔；启用项需为严格递增的正整数</p>
        </SurfaceCard>
      </section>

      {message && <p className="form-message settings-message" role="status">{message}</p>}
      <Button className="save-settings" fullWidth disabled={!hasChanges} onClick={handleSave}>保存设置</Button>

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
        </button>
      </section>

      <section className="settings-section tts-diagnostics" aria-labelledby="tts-diagnostics-title">
        <h2 id="tts-diagnostics-title">TTS 语音诊断（临时）</h2>
        <SurfaceCard className="tts-diagnostics-card">
          <div className="tts-selected-voice">
            <h3>当前实际选中的 voice</h3>
            {!voicesReady && <p>正在读取设备语音…</p>}
            {voicesReady && !selectedVoice && <p className="tts-no-voice">当前设备没有合适的中文语音</p>}
            {selectedVoice && (
              <dl className="tts-voice-fields">
                <div><dt>name</dt><dd>{selectedVoice.name}</dd></div>
                <div><dt>lang</dt><dd>{selectedVoice.lang}</dd></div>
                <div><dt>voiceURI</dt><dd>{selectedVoice.voiceURI || '（空）'}</dd></div>
                <div><dt>default</dt><dd>{String(selectedVoice.default)}</dd></div>
                <div><dt>localService</dt><dd>{String(selectedVoice.localService)}</dd></div>
              </dl>
            )}
          </div>

          <div className="tts-all-voices">
            <h3>speechSynthesis.getVoices()：{allVoices.length} 个</h3>
            {voicesReady && allVoices.length === 0 && <p>设备暂未返回任何 voice</p>}
            {allVoices.map((voice, index) => (
              <article className="tts-voice-record" key={`${voice.voiceURI}:${index}`}>
                <strong>Voice {index + 1}</strong>
                <dl className="tts-voice-fields">
                  <div><dt>name</dt><dd>{voice.name}</dd></div>
                  <div><dt>lang</dt><dd>{voice.lang}</dd></div>
                  <div><dt>voiceURI</dt><dd>{voice.voiceURI || '（空）'}</dd></div>
                  <div><dt>default</dt><dd>{String(voice.default)}</dd></div>
                  <div><dt>localService</dt><dd>{String(voice.localService)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </SurfaceCard>
      </section>

    </div>
  )
}
