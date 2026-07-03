import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function MetricCard({ label, value, change, changeLabel, icon: Icon, iconBg, prefix = '', suffix = '', loading = false }) {
  const isPositive = change > 0
  const isNeutral = change === 0 || change === undefined || change === null

  return (
    <div className="glass-card p-5 flex flex-col gap-4 hover:border-white/20 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</span>
          {loading ? (
            <div className="skeleton h-8 w-32 mt-1" />
          ) : (
            <span className="text-2xl font-bold text-white">
              {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}{suffix}
            </span>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg || 'bg-[#FB641B]/10'}`}>
            <Icon className={`w-5 h-5 ${iconBg ? 'text-white' : 'text-[#FB641B]'}`} />
          </div>
        )}
      </div>

      {!loading && change !== undefined && change !== null && (
        <div className="flex items-center gap-2">
          {isNeutral ? (
            <span className="flex items-center gap-1 text-gray-400 text-xs font-medium">
              <Minus className="w-3 h-3" />
              0%
            </span>
          ) : isPositive ? (
            <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
              <TrendingUp className="w-3 h-3" />
              +{Math.abs(change).toFixed(1)}%
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
              <TrendingDown className="w-3 h-3" />
              -{Math.abs(change).toFixed(1)}%
            </span>
          )}
          {changeLabel && (
            <span className="text-gray-500 text-xs">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default MetricCard
