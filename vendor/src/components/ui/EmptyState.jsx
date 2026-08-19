import React from "react";
import { PackageOpen } from "lucide-react";

export default function EmptyState({
  icon = PackageOpen,
  title = "Nothing here yet",
  description = "There is no data to display at the moment.",
  ctaLabel,
  onCta,
}) {
  const Icon = React.isValidElement(icon) ? null : icon
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
        {Icon ? (
          <Icon strokeWidth={1} className="w-10 h-10 text-secondary-800" />
        ) : (
          icon
        )}
      </div>
      <h3 className="text-lg font-medium text-secondary-950 mb-2">{title}</h3>
      <p className="text-sm text-secondary-800 max-w-sm mb-6">{description}</p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-opacity-90 text-white text-xs rounded-xl transition-colors duration-200"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
