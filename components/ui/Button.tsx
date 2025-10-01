// components/ui/Button.tsx
import React from "react";

export function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`px-4 py-2 rounded-lg font-medium bg-red-700 text-white hover:bg-red-800 disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
