"use client";

import { Dialog } from "@headlessui/react";
import { X, Trash2 } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  version: { id: string; title: string };
  onConfirm: () => void;
};

export default function ConfirmDeleteModal({
  open,
  onClose,
  version,
  onConfirm,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-[color:var(--gsc-red)]" />
              Delete Version
            </Dialog.Title>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>

          <p className="text-sm text-gray-700 mb-4">
            Are you sure you want to delete the version{" "}
            <strong>{version.title}</strong>? This action cannot be undone.
          </p>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
              disabled={confirming}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="px-3 py-1.5 text-sm rounded text-white bg-[color:var(--gsc-red)] hover:opacity-90"
            >
              {confirming ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
