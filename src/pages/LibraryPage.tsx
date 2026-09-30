import { useMemo, useState } from 'react'
import { useAppState } from '../app/AppState'
import { SurfaceCard } from '../components/SurfaceCard'
import type { LocalDate, TermRecord } from '../types/domain'

const tabs = ['全部', '学习中', '已消灭'] as const
type LibraryTab = typeof tabs[number]

function formatDate(date: LocalDate | null): string {
  if (!date) return ''
  const [, month, day] = date.split('-').map(Number)
  return `${month} 月 ${day} 日`
}

function sortTerms(left: TermRecord, right: TermRecord): number {
  if (left.status !== right.status) return left.status === 'active' ? -1 : 1
  if (left.nextReviewDate && right.nextReviewDate) {
    const dateOrder = left.nextReviewDate.localeCompare(right.nextReviewDate)
    if (dateOrder !== 0) return dateOrder
  }
  return left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
}

export function LibraryPage() {
  const { terms, reactivate, deleteTerm } = useAppState()
  const [activeTab, setActiveTab] = useState<LibraryTab>(tabs[0])
  const frequentWords = useMemo(() => [...terms]
    .filter((term) => term.wholeTermWrongCount > 0)
    .sort((left, right) => (
      right.wholeTermWrongCount - left.wholeTermWrongCount
      || left.createdAt.localeCompare(right.createdAt)
      || left.id.localeCompare(right.id)
    ))
    .slice(0, 3), [terms])
  const frequentCharacters = useMemo(() => {
    const characters = new Map<string, { count: number; terms: Set<string> }>()
    terms.forEach((term) => {
      Object.entries(term.wrongChars).forEach(([character, record]) => {
        const current = characters.get(character) ?? { count: 0, terms: new Set<string>() }
        current.count += record.count
        current.terms.add(term.text)
        characters.set(character, current)
      })
    })
    return [...characters.entries()]
      .sort(([leftCharacter, left], [rightCharacter, right]) => (
        right.count - left.count || leftCharacter.localeCompare(rightCharacter, 'zh-CN')
      ))
      .slice(0, 3)
  }, [terms])
  const visibleTerms = useMemo(() => terms
    .filter((term) => (
      activeTab === '全部'
      || (activeTab === '学习中' && term.status === 'active')
      || (activeTab === '已消灭' && term.status === 'eliminated')
    ))
    .sort(sortTerms), [activeTab, terms])
  const listTitle = activeTab === '全部' ? '全部错词' : activeTab
  const showInsights = activeTab === '全部' && terms.length > 0

  function handleDelete(term: TermRecord): void {
    if (!window.confirm(`确定要删除“${term.text}”吗？`)) return
    if (!window.confirm(`请再次确认：将同时删除“${term.text}”的复习记录，且无法撤销。`)) return
    deleteTerm(term.id)
  }

  return (
    <div className="primary-page library-page page-enter">
      <header className="primary-title">
        <h1>词库</h1>
        <p><span className="section-dot section-dot--orange" /><strong>{terms.length}</strong> 个错词</p>
      </header>

      <div className="library-tabs" role="tablist" aria-label="错词状态">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab ? 'is-active' : ''}
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={`library-layout${showInsights ? ' has-insights' : ''}`}>
        {showInsights && (
          <aside className="library-insights" aria-label="错词统计">
            <SurfaceCard className="insight-card frequent-word-card">
              <h2><span className="section-dot section-dot--orange" />高频错词</h2>
              <div className="insight-list">
                {frequentWords.map((term, index) => (
                  <div className="rank-row" key={term.id}>
                    <span className={`rank rank--${index + 1}`}>{index + 1}</span>
                    <span>{term.text}</span>
                    <strong>{term.wholeTermWrongCount} 次</strong>
                  </div>
                ))}
                {frequentWords.length === 0 && <p className="insight-empty">暂无错误记录</p>}
              </div>
            </SurfaceCard>

            <SurfaceCard className="insight-card frequent-character-card">
              <h2><span className="section-dot section-dot--blue" />高频错字</h2>
              <div className="insight-list">
                {frequentCharacters.map(([character, stat]) => (
                  <div className="character-stat-row" key={character}>
                    <strong>{character}</strong>
                    <span>衍生词：{[...stat.terms].join('、')}</span>
                    <b>{stat.count} 次</b>
                  </div>
                ))}
                {frequentCharacters.length === 0 && <p className="insight-empty">暂无错字记录</p>}
              </div>
            </SurfaceCard>
          </aside>
        )}

        <section
          className={`all-words${activeTab === '全部' ? '' : ' all-words--filtered'}`}
          aria-labelledby="all-words-title"
        >
          <div className="all-words__heading">
            <h2 id="all-words-title"><span className="section-dot section-dot--green" />{listTitle}</h2>
            <span>按复习时间排序</span>
          </div>
          <div className="all-words__list">
            {visibleTerms.map((term) => (
              <article className={term.status === 'eliminated' ? 'is-mastered' : ''} key={term.id}>
                <strong>{term.text}</strong>
                <span>{term.status === 'eliminated' ? '已消灭' : `连对 ${term.consecutiveCorrect} 次`}</span>
                <span className="term-row-meta">
                  {term.status === 'eliminated' ? (
                    <button className="text-action" type="button" onClick={() => reactivate(term.id)}>重新入库</button>
                  ) : (
                    <span>{formatDate(term.nextReviewDate)}</span>
                  )}
                  <button className="text-action" type="button" onClick={() => handleDelete(term)}>删除</button>
                </span>
              </article>
            ))}
            {visibleTerms.length === 0 && (
              <p className="page-empty">
                {terms.length === 0 ? <>还没有错词<br />先录入一个最近写错的词吧</> : '当前筛选下没有错词'}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
