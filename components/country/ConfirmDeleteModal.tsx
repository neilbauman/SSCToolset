"use client";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
};

export default function ConfirmDeleteModal({ open, onClose, onConfirm, message }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Confirm Delete</h2>
        <p className="mb-4 text-sm text-gray-700">{message}</p>
        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
