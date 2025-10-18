import React from "react";

export function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-3 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function DialogHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 border-b border-gray-200 pb-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}
