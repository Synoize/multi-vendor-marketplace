export default function StatCard({ title, value, icon: Icon, color = 'blue', change, subtitle, loading = false }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-500/10',
      icon: 'text-blue-400',
      border: 'border-blue-500/20',
    },
    orange: {
      bg: 'bg-orange-500/10',
      icon: 'text-orange-400',
      border: 'border-orange-500/20',
    },
    green: {
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-400',
      border: 'border-emerald-500/20',
    },
    purple: {
      bg: 'bg-purple-500/10',
      icon: 'text-purple-400',
      border: 'border-purple-500/20',
    },
    pink: {
      bg: 'bg-pink-500/10',
      icon: 'text-pink-400',
      border: 'border-pink-500/20',
    },
    yellow: {
      bg: 'bg-yellow-500/10',
      icon: 'text-yellow-400',
      border: 'border-yellow-500/20',
    },
    red: {
      bg: 'bg-red-500/10',
      icon: 'text-red-400',
      border: 'border-red-500/20',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      icon: 'text-cyan-400',
      border: 'border-cyan-500/20',
    },
  };

  const colors = colorMap[color] || colorMap.blue;

  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-3 bg-white/5 rounded w-24" />
            <div className="h-8 bg-white/5 rounded w-32" />
            <div className="h-3 bg-white/5 rounded w-20" />
          </div>
          <div className="w-12 h-12 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card p-6 border ${colors.border} hover:bg-white/5 transition-all duration-300 group`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-white truncate animate-count-up">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`text-xs font-semibold ${
                  Number(change) >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {Number(change) >= 0 ? '▲' : '▼'} {Math.abs(change)}%
              </span>
              <span className="text-xs text-gray-500">vs last month</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`${colors.bg} p-3 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-6 h-6 ${colors.icon}`} />
          </div>
        )}
      </div>
    </div>
  );
}
