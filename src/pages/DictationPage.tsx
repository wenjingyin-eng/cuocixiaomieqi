import { Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../app/AppState'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { SurfaceCard } from '../components/SurfaceCard'
import { resolveVoice } from '../tts/speechService'
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
    if (speak(currentTerm.text, 3, selectedVoice.voiceURI)) {
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

  function handleReplay(): void {
    if (!currentTerm || !selectedVoice) return
    speak(currentTerm.text, 1, selectedVoice.voiceURI)
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
          <button
            className="replay-button"
            type="button"
            aria-label="再听一次"
            disabled={!selectedVoice}
            onClick={handleReplay}
          >
            <RotateCcw size={21} strokeWidth={2.1} />
          </button>
          <div className="listen-orbit">
            <span className="listen-hint">听清楚后写在纸上</span>
            <button
              className="play-button"
              type="button"
              aria-label="再听一次"
              disabled={!selectedVoice}
              onClick={handleReplay}
            >
              <Play size={36} fill="currentColor" strokeWidth={0} aria-hidden="true" />
              <span>再听一次</span>
            </button>
          </div>
        </SurfaceCard>

        <SurfaceCard className="voice-card">
          <span>发音人</span>
          <div className="voice-options" aria-label="发音人">
            {!isReady && <span className="voice-options__empty">正在加载…</span>}
            {isReady && voices.length === 0 && <span className="voice-options__empty">暂无中文声音</span>}
            {voices.map((voice, index) => (
              <button
                className={selectedVoice?.voiceURI === voice.voiceURI ? 'is-active' : ''}
                key={voice.voiceURI}
                type="button"
                title={`${voice.name}（${voice.lang}）`}
                aria-label={`选择声音 ${index + 1}：${voice.name}`}
                onClick={() => saveSettings({ ...settings, preferredVoiceId: voice.voiceURI })}
              >
                声音{index + 1}
              </button>
            ))}
          </div>
        </SurfaceCard>

        <Button fullWidth onClick={handleNext}>
          {currentDictationIndex === total - 1 ? '开始核对' : '下一个'}
        </Button>
      </div>
    </div>
  )
}
