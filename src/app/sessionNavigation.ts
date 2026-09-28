const SESSION_ROUTES = new Set(['/dictation', '/review'])

export function shouldBlockSessionNavigation(
  hasActiveSession: boolean,
  currentPathname: string,
  nextPathname: string,
): boolean {
  return hasActiveSession
    && SESSION_ROUTES.has(currentPathname)
    && !SESSION_ROUTES.has(nextPathname)
}
