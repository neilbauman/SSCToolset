"use client";
import { X } from "lucide-react";

interface ConfirmDeleteModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function ConfirmDeleteModal({
  open,
  message,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-red)]">
            Confirm Deletion
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-700 mb-4">{message}</p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
