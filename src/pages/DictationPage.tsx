import { Play } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../app/AppState'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { SurfaceCard } from '../components/SurfaceCard'
import { getVoiceId, resolveVoice } from '../tts/speechService'
import { useSpeechSynthesis } from '../tts/useSpeechSynthesis'

export function DictationPage() {
  const navigate = useNavigate()
  const {
    currentSession,
    currentDictationIndex,
    setCurrentDictationIndex,
    settings,
    saveSettings,
    terms,
  } = useAppState()
  const { voices, isReady, error: speechError, speak } = useSpeechSynthesis()
  const autoPlayedTermRef = useRef<string | null>(null)
  const total = currentSession?.termIds.length ?? 0
  const currentTermId = currentSession?.termIds[currentDictationIndex]
  const currentTerm = terms.find((term) => term.id === currentTermId)
  const selectedVoice = resolveVoice(voices, settings.preferredVoiceId)

  useEffect(() => {
    if (!currentSession || !currentTerm || !selectedVoice || !isReady) return
    const termKey = `${currentSession.id}:${currentDictationIndex}`
    if (autoPlayedTermRef.current === termKey) return
    if (speak(currentTerm.text, 3, getVoiceId(selectedVoice))) {
      autoPlayedTermRef.current = termKey
    }
    return () => {
      autoPlayedTermRef.current = null
    }
  }, [
    currentDictationIndex,
    currentSession,
    currentTerm,
    isReady,
    selectedVoice,
    speak,
  ])

  function handleNext(): void {
    if (!currentSession) return
    if (currentDictationIndex < total - 1) {
      setCurrentDictationIndex(currentDictationIndex + 1)
      return
    }
    navigate('/review')
  }

  function handlePlay(): void {
    if (!currentTerm || !selectedVoice) return
    speak(currentTerm.text, 3, getVoiceId(selectedVoice))
  }

  function handleVoiceSelect(voice: SpeechSynthesisVoice): void {
    const voiceId = getVoiceId(voice)
    saveSettings({ ...settings, preferredVoiceId: voiceId })
    if (currentTerm) speak(currentTerm.text, 1, voiceId)
  }

  if (!currentSession) {
    return (
      <div className="secondary-page page-enter">
        <PageHeader />
        <div className="secondary-content dictation-page">
          <header className="secondary-title">
            <h1>今日听写</h1>
            <p>当前没有进行中的听写</p>
          </header>
          <Button fullWidth onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="secondary-page page-enter">
      <PageHeader />
      <div className="secondary-content dictation-page">
        <div className="dictation-title-row">
          <h1>今日听写</h1>
          <p>第 <strong>{currentDictationIndex + 1}</strong> / <strong>{total}</strong> 个</p>
        </div>
        <p className="dictation-subtitle">每个词自动连续播放 3 遍</p>
        {speechError && <p className="dictation-audio-error" role="status">{speechError}</p>}

        <SurfaceCard className="listen-card">
          <div className="listen-orbit">
            <button
              className="play-button"
              type="button"
              aria-label="播放当前词语三遍"
              disabled={!selectedVoice}
              onClick={handlePlay}
            >
              <Play size={36} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard className="voice-card">
          <span>发音人</span>
          <div className="voice-options" aria-label="发音人">
            {!isReady && <span className="voice-options__empty">正在加载…</span>}
            {isReady && voices.length === 0 && (
              <span className="voice-options__empty">当前设备没有可用的中文语音</span>
            )}
            {isReady && voices.length > 0 && selectedVoice && (
              <select
                value={getVoiceId(selectedVoice)}
                aria-label="选择并试听发音人"
                onChange={(event) => {
                  const voice = voices.find((item) => getVoiceId(item) === event.target.value)
                  if (voice) handleVoiceSelect(voice)
                }}
              >
                {voices.map((voice) => (
                  <option key={getVoiceId(voice)} value={getVoiceId(voice)}>
                    {voice.name}（{voice.lang}）
                  </option>
                ))}
              </select>
            )}
          </div>
        </SurfaceCard>

        <Button fullWidth onClick={handleNext}>
          {currentDictationIndex === total - 1 ? '开始核对' : '下一个'}
        </Button>
      </div>
    </div>
  )
}
