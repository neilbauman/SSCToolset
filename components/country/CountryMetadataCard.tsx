"use client";

import { Pencil } from "lucide-react";

interface CountryMetadataCardProps {
  country: any;
  onEdit: () => void;
}

/**
 * Displays basic metadata for a country, including name, ISO, and admin labels.
 * Used on the Country Configuration landing page.
 */
export default function CountryMetadataCard({
  country,
  onEdit,
}: CountryMetadataCardProps) {
  if (!country) {
    return (
      <div className="border rounded-lg p-4 shadow-sm bg-gray-50">
        <h3 className="text-lg font-semibold mb-2 text-gray-800">
          Country Metadata
        </h3>
        <p className="text-sm text-gray-500 italic">Loading metadata...</p>
      </div>
    );
  }

  const admLabels = [
    { key: "adm0_label", label: "ADM0", value: country.adm0_label },
    { key: "adm1_label", label: "ADM1", value: country.adm1_label },
    { key: "adm2_label", label: "ADM2", value: country.adm2_label },
    { key: "adm3_label", label: "ADM3", value: country.adm3_label },
    { key: "adm4_label", label: "ADM4", value: country.adm4_label },
    { key: "adm5_label", label: "ADM5", value: country.adm5_label },
  ];

  // ✅ Normalize dataset_sources
  const datasetSources = Array.isArray(country.dataset_sources)
    ? country.dataset_sources
    : typeof country.dataset_sources === "string"
    ? [country.dataset_sources]
    : typeof country.dataset_sources === "object" && country.dataset_sources !== null
    ? Object.values(country.dataset_sources)
    : [];

  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          Country Metadata
        </h3>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <Pencil className="w-4 h-4" /> Edit
        </button>
      </div>

      {/* Basic Info */}
      <div className="text-sm text-gray-700 space-y-1 mb-3">
        <p>
          <strong>Name:</strong> {country.name}
        </p>
        <p>
          <strong>ISO Code:</strong> {country.iso_code}
        </p>
      </div>

      {/* Administrative Labels */}
      <div>
        <h4 className="text-sm font-semibold mb-1 text-gray-700">
          Administrative Labels
        </h4>
        <ul className="text-sm text-gray-600 grid grid-cols-2 gap-y-1">
          {admLabels.map((l) => (
            <li key={l.key}>
              <strong>{l.label}:</strong> {l.value || "—"}
            </li>
          ))}
        </ul>
      </div>

      {/* Dataset Sources */}
      {datasetSources.length > 0 && (
        <div className="mt-3">
          <h4 className="text-sm font-semibold mb-1 text-gray-700">
            Dataset Sources
          </h4>
          <ul className="list-disc list-inside text-sm text-gray-600">
            {datasetSources.map((src: any, i: number) => (
              <li key={i}>
                {typeof src === "string"
                  ? src
                  : src?.name || JSON.stringify(src)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extra Metadata */}
      {country.extra_metadata &&
        Object.keys(country.extra_metadata).length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-semibold mb-1 text-gray-700">
              Extra Metadata
            </h4>
            <pre className="text-xs bg-gray-50 border rounded p-2 overflow-x-auto">
              {JSON.stringify(country.extra_metadata, null, 2)}
            </pre>
          </div>
        )}
    </div>
  );
}
