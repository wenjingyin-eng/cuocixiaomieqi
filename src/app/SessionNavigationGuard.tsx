import { useCallback, useEffect, useRef } from 'react'
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
  const isConfirmingRef = useRef(false)

  useBeforeUnload(useCallback((event) => {
    if (!hasActiveSession) return
    event.preventDefault()
    event.returnValue = ''
  }, [hasActiveSession]))

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      isConfirmingRef.current = false
      return
    }
    if (isConfirmingRef.current) return
    isConfirmingRef.current = true

    if (window.confirm(EXIT_MESSAGE)) {
      blocker.proceed()
      abandonCurrentSession()
    } else {
      blocker.reset()
    }
  }, [abandonCurrentSession, blocker])

  return null
}
