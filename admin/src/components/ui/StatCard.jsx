export default function StatCard({
  title,
  value,
  icon: Icon,
  color = "blue",
  change,
  subtitle,
  loading = false,
}) {
  const colorMap = {
    blue: {
      bg: "bg-blue-50",
      icon: "text-blue-600",
      border: "border-blue-100",
    },
    orange: {
      bg: "bg-orange-50",
      icon: "text-orange-600",
      border: "border-orange-100",
    },
    green: {
      bg: "bg-emerald-50",
      icon: "text-emerald-600",
      border: "border-emerald-100",
    },
    purple: {
      bg: "bg-purple-50",
      icon: "text-purple-600",
      border: "border-purple-100",
    },
    pink: {
      bg: "bg-pink-50",
      icon: "text-pink-600",
      border: "border-pink-100",
    },
    yellow: {
      bg: "bg-amber-50",
      icon: "text-amber-600",
      border: "border-amber-100",
    },
    red: {
      bg: "bg-red-50",
      icon: "text-red-600",
      border: "border-red-100",
    },
    cyan: {
      bg: "bg-cyan-50",
      icon: "text-cyan-600",
      border: "border-cyan-100",
    },
  };

  const colors = colorMap[color] || colorMap.blue;

  if (loading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="h-3 bg-gray-100 rounded w-24" />
            <div className="h-8 bg-gray-100 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-6 rounded-2xl border ${colors.border} bg-white transition-all duration-300 group`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 truncate animate-count-up">
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`text-xs font-semibold ${
                  Number(change) >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {Number(change) >= 0 ? "▲" : "▼"} {Math.abs(change)}%
              </span>
              <span className="text-xs text-gray-500">vs last month</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={`${colors.bg} p-3 rounded-xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className={`w-6 h-6 ${colors.icon} stroke-[1.5]`} />
          </div>
        )}
      </div>
    </div>
  );
}
