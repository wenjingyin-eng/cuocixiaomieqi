import { ArrowLeft, CircleHelp } from 'lucide-react'
import { Link } from 'react-router-dom'

type PageHeaderProps = {
  backTo?: string
  showHelp?: boolean
}

export function PageHeader({ backTo = '/', showHelp = false }: PageHeaderProps) {
  return (
    <header className="page-header">
      <Link className="page-header__action" to={backTo} aria-label="返回">
        <ArrowLeft size={24} strokeWidth={2.2} aria-hidden="true" />
      </Link>
      {showHelp && (
        <button className="page-header__action" type="button" aria-label="帮助">
          <CircleHelp size={21} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}
    </header>
  )
}
