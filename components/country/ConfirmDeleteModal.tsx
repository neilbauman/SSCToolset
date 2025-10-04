"use client";

import { Dialog } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
};

export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  message,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold text-red-600">Confirm Delete</h2>
        <p className="text-sm text-gray-700">{message}</p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-3 py-1 bg-red-600 text-white rounded hover:opacity-90"
          >
            Delete
          </button>
        </div>
      </div>
    </Dialog>
  );
}
