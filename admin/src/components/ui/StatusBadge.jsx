const statusConfig = {
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  processing: { label: 'Processing', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  shipped: { label: 'Shipped', className: 'bg-cyan-50 text-cyan-700 border border-cyan-200' },
  delivered: { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border border-red-200' },
  refunded: { label: 'Refunded', className: 'bg-purple-50 text-purple-700 border border-purple-200' },

  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700 border border-red-200' },
  suspended: { label: 'Suspended', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  not_submitted: { label: 'Not Submitted', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  under_review: { label: 'Under Review', className: 'bg-blue-50 text-blue-700 border border-blue-200' },

  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600 border border-gray-200' },
  blocked: { label: 'Blocked', className: 'bg-red-50 text-red-700 border border-red-200' },
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border border-gray-200' },

  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  unpaid: { label: 'Unpaid', className: 'bg-red-50 text-red-700 border border-red-200' },
  cod: { label: 'COD', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  online: { label: 'Online', className: 'bg-blue-50 text-blue-700 border border-blue-200' },

  released: { label: 'Released', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  hold: { label: 'On Hold', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-700 border border-red-200' },

  active_user: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  banned: { label: 'Banned', className: 'bg-red-50 text-red-700 border border-red-200' },

  admin: { label: 'Admin', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  vendor: { label: 'Vendor', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  user: { label: 'User', className: 'bg-gray-100 text-gray-600 border border-gray-200' },

  true: { label: 'Yes', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  false: { label: 'No', className: 'bg-red-50 text-red-700 border border-red-200' },
};

export default function StatusBadge({ status, label: customLabel, className: extraClass = '' }) {
  const key = String(status).toLowerCase().replace(/\s+/g, '_');
  const config = statusConfig[key] || {
    label: status,
    className: 'bg-gray-100 text-gray-600 border border-gray-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className} ${extraClass}`}>
      {customLabel || config.label}
    </span>
  );
}
