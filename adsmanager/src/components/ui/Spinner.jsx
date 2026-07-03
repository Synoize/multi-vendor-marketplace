function Spinner({ size = 'sm', color = 'orange' }) {
  const sizes = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-6 h-6 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
    xl: 'w-16 h-16 border-4',
  }

  const colors = {
    orange: 'border-[#FB641B]/20 border-t-[#FB641B]',
    blue: 'border-blue-500/20 border-t-blue-500',
    white: 'border-white/20 border-t-white',
    gray: 'border-gray-600/40 border-t-gray-400',
  }

  return (
    <div
      className={`rounded-full animate-spin ${sizes[size] || sizes.sm} ${colors[color] || colors.orange}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export default Spinner
