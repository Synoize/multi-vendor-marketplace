import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function MetricCard({ label, value, change, changeLabel, icon: Icon, iconBg, prefix = '', suffix = '', loading = false }) {
  const isPositive = change > 0
  const isNeutral = change === 0 || change === undefined || change === null

  return (
    <div className="glass-card p-5 flex flex-col gap-4 hover:border-secondary-400 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-secondary-800 uppercase tracking-wider">{label}</span>
          {loading ? (
            <div className="skeleton h-8 w-32 mt-1" />
          ) : (
            <span className="text-2xl font-bold text-secondary-950">
              {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}{suffix}
            </span>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg || 'bg-primary/10'}`}>
            <Icon className={`w-5 h-5 ${iconBg ? 'text-secondary-950' : 'text-primary'}`} />
          </div>
        )}
      </div>

      {!loading && change !== undefined && change !== null && (
        <div className="flex items-center gap-2">
          {isNeutral ? (
            <span className="flex items-center gap-1 text-secondary-800 text-xs font-medium">
              <Minus className="w-3 h-3" />
              0%
            </span>
          ) : isPositive ? (
            <span className="flex items-center gap-1 text-success text-xs font-medium">
              <TrendingUp className="w-3 h-3" />
              +{Math.abs(change).toFixed(1)}%
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
              <TrendingDown className="w-3 h-3" />
              -{Math.abs(change).toFixed(1)}%
            </span>
          )}
          {changeLabel && (
            <span className="text-secondary-700 text-xs">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default MetricCard