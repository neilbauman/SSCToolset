"use client";

import { Pencil } from "lucide-react";

interface CountryMetadataCardProps {
  country: any;
  onEdit: () => void;
}

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

  // Normalize dataset_sources for consistent rendering
  const datasetSources = Array.isArray(country.dataset_sources)
    ? country.dataset_sources
    : typeof country.dataset_sources === "string"
    ? [country.dataset_sources]
    : typeof country.dataset_sources === "object" && country.dataset_sources !== null
    ? Object.values(country.dataset_sources)
    : [];

  const formatSource = (src: any) => {
    if (!src) return "—";
    if (typeof src === "string") {
      return isValidUrl(src) ? (
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {src}
        </a>
      ) : (
        src
      );
    }
    if (typeof src === "object") {
      const label = src.name || src.title || src.label || "Unnamed Source";
      const url = src.url || src.link || src.href;
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {label}
        </a>
      ) : (
        label
      );
    }
    return String(src);
  };

  const isValidUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const formatExtraMetadata = (extra: Record<string, any>) => {
    return Object.entries(extra).map(([key, value]) => {
      const label = value?.label || key;
      const val = value?.value ?? value;

      const valDisplay =
        typeof val === "string" && isValidUrl(val) ? (
          <a
            href={val}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {val}
          </a>
        ) : (
          String(val)
        );

      return (
        <div key={key} className="flex justify-between gap-2 border-b py-1">
          <span className="font-medium text-gray-700">{label}</span>
          <span className="text-gray-600 text-right">{valDisplay}</span>
        </div>
      );
    });
  };

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

      {/* Core Metadata */}
      <h4 className="text-sm font-semibold mb-1 text-[color:var(--gsc-red)]">
        Core Metadata
      </h4>
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
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
            {datasetSources.map((src: any, i: number) => (
              <li key={i}>{formatSource(src)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Extra Metadata */}
      {country.extra_metadata &&
        Object.keys(country.extra_metadata).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2 text-[color:var(--gsc-red)]">
              Extra Metadata
            </h4>
            <div className="bg-gray-50 border rounded p-2 text-sm">
              {formatExtraMetadata(country.extra_metadata)}
            </div>
          </div>
        )}
    </div>
  );
}
