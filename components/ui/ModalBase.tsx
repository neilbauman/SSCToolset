"use client";

import React from "react";

/**
 * ModalBase
 * ----------
 * A reusable, standardized modal layout used by all dialogs in the SSC Toolset.
 * Handles the overlay, frame, title, action buttons, and general styling.
 */

export type ModalBaseProps = {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  disableConfirm?: boolean;
};

export default function ModalBase({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onClose,
  onConfirm,
  disableConfirm,
}: ModalBaseProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">{title}</h2>

        <div className="text-sm text-gray-700 mb-6">{children}</div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            {cancelLabel}
          </button>
          {onConfirm && (
            <button
              disabled={disableConfirm}
              onClick={onConfirm}
              className="px-4 py-2 text-sm rounded bg-[color:var(--gsc-red)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
