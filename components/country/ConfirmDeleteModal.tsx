"use client";
import React from "react";

type ConfirmDeleteModalProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmDeleteModal({
  open,
  title = "Confirm Deletion",
  message,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-3 text-[color:var(--gsc-red)]">
          {title}
        </h2>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={async () => await onConfirm()}
            className="bg-[color:var(--gsc-red)] text-white px-3 py-1.5 rounded hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
