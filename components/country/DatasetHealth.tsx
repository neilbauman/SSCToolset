"use client";

import { ShieldCheck } from "lucide-react";

type HealthCheck = {
  label: string;
  status: "ok" | "warn" | "fail";
};

interface DatasetHealthProps {
  checks: HealthCheck[];
}

export default function DatasetHealth({ checks }: DatasetHealthProps) {
  const overallStatus =
    checks.every((c) => c.status === "ok")
      ? "uploaded"
      : checks.some((c) => c.status === "fail")
      ? "missing"
      : "partial";

  const badgeClass =
    overallStatus === "uploaded"
      ? "bg-green-100 text-green-700"
      : overallStatus === "partial"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <div className="border rounded-lg p-4 shadow-sm relative">
      <div className="absolute top-2 right-2">
        <span className={`px-2 py-1 text-xs rounded ${badgeClass}`}>
          {overallStatus}
        </span>
      </div>
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-blue-600" /> Data Health
      </h2>
      <ul className="text-sm list-disc pl-6">
        {checks.map((c, idx) => (
          <li
            key={idx}
            className={
              c.status === "ok"
                ? "text-green-700"
                : c.status === "warn"
                ? "text-yellow-700"
                : "text-red-700"
            }
          >
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
