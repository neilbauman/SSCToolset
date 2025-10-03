"use client";

import { Pencil } from "lucide-react";

type CountryMetadataCardProps = {
  country: any;
  onEdit: () => void;
};

export default function CountryMetadataCard({ country, onEdit }: CountryMetadataCardProps) {
  if (!country) {
    return (
      <div className="border rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Country Metadata</h2>
        <p className="italic text-gray-400">Loading metadata...</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 shadow-sm flex flex-col justify-between">
      <div>
        <h2 className="text-lg font-semibold mb-3">Country Metadata</h2>

        {/* Core metadata */}
        <h3 className="text-base font-semibold text-[color:var(--gsc-red)] mb-2">
          Core Metadata
        </h3>
        <div className="pl-2 text-sm space-y-1">
          <p><strong>ISO:</strong> {country.iso_code}</p>
          <p><strong>Name:</strong> {country.name}</p>
          <p><strong>ADM0 Label:</strong> {country.adm0_label}</p>
          <p><strong>ADM1 Label:</strong> {country.adm1_label}</p>
          <p><strong>ADM2 Label:</strong> {country.adm2_label}</p>
          <p><strong>ADM3 Label:</strong> {country.adm3_label}</p>
          <p><strong>ADM4 Label:</strong> {country.adm4_label}</p>
          <p><strong>ADM5 Label:</strong> {country.adm5_label}</p>
        </div>

        {/* Extra metadata */}
        <h3 className="text-base font-semibold text-[color:var(--gsc-red)] mt-4 mb-2">
          Extra Metadata
        </h3>
        <div className="pl-2 text-sm space-y-1">
          {country.extra_metadata && Object.keys(country.extra_metadata).length > 0 ? (
            Object.entries(country.extra_metadata).map(([k, v]) => {
              const entry = v as { label: string; value: string; url?: string };
              return (
                <p key={k}>
                  <strong>{entry.label}:</strong>{" "}
                  {entry.url ? (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      {entry.value}
                    </a>
                  ) : (
                    <span>{entry.value}</span>
                  )}
                </p>
              );
            })
          ) : (
            <p className="italic text-gray-400">None</p>
          )}
        </div>
      </div>

      {/* Edit button */}
      <button
        onClick={onEdit}
        className="mt-4 px-3 py-1.5 text-sm border rounded flex items-center gap-1 hover:bg-gray-50"
      >
        <Pencil className="w-4 h-4" /> Edit Metadata
      </button>
    </div>
  );
}
