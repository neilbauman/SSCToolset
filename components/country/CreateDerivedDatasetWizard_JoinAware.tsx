"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle, X } from "lucide-react";

/** Local, build-safe Button */
function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  disabled = false,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "link";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
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
  onCreated?: () => void;
}) {
  // If not open, render nothing (page is fine)
  if (!open) return null;

  // --- modal focus trap / esc close ---
  const backdropRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ---- state ----
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);

  const [joinFieldA, setJoinFieldA] = useState<string>("pcode");
  const [joinFieldB, setJoinFieldB] = useState<string>("pcode");
  const [targetLevel, setTargetLevel] = useState<string>("ADM4");
  const [method, setMethod] = useState<Method>("multiply");

  const [loading, setLoading] = useState<boolean>(false);
  const [aggregationNotice, setAggregationNotice] = useState<string | null>(null);

  const [previewRows, setPreviewRows] = useState<JoinPreviewRow[]>([]);
  const [showPreviewA, setShowPreviewA] = useState<boolean>(false);
  const [showPreviewB, setShowPreviewB] = useState<boolean>(false);
  const [showJoinPreview, setShowJoinPreview] = useState<boolean>(false);

  // filters (reset each time the wizard opens; no persistence)
  const [includeCore, setIncludeCore] = useState<boolean>(true);
  const [includeOther, setIncludeOther] = useState<boolean>(true);
  const [includeDerived, setIncludeDerived] = useState<boolean>(true);
  const [includeGIS, setIncludeGIS] = useState<boolean>(true);

  // ---- fetch datasets (core + other + derived) ----
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const merged: DatasetOption[] = [];

      if (includeCore) {
        merged.push({
          id: "core-admin",
          title: "Administrative Boundaries",
          admin_level: "ADM4",
          dataset_type: "admin",
          source: "core",
          table_name: "admin_units",
        });
        merged.push({
          id: "core-pop",
          title: "Population Data",
          admin_level: "ADM4",
          dataset_type: "population",
          source: "core",
          table_name: "population_data",
        });
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
          .select("id, title, admin_level, dataset_type")
          .eq("country_iso", countryIso)
          .eq("is_active", true)
          .order("title");
        if (md) {
          merged.push(
            ...md.map((d: any) => ({
              id: d.id as string,
              title: d.title as string,
              admin_level: (d.admin_level as string) ?? null,
              dataset_type: (d.dataset_type as string) ?? null,
              source: "other" as const,
              table_name: (d.title as string).replace(/\s+/g, "_").toLowerCase(),
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
              id: d.derived_dataset_id as string,
              title: d.derived_title as string,
              admin_level: (d.admin_level as string) ?? null,
              dataset_type: "derived",
              source: "derived" as const,
              table_name: `derived_${d.derived_dataset_id}`,
            }))
          );
        }
      }

      if (!cancelled) setDatasets(merged);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [countryIso, includeCore, includeOther, includeDerived, includeGIS]);

  // ---- auto-sense aggregation need ----
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

  // ---- preview join ----
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

    const rows: JoinPreviewRow[] =
      (data || []).map((r: any) => ({
        pcode: r.pcode,
        name: r.name,
        a: r.a ?? null,
        b: r.b ?? null,
        derived: r.derived ?? null,
      })) ?? [];

    setPreviewRows(rows);
    setShowJoinPreview(true);
    setLoading(false);
  };

  // ---- helpers ----
  const groupDatasets = useMemo(
    () => ({
      core: datasets.filter((d) => d.source === "core"),
      other: datasets.filter((d) => d.source === "other"),
      derived: datasets.filter((d) => d.source === "derived"),
    }),
    [datasets]
  );

  // click outside to close
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={onBackdropClick}
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
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
            aria-label="Close"
            className="p-1 rounded hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 max-h-[78vh] overflow-y-auto">
          {/* Source toggles */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={includeCore}
                onChange={(e) => setIncludeCore(e.target.checked)}
              />
              <span>Include Core</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={includeOther}
                onChange={(e) => setIncludeOther(e.target.checked)}
              />
              <span>Include Other</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={includeDerived}
                onChange={(e) => setIncludeDerived(e.target.checked)}
              />
              <span>Include Derived</span>
            </label>
            {includeCore && (
              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={includeGIS}
                  onChange={(e) => setIncludeGIS(e.target.checked)}
                />
                <span>Include GIS</span>
              </label>
            )}
          </div>

          {aggregationNotice && (
            <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded">
              <AlertTriangle className="w-4 h-4 mt-[2px]" />
              <span>{aggregationNotice}</span>
            </div>
          )}

          {/* Dataset Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Dataset A */}
            <div className="border rounded-lg p-3">
              <label className="text-xs font-semibold">Dataset A</label>
              <select
                className="w-full border rounded p-2 text-sm mt-1"
                value={datasetA?.id || ""}
                onChange={(e) =>
                  setDatasetA(datasets.find((d) => d.id === e.target.value) || null)
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
                  value={joinFieldA}
                  onChange={(e) => setJoinFieldA(e.target.value)}
                  className="border rounded px-2 py-1 text-xs"
                >
                  <option value="pcode">pcode</option>
                  <option value="admin_pcode">admin_pcode</option>
                  <option value="id">id</option>
                </select>
              </div>

              <Button
                variant="link"
                className="text-xs mt-1"
                onClick={() => setShowPreviewA((p) => !p)}
              >
                {showPreviewA ? "Hide preview" : "Show preview"}
              </Button>
              {showPreviewA && (
                <div className="mt-2 p-2 border rounded max-h-32 overflow-y-auto text-xs text-gray-700">
                  <p className="font-semibold">{datasetA?.title ?? "—"}</p>
                  <p className="italic text-gray-500">[dataset preview]</p>
                </div>
              )}
            </div>

            {/* Dataset B */}
            <div className="border rounded-lg p-3">
              <label className="text-xs font-semibold">Dataset B</label>
              <select
                className="w-full border rounded p-2 text-sm mt-1"
                value={datasetB?.id || ""}
                onChange={(e) =>
                  setDatasetB(datasets.find((d) => d.id === e.target.value) || null)
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
                  value={joinFieldB}
                  onChange={(e) => setJoinFieldB(e.target.value)}
                  className="border rounded px-2 py-1 text-xs"
                >
                  <option value="pcode">pcode</option>
                  <option value="admin_pcode">admin_pcode</option>
                  <option value="id">id</option>
                </select>
              </div>

              <Button
                variant="link"
                className="text-xs mt-1"
                onClick={() => setShowPreviewB((p) => !p)}
              >
                {showPreviewB ? "Hide preview" : "Show preview"}
              </Button>
              {showPreviewB && (
                <div className="mt-2 p-2 border rounded max-h-32 overflow-y-auto text-xs text-gray-700">
                  <p className="font-semibold">{datasetB?.title ?? "—"}</p>
                  <p className="italic text-gray-500">[dataset preview]</p>
                </div>
              )}
            </div>
          </div>

          {/* Join Preview */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="text-xs"
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
              Target level: <span className="font-semibold">{targetLevel}</span>
            </div>
          </div>

          {showJoinPreview && (
            <div className="mt-2 border rounded p-2 text-xs overflow-auto max-h-96">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="p-1 border text-left">PCode</th>
                    <th className="p-1 border text-left">Name</th>
                    <th className="p-1 border text-right">A</th>
                    <th className="p-1 border text-right">B</th>
                    <th className="p-1 border text-right">Derived</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 25).map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1">{r.pcode}</td>
                      <td className="p-1">{r.name}</td>
                      <td className="p-1 text-right">{r.a ?? "—"}</td>
                      <td className="p-1 text-right">{r.b ?? "—"}</td>
                      <td className="p-1 text-right">{r.derived ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-gray-500 mt-1">Showing up to 25 rows.</p>
            </div>
          )}

          {/* Step 2 */}
          <h3 className="text-sm font-semibold mt-4 mb-2">Step 2: Derivation / Aggregation</h3>
          <div className="text-xs mb-2">
            Formula:{" "}
            <strong>
              {datasetA?.title || "A"} {method} {datasetB?.title || "B"} → target {targetLevel}
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
              onCreated?.();
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
