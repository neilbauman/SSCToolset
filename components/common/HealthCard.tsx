"use client";

import React from "react";

export type Status = "ok" | "warning" | "error";

interface HealthCardProps {
  title: string;
  statusChecks: { label: string; status: Status }[];
  status: Status;
}

const statusColors: Record<Status, string> = {
  ok: "bg-green-100 text-green-700",
  warning: "bg-orange-100 text-orange-700",
  error: "bg-red-100 text-red-700",
};

export default function HealthCard({ title, statusChecks, status }: HealthCardProps) {
  return (
    <div className="border rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className={`px-2 py-1 text-xs rounded ${statusColors[status]}`}>
          {status.toUpperCase()}
        </span>
      </div>
      <ul className="space-y-2">
        {statusChecks.map((check, idx) => (
          <li key={idx} className="flex items-center gap-2 text-sm">
            <span className={`px-2 py-0.5 rounded ${statusColors[check.status]}`}>
              {check.status === "ok" ? "✓" : check.status === "warning" ? "!" : "✗"}
            </span>
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
