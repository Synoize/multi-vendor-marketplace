import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  iconBg = "bg-blue-100",
  iconColor = "text-blue-600",
  prefix = "",
  suffix = "",
  loading = false,
}) {
  const trendIsPositive = trend > 0;
  const trendIsNeutral = trend === 0 || trend === undefined || trend === null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5 flex flex-col sm:gap-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-secondary-800 uppercase tracking-wide">
          {label}
        </p>
        {Icon && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-8 w-24 bg-secondary animate-pulse rounded-md" />
      ) : (
        <p className="text-lg sm:text-2xl font-semibold text-secondary-900">
          {prefix}
          {value}
          {suffix}
        </p>
      )}

      {!trendIsNeutral && !loading && (
        <div className="flex items-center gap-1.5">
          {trendIsPositive ? (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span
            className={`text-sm font-semibold ${
              trendIsPositive ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {trendIsPositive ? "+" : ""}
            {trend}%
          </span>
          {trendLabel && (
            <span className="text-sm text-secondary-700">{trendLabel}</span>
          )}
        </div>
      )}

      {trendIsNeutral && trendLabel && !loading && (
        <div className="flex items-center gap-1.5">
          <Minus className="w-4 h-4 text-secondary-700" />
          <span className="text-xs text-secondary-700">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
