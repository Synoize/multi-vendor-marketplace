import React from 'react'
import { PackageOpen } from 'lucide-react'

export default function EmptyState({
  icon: Icon = PackageOpen,
  title = 'Nothing here yet',
  description = 'There is no data to display at the moment.',
  ctaLabel,
  onCta,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2874F0] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors duration-200"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
