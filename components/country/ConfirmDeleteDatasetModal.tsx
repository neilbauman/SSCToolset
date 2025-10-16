"use client";

import { X, Trash2 } from "lucide-react";

export default function ConfirmDeleteDatasetModal({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.25)" }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg" style={{ border: "1px solid var(--gsc-light-gray)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: "var(--gsc-gray)" }}>Delete dataset</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-3 text-sm text-gray-700">
          This will permanently delete <span className="font-semibold">"{title}"</span> and all associated values and category maps.
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded px-3 py-1.5 border" style={{ borderColor: "var(--gsc-light-gray)" }}>Cancel</button>
          <button onClick={onConfirm} className="inline-flex items-center gap-2 rounded px-3 py-1.5 text-white" style={{ background: "var(--gsc-red)" }}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
