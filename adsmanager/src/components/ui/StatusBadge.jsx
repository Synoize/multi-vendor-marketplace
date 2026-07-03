const STATUS_CONFIG = {
  active: {
    label: 'Active',
    classes: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  paused: {
    label: 'Paused',
    classes: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
  exhausted: {
    label: 'Exhausted',
    classes: 'bg-red-500/15 text-red-400 border border-red-500/30',
    dot: 'bg-red-400',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-red-600/15 text-red-500 border border-red-600/30',
    dot: 'bg-red-500',
  },
  pending: {
    label: 'Pending',
    classes: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    dot: 'bg-blue-400',
  },
  scheduled: {
    label: 'Scheduled',
    classes: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    dot: 'bg-purple-400',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
    dot: 'bg-gray-400',
  },
  draft: {
    label: 'Draft',
    classes: 'bg-gray-700/50 text-gray-400 border border-gray-600/30',
    dot: 'bg-gray-500',
  },
}

function StatusBadge({ status, showDot = true, size = 'sm' }) {
  const config = STATUS_CONFIG[status?.toLowerCase()] || {
    label: status || 'Unknown',
    classes: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
    dot: 'bg-gray-400',
  }

  const sizes = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap ${config.classes} ${sizes[size] || sizes.sm}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'active' ? 'animate-pulse' : ''}`}
        />
      )}
      {config.label}
    </span>
  )
}

export default StatusBadge
