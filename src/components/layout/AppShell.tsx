import { Outlet } from 'react-router-dom'
import { SessionNavigationGuard } from '../../app/SessionNavigationGuard'
import { BottomNav } from '../navigation/BottomNav'

export function AppShell() {
  return (
    <div className="app-shell">
      <SessionNavigationGuard />
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
