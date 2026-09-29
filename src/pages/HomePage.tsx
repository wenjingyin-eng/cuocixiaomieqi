import { Button } from '../components/Button'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../app/AppState'
import { getTodayQueue } from '../domain'

export function HomePage() {
  const navigate = useNavigate()
  const { terms, reviewEvents, sessions, startSession, today } = useAppState()
  const reviewCount = getTodayQueue({ terms, reviewEvents, sessions, today }).length
  const masteredCount = terms.filter((term) => term.status === 'eliminated').length
  const totalCount = terms.length
  const progress = totalCount === 0 ? 0 : (masteredCount / totalCount) * 100

  function handleStart(): void {
    const session = startSession()
    if (session) navigate('/dictation')
  }

  return (
    <div className="home-page page-enter">
      <header className="home-header">
        <h1>错字消灭器</h1>
        <p>把写错的字，一点点消灭掉</p>
      </header>

      <section className="summary-card" aria-labelledby="today-title">
        <div className="summary-card__count">
          <p id="today-title">今日待听写</p>
          <div><strong>{reviewCount}</strong><span>个词</span></div>
        </div>

        <div className="summary-card__divider" />

        <div className="summary-card__progress">
          <div className="progress-heading">
            <span>消灭进度</span>
            <span><strong>{masteredCount}</strong> / {totalCount}</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="消灭进度"
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-valuenow={masteredCount}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <section className="home-actions" aria-label="错词操作">
        <Button fullWidth disabled={reviewCount === 0} onClick={handleStart}>开始听写</Button>
        <Button fullWidth variant="secondary" onClick={() => navigate('/add')}>录入错词</Button>
      </section>

      <p className="home-tip">
        {reviewCount === 0 ? '今天没有需要复习的错词' : '每天只复习到期的错词'}
      </p>
    </div>
  )
}
