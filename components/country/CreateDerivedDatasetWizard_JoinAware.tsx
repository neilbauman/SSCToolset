"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle, X } from "lucide-react";

// ------------------------------------------------------
// Local Tailwind Button (build-safe, typed)
// ------------------------------------------------------
type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "link";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
};

function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  disabled = false,
  className = "",
  type = "button",
}: ButtonProps) {
  const base =
    "rounded px-3 py-1 text-sm font-medium transition-colors " +
    (disabled ? "opacity-50 cursor-not-allowed " : "cursor-pointer ");
  const variants: Record<string, string> = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    link: "text-blue-600 underline hover:text-blue-800",
  };
  const sizes: Record<string, string> = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
  };
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------
// Main Component
// ------------------------------------------------------
type Method = "multiply" | "ratio" | "sum" | "difference";

type DatasetOption = {
  id: string;
  title: string;
  admin_level?: string | null;
  dataset_type?: string | null;
  source: "core" | "other" | "derived";
  table_name: string;
};

type JoinPreviewRow = {
  pcode: string;
  name: string;
  a: number | null;
  b: number | null;
  derived: number | null;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  countryIso,
  onClose,
  onCreated,
}: {
  open: boolean;
  countryIso: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  if (!open) return null;

  const backdropRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);

  const [joinFieldA, setJoinFieldA] = useState("pcode");
  const [joinFieldB, setJoinFieldB] = useState("pcode");
  const [targetLevel, setTargetLevel] = useState("ADM4");
  const [method, setMethod] = useState<Method>("multiply");
  const [loading, setLoading] = useState(false);
  const [aggregationNotice, setAggregationNotice] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<JoinPreviewRow[]>([]);
  const [showJoinPreview, setShowJoinPreview] = useState(false);

  const [includeCore, setIncludeCore] = useState(true);
  const [includeOther, setIncludeOther] = useState(true);
  const [includeDerived, setIncludeDerived] = useState(true);
  const [includeGIS, setIncludeGIS] = useState(true);

  // ------------------------------------------------------
  // Load datasets
  // ------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const merged: DatasetOption[] = [];

      if (includeCore) {
        merged.push(
          {
            id: "core-admin",
            title: "Administrative Boundaries",
            admin_level: "ADM4",
            dataset_type: "admin",
            source: "core",
            table_name: "admin_units",
          },
          {
            id: "core-pop",
            title: "Population Data",
            admin_level: "ADM4",
            dataset_type: "population",
            source: "core",
            table_name: "population_data",
          }
        );
        if (includeGIS) {
          merged.push({
            id: "core-gis",
            title: "GIS Features",
            admin_level: "ADM4",
            dataset_type: "gis",
            source: "core",
            table_name: "gis_features",
          });
        }
      }

      if (includeOther) {
        const { data: md } = await supabase
          .from("dataset_metadata")
          .select("id, title, admin_level, dataset_type, country_iso")
          .eq("country_iso", countryIso)
          .order("title");
        if (md) {
          merged.push(
            ...md.map((d: any) => ({
              id: d.id,
              title: d.title || "(Untitled dataset)",
              admin_level: d.admin_level || null,
              dataset_type: d.dataset_type || null,
              source: "other" as const,
              table_name: (d.title || `dataset_${d.id}`)
                .replace(/\s+/g, "_")
                .toLowerCase(),
            }))
          );
        }
      }

      if (includeDerived) {
        const { data: dv } = await supabase
          .from("view_derived_dataset_summary")
          .select("derived_dataset_id, derived_title, admin_level")
          .eq("country_iso", countryIso)
          .order("derived_title");
        if (dv) {
          merged.push(
            ...dv.map((d: any) => ({
              id: d.derived_dataset_id,
              title: d.derived_title,
              admin_level: d.admin_level ?? null,
              dataset_type: "derived",
              source: "derived" as const,
              table_name: `derived_${d.derived_dataset_id}`,
            }))
          );
        }
      }

      if (!cancelled) setDatasets(merged);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [countryIso, includeCore, includeOther, includeDerived, includeGIS]);

  // ------------------------------------------------------
  // Auto-sense aggregation need
  // ------------------------------------------------------
  useEffect(() => {
    if (!datasetA || !datasetB) return;
    const hierarchy = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"];
    const idxA = hierarchy.indexOf(datasetA.admin_level || "");
    const idxB = hierarchy.indexOf(datasetB.admin_level || "");
    if (idxA < 0 || idxB < 0) return;
    const deeper = idxA > idxB ? datasetA.admin_level : datasetB.admin_level;
    const higher = idxA > idxB ? datasetB.admin_level : datasetA.admin_level;
    const nextTarget = deeper ?? "ADM4";
    setTargetLevel(nextTarget);
    setAggregationNotice(
      deeper !== higher && deeper && higher
        ? `Aggregating ${deeper} data upward to ${higher} may require summarization or averaging.`
        : null
    );
  }, [datasetA, datasetB]);

  // ------------------------------------------------------
  // Preview join
  // ------------------------------------------------------
  const handlePreviewJoin = async () => {
    if (!datasetA || !datasetB) return;
    setLoading(true);
    setPreviewRows([]);
    setShowJoinPreview(false);
    const { data, error } = await supabase.rpc("simulate_join_preview_aggregate", {
      table_a: datasetA.table_name,
      table_b: datasetB.table_name,
      field_a: joinFieldA,
      field_b: joinFieldB,
      p_country: countryIso,
      target_level: targetLevel,
      method,
    });
    if (error) {
      console.error("Join preview error:", error);
      setLoading(false);
      return;
    }
    setPreviewRows(data || []);
    setShowJoinPreview(true);
    setLoading(false);
  };

  const groupDatasets = useMemo(
    () => ({
      core: datasets.filter((d) => d.source === "core"),
      other: datasets.filter((d) => d.source === "other"),
      derived: datasets.filter((d) => d.source === "derived"),
    }),
    [datasets]
  );

  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  // ------------------------------------------------------
  // Render
  // ------------------------------------------------------
  return (
    <div
      ref={backdropRef}
      onClick={onBackdropClick}
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold">Create Derived Dataset</h2>
            <p className="text-xs text-gray-600">
              Step 1: Join alignment → Step 2: Derivation
            </p>
          </div>
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 max-h-[78vh] overflow-y-auto">
          {/* Source toggles */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            {([
              { label: "Include Core", checked: includeCore, setter: setIncludeCore },
              { label: "Include Other", checked: includeOther, setter: setIncludeOther },
              { label: "Include Derived", checked: includeDerived, setter: setIncludeDerived },
              { label: "Include GIS", checked: includeGIS, setter: setIncludeGIS },
            ] as const).map(({ label, checked, setter }, i) => (
              <label key={i} className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setter(e.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          {aggregationNotice && (
            <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded">
              <AlertTriangle className="w-4 h-4 mt-[2px]" />
              <span>{aggregationNotice}</span>
            </div>
          )}

          {/* Dataset Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {[["Dataset A", datasetA, setDatasetA, joinFieldA, setJoinFieldA],
              ["Dataset B", datasetB, setDatasetB, joinFieldB, setJoinFieldB]].map(
              ([label, dataset, setDataset, joinField, setJoinField], i) => (
                <div key={i} className="border rounded-lg p-3">
                  <label className="text-xs font-semibold">{label}</label>
                  <select
                    className="w-full border rounded p-2 text-sm mt-1"
                    value={(dataset as DatasetOption | null)?.id || ""}
                    onChange={(e) =>
                      (setDataset as any)(
                        datasets.find((d) => d.id === e.target.value) || null
                      )
                    }
                  >
                    <option value="">Select dataset...</option>
                    <optgroup label="Core Datasets">
                      {groupDatasets.core.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other Datasets">
                      {groupDatasets.other.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Derived Datasets">
                      {groupDatasets.derived.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs">Join Field</span>
                    <select
                      value={joinField as string}
                      onChange={(e) => (setJoinField as any)(e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="pcode">pcode</option>
                      <option value="admin_pcode">admin_pcode</option>
                      <option value="id">id</option>
                    </select>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Join Preview */}
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewJoin}
              disabled={loading || !datasetA || !datasetB}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Generating preview…
                </>
              ) : (
                "Preview join"
              )}
            </Button>
            <div className="text-xs text-gray-600">
              Target level: <strong>{targetLevel}</strong>
            </div>
          </div>

          {showJoinPreview && (
            <div className="mt-3 border rounded-lg p-2 bg-gray-50">
              <div className="max-h-[45vh] overflow-y-auto rounded border bg-white">
                <table className="min-w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-gray-100 text-gray-600">
                    <tr>
                      <th className="p-1 border text-left">PCode</th>
                      <th className="p-1 border text-left">Name</th>
                      <th className="p-1 border text-right">A</th>
                      <th className="p-1 border text-right">B</th>
                      <th className="p-1 border text-right">Derived</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 200).map((r, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-1">{r.pcode}</td>
                        <td className="p-1">{r.name}</td>
                        <td className="p-1 text-right">{r.a ?? "—"}</td>
                        <td className="p-1 text-right">{r.b ?? "—"}</td>
                        <td className="p-1 text-right font-medium text-gray-800">
                          {r.derived ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Showing up to 200 joined records (scroll for more).
              </p>
            </div>
          )}

          {/* Step 2 */}
          <h3 className="text-sm font-semibold mt-4 mb-2">
            Step 2: Derivation / Aggregation
          </h3>
          <div className="text-xs mb-2">
            Formula:{" "}
            <strong>
              {datasetA?.title || "A"} {method} {datasetB?.title || "B"} → target{" "}
              {targetLevel}
            </strong>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {(["multiply", "ratio", "sum", "difference"] as Method[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={method === m ? "default" : "outline"}
                onClick={() => setMethod(m)}
              >
                {m}
              </Button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onCreated();
              onClose();
            }}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
