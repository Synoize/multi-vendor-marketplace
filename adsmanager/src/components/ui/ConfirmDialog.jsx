import Spinner from './Spinner'

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  if (!isOpen) return null

  const confirmClasses =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'bg-blue-600 hover:bg-blue-500 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="glass-card p-6 max-w-sm w-full mx-4 animate-fadeIn">
        <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-6">{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 btn-ghost"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50 ${confirmClasses}`}
          >
            {loading ? (
              <Spinner size="xs" color="white" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
