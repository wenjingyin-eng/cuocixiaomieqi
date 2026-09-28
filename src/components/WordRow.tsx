import { X } from 'lucide-react'

export type WordRowState = 'neutral' | 'correct' | 'wrong'

type WordRowProps = {
  word: string
  markedIndices?: number[]
  state?: WordRowState
  showStatus?: boolean
  showCharacters?: boolean
  onToggleCharacter?: (index: number) => void
  onToggleState?: () => void
}

export function WordRow({
  word,
  markedIndices = [],
  state = 'neutral',
  showStatus = false,
  showCharacters = true,
  onToggleCharacter,
  onToggleState,
}: WordRowProps) {
  const StatusElement = onToggleState ? 'button' : 'span'

  return (
    <article className={`word-row word-row--${state}`}>
      {showStatus && (
        <StatusElement
          className="word-row__status"
          aria-label={state === 'wrong' ? `将${word}改为正确` : `将${word}标为错误`}
          onClick={onToggleState}
          type={onToggleState ? 'button' : undefined}
        >
          <X size={19} strokeWidth={2.4} />
        </StatusElement>
      )}
      <span className="word-row__word">{word}</span>
      {showCharacters && <div className="character-chips" aria-label={`${word}的单字`}>
        {[...word].map((character, index) => (
          onToggleCharacter ? (
            <button
              className={`character-chip${markedIndices.includes(index) ? ' is-marked' : ''}`}
              key={`${character}-${index}`}
              type="button"
              aria-pressed={markedIndices.includes(index)}
              aria-label={`${character}字${markedIndices.includes(index) ? '已标记错误' : '标记为错误'}`}
              onClick={() => onToggleCharacter(index)}
            >
              {character}
            </button>
          ) : (
            <span
              className={`character-chip${markedIndices.includes(index) ? ' is-marked' : ''}`}
              key={`${character}-${index}`}
            >
              {character}
            </span>
          )
        ))}
      </div>}
    </article>
  )
}
