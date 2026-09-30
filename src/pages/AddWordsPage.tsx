import { Archive } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAppState } from '../app/AppState'
import { Button } from '../components/Button'
import { PageHeader } from '../components/PageHeader'
import { WordRow } from '../components/WordRow'
import { parseTermInput } from '../domain'

export function AddWordsPage() {
  const { terms, addMistakes } = useAppState()
  const [input, setInput] = useState('')
  const [markedByWord, setMarkedByWord] = useState<Record<string, number[]>>({})
  const [message, setMessage] = useState('')
  const words = useMemo(() => parseTermInput(input), [input])
  const canSubmit = words.length > 0

  function toggleCharacter(word: string, index: number): void {
    setMessage('')
    setMarkedByWord((current) => {
      const positions = current[word] ?? []
      const nextPositions = positions.includes(index)
        ? positions.filter((position) => position !== index)
        : [...positions, index].sort((left, right) => left - right)
      return { ...current, [word]: nextPositions }
    })
  }

  function handleSubmit(): void {
    setMessage('')
    if (words.length === 0) {
      setMessage('请先输入至少一个错词。')
      return
    }

    const eliminatedWords = words.filter((word) => (
      terms.some((term) => term.text === word && term.status === 'eliminated')
    ))
    if (
      eliminatedWords.length > 0
      && !window.confirm(`“${eliminatedWords.join('、')}”已经被消灭，是否重新入库？`)
    ) return

    addMistakes(words.map((word) => ({
      text: word,
      wrongCharPositions: markedByWord[word] ?? [],
    })))
    setInput('')
    setMarkedByWord({})
    setMessage(`已将 ${words.length} 个错词加入错词库，明天开始复习。`)
  }

  return (
    <div className="secondary-page page-enter">
      <PageHeader />
      <div className="secondary-content add-page">
        <header className="secondary-title">
          <h1>录入错词</h1>
          <p>可用空格、换行或标点分隔多个词语</p>
        </header>

        <textarea
          className="word-input"
          value={input}
          onChange={(event) => {
            setInput(event.target.value)
            setMessage('')
          }}
          placeholder="例如：旅行，已经；尤其，突然"
          aria-label="输入错词"
        />

        <section className="recognized-section" aria-labelledby="recognized-title">
          <div className="recognized-heading">
            <h2 id="recognized-title"><span className="section-dot section-dot--blue" />已识别 {words.length} 个词</h2>
            <p>点击字块可标记具体错字（选填）</p>
          </div>
          <div className="word-row-list">
            {words.map((word) => (
              <WordRow
                key={word}
                word={word}
                markedIndices={markedByWord[word]}
                onToggleCharacter={(index) => toggleCharacter(word, index)}
              />
            ))}
            {words.length === 0 && <p className="page-empty">输入后将在这里显示识别结果</p>}
          </div>
        </section>

        {message && <p className="form-message" role="status">{message}</p>}

        <Button
          className="add-submit"
          fullWidth
          icon={<Archive size={21} strokeWidth={2.4} aria-hidden="true" />}
          iconPosition="start"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          加入错词库
        </Button>
      </div>
    </div>
  )
}
