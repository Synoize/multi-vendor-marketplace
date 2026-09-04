function Spinner({ size = 'sm', color = 'primary' }) {
  const sizes = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-6 h-6 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
    xl: 'w-16 h-16 border-4',
  }

  const colors = {
    primary: 'border-primary/20 border-t-primary',
    blue: 'border-blue-500/20 border-t-blue-500',
    white: 'border-white/20 border-t-white',
    gray: 'border-secondary-300 border-t-secondary-800',
  }

  return (
    <div
      className={`rounded-full animate-spin ${sizes[size] || sizes.sm} ${colors[color] || colors.primary}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export default Spinner