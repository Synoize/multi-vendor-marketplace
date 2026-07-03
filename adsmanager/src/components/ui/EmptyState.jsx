import React from 'react'
import { FolderOpen } from 'lucide-react'

export default function EmptyState({
  icon = <FolderOpen className="w-10 h-10 text-orange-400" />,
  title = 'No records found',
  description = 'There is no data to show right now.',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-1.5">{title}</h3>
      <p className="text-xs text-gray-500 max-w-xs">{description}</p>
    </div>
  )
}
