import { useCallback, useEffect } from 'react'
import {
  useBeforeUnload,
  useBlocker,
  type BlockerFunction,
} from 'react-router-dom'
import { useAppState } from './AppState'
import { shouldBlockSessionNavigation } from './sessionNavigation'

const EXIT_MESSAGE = '本次听写还没有提交，退出后本次结果不会保存，是否退出？'

export function SessionNavigationGuard() {
  const { currentSession, abandonCurrentSession } = useAppState()
  const hasActiveSession = currentSession !== null
  const shouldBlock = useCallback<BlockerFunction>(({ currentLocation, nextLocation }) => (
    shouldBlockSessionNavigation(
      hasActiveSession,
      currentLocation.pathname,
      nextLocation.pathname,
    )
  ), [hasActiveSession])
  const blocker = useBlocker(shouldBlock)

  useBeforeUnload(useCallback((event) => {
    if (!hasActiveSession) return
    event.preventDefault()
    event.returnValue = ''
  }, [hasActiveSession]))

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm(EXIT_MESSAGE)) {
      abandonCurrentSession()
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [abandonCurrentSession, blocker])

  return null
}
