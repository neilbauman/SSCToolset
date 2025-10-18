"use client";

import Link from "next/link";
import { ReactNode } from "react";

export default function CountrySummaryCard({
  title,
  subtitle,
  metric,
  health,
  link,
}: {
  title: string;
  subtitle?: string;
  metric: string | ReactNode;
  health: "good" | "fair" | "missing" | "empty";
  link: string;
}) {
  const colorMap: Record<string, string> = {
    good: "bg-green-100 text-green-700",
    fair: "bg-yellow-100 text-yellow-700",
    missing: "bg-red-100 text-red-700",
    empty: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="border rounded-lg p-5 shadow-sm hover:shadow-md transition bg-white">
      <div className="flex items-center justify-between mb-2">
        <Link href={link}>
          <h3 className="text-lg font-semibold hover:underline">{title}</h3>
        </Link>
        <span
          className={`px-2 py-1 text-xs rounded font-medium ${colorMap[health]}`}
        >
          {health}
        </span>
      </div>

      {subtitle && (
        <p className="text-sm text-gray-600 mb-1">{subtitle}</p>
      )}

      {/* Metric can be string or JSX */}
      <div className="text-sm text-gray-500 mb-2">
        {typeof metric === "string" ? metric : metric}
      </div>

      <Link
        href={link}
        className="inline-block text-sm text-blue-600 hover:underline"
      >
        View details →
      </Link>
    </div>
  );
}
