"use client";

import React from "react";

interface ConfirmDeleteModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function ConfirmDeleteModal({
  open,
  title = "Confirm Delete",
  message,
  confirmLabel = "Delete",
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-gray-700 mb-4 text-sm whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded border hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            className="px-4 py-1.5 text-sm rounded text-white bg-[color:var(--gsc-red)] hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
