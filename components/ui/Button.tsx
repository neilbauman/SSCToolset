import React from "react";

export function Button({
  children,
  onClick,
  className = "",
  type = "button",
  variant = "primary",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "outline";
  disabled?: boolean;
}) {
  const base =
    "px-3 py-1.5 text-sm font-medium rounded-md transition focus:outline-none disabled:opacity-50";
  const variants: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
