"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle } from "lucide-react";

// ---- Lightweight Local Button (build-safe) ----
function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  disabled = false,
  className = "",
}: any) {
  const base =
    "rounded px-3 py-1 text-sm font-medium transition-colors " +
    (disabled
      ? "opacity-50 cursor-not-allowed "
      : "hover:bg-gray-100 cursor-pointer ");
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
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
// ------------------------------------------------

type DatasetOption = {
  id: string;
  title: string;
  admin_level?: string;
  dataset_type?: string;
  source?: "core" | "other" | "derived";
  table_name?: string;
};

type JoinPreviewRow = {
  pcode: string;
  name: string;
  a: number | null;
  b: number | null;
  derived: number | null;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  open = true,
  countryIso,
  onClose,
  onCreated,
}: {
  open?: boolean;
  countryIso: string;
  onClose: () => void;
  onCreated?: () => void;
}) {
  if (!open) return null;

  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);

  const [joinFieldA, setJoinFieldA] = useState("pcode");
  const [joinFieldB, setJoinFieldB] = useState("pcode");
  const [targetLevel, setTargetLevel] = useState<string>("ADM4");
  const [method, setMethod] = useState<"multiply" | "ratio" | "sum" | "difference">("multiply");

  const [loading, setLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState<JoinPreviewRow[]>([]);
  const [showPreviewA, setShowPreviewA] = useState(false);
  const [showPreviewB, setShowPreviewB] = useState(false);
  const [showJoinPreview, setShowJoinPreview] = useState(false);
  const [aggregationNotice, setAggregationNotice] = useState<string | null>(null);

  // ---- Toggles ----
  const [includeCore, setIncludeCore] = useState(true);
  const [includeOther, setIncludeOther] = useState(true);
  const [includeDerived, setIncludeDerived] = useState(true);
  const [includeGIS, setIncludeGIS] = useState(true);

  // ---- Fetch datasets ----
  useEffect(() => {
    const fetchAllDatasets = async () => {
      const merged: DatasetOption[] = [];

      // Core datasets
      if (includeCore) {
        merged.push(
          { id: "core-admin", title: "Administrative Boundaries", admin_level: "ADM4", source: "core", table_name: "admin_units" },
          { id: "core-pop", title: "Population Data", admin_level: "ADM4", source: "core", table_name: "population_data" }
        );
        if (includeGIS)
          merged.push({
            id: "core-gis",
            title: "GIS Features",
            admin_level: "ADM4",
            source: "core",
            table_name: "gis_features",
          });
      }

      // Other datasets
      if (includeOther) {
        const { data } = await supabase
          .from("dataset_metadata")
          .select("id, title, admin_level, dataset_type")
          .eq("country_iso", countryIso)
          .eq("is_active", true)
          .order("title");
        if (data) {
          const mapped = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            admin_level: d.admin_level,
            dataset_type: d.dataset_type,
            source: "other" as const,
            table_name: d.title.replace(/\s+/g, "_").toLowerCase(),
          }));
          merged.push(...mapped);
        }
      }

      // Derived datasets
      if (includeDerived) {
        const { data } = await supabase
          .from("view_derived_dataset_summary")
          .select("derived_dataset_id, derived_title, admin_level, data_health, year")
          .eq("country_iso", countryIso)
          .order("derived_title");
        if (data) {
          const mapped = data.map((d: any) => ({
            id: d.derived_dataset_id,
            title: d.derived_title,
            admin_level: d.admin_level,
            source: "derived" as const,
            table_name: `derived_${d.derived_dataset_id}`,
          }));
          merged.push(...mapped);
        }
      }

      setDatasets(merged);
    };

    fetchAllDatasets();
  }, [countryIso, includeCore, includeOther, includeDerived, includeGIS]);

  // ---- Detect aggregation ----
  useEffect(() => {
    if (!datasetA || !datasetB) return;
    const hierarchy = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"];
    const idxA = hierarchy.indexOf(datasetA.admin_level || "");
    const idxB = hierarchy.indexOf(datasetB.admin_level || "");
    if (idxA === -1 || idxB === -1) return;

    const deeper = idxA > idxB ? datasetA.admin_level : datasetB.admin_level;
    const higher = idxA > idxB ? datasetB.admin_level : datasetA.admin_level;
    setTargetLevel(deeper || "ADM4");
    if (deeper !== higher) {
      setAggregationNotice(
        `Aggregating ${deeper} data upward to ${higher} may require summarization or averaging.`
      );
    } else setAggregationNotice(null);
  }, [datasetA, datasetB]);

  // ---- Join preview ----
  const handlePreviewJoin = async () => {
    if (!datasetA || !datasetB) return;
    setLoading(true);
    setPreviewRows([]);

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

    const rows =
      data?.map((r: any) => ({
        pcode: r.pcode,
        name: r.name,
        a: r.a ?? null,
        b: r.b ?? null,
        derived: r.derived ?? null,
      })) || [];

    setPreviewRows(rows);
    setShowJoinPreview(true);
    setLoading(false);
  };

  // ---- Grouping helper ----
  const groupDatasets = (src: "core" | "other" | "derived") =>
    datasets.filter((d) => d.source === src);

  // ---- Render ----
  return (
    <div className="p-4 w-full max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">Create Derived Dataset</h2>
      <p className="text-xs text-gray-600 mb-4">
        Step 1: Join alignment → Step 2: Derivation
      </p>

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
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Dataset A */}
        <div>
          <label className="text-xs font-semibold">Dataset A</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={datasetA?.id || ""}
            onChange={(e) =>
              setDatasetA(datasets.find((d) => d.id === e.target.value) || null)
            }
          >
            <option value="">Select dataset...</option>
            <optgroup label="Core Datasets">
              {groupDatasets("core").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.admin_level})
                </option>
              ))}
            </optgroup>
            <optgroup label="Other Datasets">
              {groupDatasets("other").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.admin_level})
                </option>
              ))}
            </optgroup>
            <optgroup label="Derived Datasets">
              {groupDatasets("derived").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.admin_level})
                </option>
              ))}
            </optgroup>
          </select>

          <div className="flex space-x-2 mt-2">
            <label className="text-xs">Join Field</label>
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
              <p className="font-semibold">{datasetA?.title}</p>
              <p className="italic text-gray-500">[dataset preview]</p>
            </div>
          )}
        </div>

        {/* Dataset B */}
        <div>
          <label className="text-xs font-semibold">Dataset B</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={datasetB?.id || ""}
            onChange={(e) =>
              setDatasetB(datasets.find((d) => d.id === e.target.value) || null)
            }
          >
            <option value="">Select dataset...</option>
            <optgroup label="Core Datasets">
              {groupDatasets("core").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.admin_level})
                </option>
              ))}
            </optgroup>
            <optgroup label="Other Datasets">
              {groupDatasets("other").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.admin_level})
                </option>
              ))}
            </optgroup>
            <optgroup label="Derived Datasets">
              {groupDatasets("derived").map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.admin_level})
                </option>
              ))}
            </optgroup>
          </select>

          <div className="flex space-x-2 mt-2">
            <label className="text-xs">Join Field</label>
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
              <p className="font-semibold">{datasetB?.title}</p>
              <p className="italic text-gray-500">[dataset preview]</p>
            </div>
          )}
        </div>
      </div>

      {/* Join Preview Button */}
      <Button
        variant="link"
        className="text-xs mb-2"
        onClick={handlePreviewJoin}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin mr-1" /> Generating preview...
          </>
        ) : (
          "Preview join"
        )}
      </Button>

      {/* Join Results */}
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

      {/* Step 2: Formula */}
      <h3 className="text-sm font-semibold mt-4 mb-2">
        Step 2: Derivation / Aggregation
      </h3>
      <div className="text-xs mb-2">
        Formula:{" "}
        <strong>
          {datasetA?.title || "A"} {method} {datasetB?.title || "B"} → target {targetLevel}
        </strong>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {(["multiply", "ratio", "sum", "difference"] as const).map((m) => (
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

      <div className="flex justify-end mt-4">
        <Button variant="outline" className="mr-2" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (onCreated) onCreated();
            onClose();
          }}
        >
          Create
        </Button>
      </div>
    </div>
  );
}
