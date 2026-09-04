const STATUS_CONFIG = {
  active: {
    label: 'Active',
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500',
  },
  paused: {
    label: 'Paused',
    classes: 'bg-amber-50 text-amber-700 border border-amber-200',
    dot: 'bg-amber-500',
  },
  exhausted: {
    label: 'Exhausted',
    classes: 'bg-red-50 text-red-700 border border-red-200',
    dot: 'bg-red-500',
  },
  rejected: {
    label: 'Rejected',
    classes: 'bg-red-50 text-red-700 border border-red-200',
    dot: 'bg-red-600',
  },
  pending: {
    label: 'Pending',
    classes: 'bg-blue-50 text-blue-700 border border-blue-200',
    dot: 'bg-blue-500',
  },
  scheduled: {
    label: 'Scheduled',
    classes: 'bg-purple-50 text-purple-700 border border-purple-200',
    dot: 'bg-purple-500',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-gray-100 text-gray-700 border border-gray-200',
    dot: 'bg-gray-500',
  },
  draft: {
    label: 'Draft',
    classes: 'bg-gray-100 text-gray-600 border border-gray-300',
    dot: 'bg-gray-500',
  },
}

function StatusBadge({ status, showDot = true, size = 'sm' }) {
  const config = STATUS_CONFIG[status?.toLowerCase()] || {
    label: status || 'Unknown',
    classes: 'bg-gray-100 text-gray-700 border border-gray-200',
    dot: 'bg-gray-500',
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