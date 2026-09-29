import { BookOpen, Headphones, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const items = [
  { to: '/', label: '听写', icon: Headphones },
  { to: '/library', label: '词库', icon: BookOpen },
  { to: '/settings', label: '设置', icon: Settings },
]

export function BottomNav() {
  const { pathname } = useLocation()
  const listeningRoutes = ['/', '/add', '/dictation', '/review']

  return (
    <nav className="bottom-nav" aria-label="主导航">
      {items.map(({ to, label, icon: Icon }) => {
        const isActive = to === '/'
          ? listeningRoutes.includes(pathname)
          : pathname === to

        return (
        <Link
          key={to}
          to={to}
          className={`bottom-nav__item${isActive ? ' is-active' : ''}`}
          aria-current={isActive ? 'page' : undefined}
        >
          <span className="bottom-nav__icon-wrap">
            <Icon size={23} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span>{label}</span>
        </Link>
      )})}
    </nav>
  )
}
