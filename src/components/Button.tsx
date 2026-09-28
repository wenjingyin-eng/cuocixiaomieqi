import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode
  fullWidth?: boolean
  variant?: 'primary' | 'secondary'
  iconPosition?: 'start' | 'end'
}

export function Button({
  icon,
  fullWidth,
  variant = 'primary',
  iconPosition = 'end',
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`button button--${variant} ${fullWidth ? 'button--full' : ''} ${className}`.trim()}
      type={type}
      {...props}
    >
      {iconPosition === 'start' && icon}
      <span>{children}</span>
      {iconPosition === 'end' && icon}
    </button>
  )
}
