import React from 'react'

const statusConfig = {
  // Order statuses
  placed: { label: 'Placed', classes: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmed', classes: 'bg-indigo-100 text-indigo-700' },
  processing: { label: 'Processing', classes: 'bg-yellow-100 text-yellow-700' },
  shipped: { label: 'Shipped', classes: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Delivered', classes: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-100 text-red-700' },
  returned: { label: 'Returned', classes: 'bg-orange-100 text-orange-700' },
  refunded: { label: 'Refunded', classes: 'bg-teal-100 text-teal-700' },

  // KYC / verification statuses
  pending: { label: 'Pending', classes: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Approved', classes: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-700' },
  verified: { label: 'Verified', classes: 'bg-emerald-100 text-emerald-700' },

  // Product statuses
  active: { label: 'Active', classes: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: 'Inactive', classes: 'bg-gray-100 text-gray-600' },
  draft: { label: 'Draft', classes: 'bg-slate-100 text-slate-600' },
  out_of_stock: { label: 'Out of Stock', classes: 'bg-red-100 text-red-700' },
  blocked: { label: 'Blocked', classes: 'bg-red-100 text-red-700' },

  // Ad / campaign statuses
  running: { label: 'Running', classes: 'bg-emerald-100 text-emerald-700' },
  paused: { label: 'Paused', classes: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Completed', classes: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Scheduled', classes: 'bg-blue-100 text-blue-700' },

  // Payout statuses
  paid: { label: 'Paid', classes: 'bg-emerald-100 text-emerald-700' },
  failed: { label: 'Failed', classes: 'bg-red-100 text-red-700' },
  processing_payout: { label: 'Processing', classes: 'bg-yellow-100 text-yellow-700' },

  // Return statuses
  requested: { label: 'Requested', classes: 'bg-blue-100 text-blue-700' },
  approved_return: { label: 'Approved', classes: 'bg-emerald-100 text-emerald-700' },
  rejected_return: { label: 'Rejected', classes: 'bg-red-100 text-red-700' },
  resolved: { label: 'Resolved', classes: 'bg-teal-100 text-teal-700' },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const key = (status || '').toString().toLowerCase().replace(/ /g, '_')
  const config = statusConfig[key] || {
    label: status || 'Unknown',
    classes: 'bg-gray-100 text-gray-600',
  }

  const sizeClasses = size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1'

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold capitalize ${sizeClasses} ${config.classes}`}
    >
      {config.label}
    </span>
  )
}
