import React from 'react'

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4',
}

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div
      className={`inline-block rounded-full border-blue-600 border-t-transparent animate-spin ${sizeMap[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
