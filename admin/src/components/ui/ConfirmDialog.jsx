import Modal from './Modal';
import Spinner from './Spinner';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  children,
}) {
  const variantConfig = {
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${variantConfig[variant]}`}
          >
            {loading && <Spinner size="sm" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      {children ? (
        <div className="space-y-4">
          {message && <p className="text-gray-500 text-sm leading-relaxed">{message}</p>}
          {children}
        </div>
      ) : (
        <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
      )}
    </Modal>
  );
}
