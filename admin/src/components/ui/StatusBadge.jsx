const statusConfig = {
  // Order statuses
  pending: { label: 'Pending', className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' },
  processing: { label: 'Processing', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  shipped: { label: 'Shipped', className: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' },
  delivered: { label: 'Delivered', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  refunded: { label: 'Refunded', className: 'bg-purple-500/15 text-purple-400 border border-purple-500/20' },

  // Vendor/KYC statuses
  approved: { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  suspended: { label: 'Suspended', className: 'bg-orange-500/15 text-orange-400 border border-orange-500/20' },
  not_submitted: { label: 'Not Submitted', className: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },
  under_review: { label: 'Under Review', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },

  // Product statuses
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  inactive: { label: 'Inactive', className: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },
  blocked: { label: 'Blocked', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  draft: { label: 'Draft', className: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },

  // Payment statuses
  paid: { label: 'Paid', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  unpaid: { label: 'Unpaid', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  cod: { label: 'COD', className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' },
  online: { label: 'Online', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },

  // Payout statuses
  released: { label: 'Released', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  hold: { label: 'On Hold', className: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' },
  failed: { label: 'Failed', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },

  // User statuses
  active_user: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  banned: { label: 'Banned', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },

  // Role badges
  admin: { label: 'Admin', className: 'bg-purple-500/15 text-purple-400 border border-purple-500/20' },
  vendor: { label: 'Vendor', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  user: { label: 'User', className: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },

  // Generic
  true: { label: 'Yes', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  false: { label: 'No', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
};

export default function StatusBadge({ status, label: customLabel, className: extraClass = '' }) {
  const key = String(status).toLowerCase().replace(/\s+/g, '_');
  const config = statusConfig[key] || {
    label: status,
    className: 'bg-gray-500/15 text-gray-400 border border-gray-500/20',
  };

  return (
    <span className={`status-badge ${config.className} ${extraClass}`}>
      {customLabel || config.label}
    </span>
  );
}
