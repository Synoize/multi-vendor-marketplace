import React from 'react'
import { PackageOpen } from 'lucide-react'

export default function EmptyState({
  icon = <PackageOpen className="w-10 h-10 text-gray-400" />,
  title = 'Nothing here yet',
  description = 'There is no data to display at the moment.',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm">{description}</p>
    </div>
  )
}
