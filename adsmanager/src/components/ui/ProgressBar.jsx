function ProgressBar({ value = 0, max = 100, label, showPercentage = true, size = 'md', color = 'primary' }) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0

  const heights = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }

  const colors = {
    primary: {
      bg: 'bg-primary/15',
      fill: 'bg-gradient-to-r from-primary to-primary-600',
    },
    blue: {
      bg: 'bg-blue-500/15',
      fill: 'bg-gradient-to-r from-blue-500 to-blue-400',
    },
    green: {
      bg: 'bg-emerald-500/15',
      fill: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    },
    red: {
      bg: 'bg-red-500/15',
      fill: 'bg-gradient-to-r from-red-500 to-red-400',
    },
  }

  const scheme = colors[color] || colors.primary
  const danger = percentage >= 90

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs text-secondary-800">{label}</span>}
          {showPercentage && (
            <span className={`text-xs font-medium ${danger ? 'text-red-500' : 'text-secondary-900'}`}>
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full rounded-full overflow-hidden ${heights[size] || heights.md} ${danger ? 'bg-red-500/15' : scheme.bg}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${danger ? 'bg-gradient-to-r from-red-500 to-red-400' : scheme.fill}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressBar