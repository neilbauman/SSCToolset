"use client";

import React from "react";

type ConfirmDeleteModalProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmDeleteModal({
  open,
  title = "Confirm Deletion",
  message,
  confirmLabel = "Delete",
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
        <p className="text-sm text-gray-700 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm rounded bg-[color:var(--gsc-red)] text-white hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
