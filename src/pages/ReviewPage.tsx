import { useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../app/AppState'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { SurfaceCard } from '../components/SurfaceCard'
import { WordRow } from '../components/WordRow'
import type { DictationResult } from '../types/domain'

export function ReviewPage() {
  const navigate = useNavigate()
  const { currentSession, terms, submitCurrentSession } = useAppState()
  const [wrongByTerm, setWrongByTerm] = useState<Record<string, number[] | undefined>>({})
  const [isConfirming, setIsConfirming] = useState(false)
  const [message, setMessage] = useState('')
  const sessionTerms = useMemo(() => (
    currentSession?.termIds
      .map((termId) => terms.find((term) => term.id === termId))
      .filter((term) => term !== undefined) ?? []
  ), [currentSession, terms])
  const wrongTerms = sessionTerms.filter((term) => wrongByTerm[term.id] !== undefined)

  function toggleState(termId: string): void {
    setMessage('')
    setIsConfirming(false)
    setWrongByTerm((current) => {
      const next = { ...current }
      if (next[termId] === undefined) next[termId] = []
      else delete next[termId]
      return next
    })
  }

  function toggleCharacter(termId: string, index: number): void {
    setMessage('')
    setIsConfirming(false)
    setWrongByTerm((current) => {
      const positions = current[termId] ?? []
      return {
        ...current,
        [termId]: positions.includes(index)
          ? positions.filter((position) => position !== index)
          : [...positions, index].sort((left, right) => left - right),
      }
    })
  }

  function prepareConfirmation(): void {
    const incomplete = wrongTerms.find((term) => wrongByTerm[term.id]?.length === 0)
    if (incomplete) {
      setMessage(`请标记“${incomplete.text}”中写错的字。`)
      return
    }
    setMessage('')
    setIsConfirming(true)
  }

  function handleSubmit(): void {
    if (!currentSession) return
    const results: DictationResult[] = sessionTerms.map((term) => ({
      termId: term.id,
      correct: wrongByTerm[term.id] === undefined,
      wrongCharPositions: wrongByTerm[term.id] ?? [],
    }))
    flushSync(() => submitCurrentSession(results))
    navigate('/')
  }

  if (!currentSession) {
    return (
      <div className="secondary-page page-enter">
        <PageHeader />
        <div className="secondary-content review-page">
          <header className="secondary-title"><h1>核对答案</h1><p>当前没有待核对的听写</p></header>
          <Button fullWidth onClick={() => navigate('/')}>返回首页</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="secondary-page page-enter">
      <PageHeader backTo="/dictation" />
      <div className="secondary-content review-page">
        <header className="secondary-title review-title">
          <h1>核对答案</h1>
          <p>点击左侧状态标记写错的词，再选择具体错字</p>
        </header>

        <div className="word-row-list review-list">
          {sessionTerms.map((term) => {
            const isWrong = wrongByTerm[term.id] !== undefined
            return (
              <WordRow
                key={term.id}
                word={term.text}
                markedIndices={wrongByTerm[term.id]}
                state={isWrong ? 'wrong' : 'correct'}
                showStatus
                showCharacters={isWrong}
                onToggleState={() => toggleState(term.id)}
                onToggleCharacter={(index) => toggleCharacter(term.id, index)}
              />
            )
          })}
        </div>

        <SurfaceCard className="review-summary">
          <div>
            <strong>本次 {sessionTerms.length} 个词</strong>
            <strong>标记错误 {wrongTerms.length} 个</strong>
          </div>
          <p>
            {wrongTerms.length === 0 && <span>未标记错误，全部视为正确</span>}
            {wrongTerms.map((term) => (
              <span key={term.id}>
                {term.text}：{(wrongByTerm[term.id] ?? []).map((index) => [...term.text][index]).join('、') || '未选错字'}
              </span>
            ))}
          </p>
        </SurfaceCard>

        {message && <p className="form-message" role="alert">{message}</p>}
        {isConfirming ? (
          <div className="review-confirm-actions">
            <Button fullWidth variant="secondary" onClick={() => setIsConfirming(false)}>返回修改</Button>
            <Button fullWidth onClick={handleSubmit}>确认提交</Button>
          </div>
        ) : (
          <Button fullWidth onClick={prepareConfirmation}>确认本次结果</Button>
        )}
      </div>
    </div>
  )
}
