"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle } from "lucide-react";

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

type DatasetOption = {
  id: string;
  title: string;
  dataset_type: string;
  admin_level: string | null;
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
  const [targetLevel, setTargetLevel] = useState("ADM4");
  const [method, setMethod] = useState<"multiply" | "ratio" | "sum" | "difference">("multiply");
  const [loading, setLoading] = useState(false);
  const [includeGIS, setIncludeGIS] = useState(true);
  const [previewRows, setPreviewRows] = useState<JoinPreviewRow[]>([]);
  const [showPreviewA, setShowPreviewA] = useState(false);
  const [showPreviewB, setShowPreviewB] = useState(false);
  const [showJoinPreview, setShowJoinPreview] = useState(false);
  const [aggregationNotice, setAggregationNotice] = useState<string | null>(null);

  // ✅ Fixed dataset fetch
  useEffect(() => {
    const fetchDatasets = async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id, title, dataset_type, admin_level, country_iso")
        .eq("country_iso", countryIso)
        .order("title", { ascending: true });

      if (error) {
        console.error("Dataset fetch error:", error.message);
        setDatasets([]);
        return;
      }

      const filtered =
        (data || [])
          .filter((d: any) => includeGIS || (d.dataset_type || "").toLowerCase() !== "gis")
          .map((d: any) => ({
            id: String(d.id),
            title: d.title || "Untitled Dataset",
            dataset_type: d.dataset_type || "other",
            admin_level: d.admin_level || null,
          })) || [];

      setDatasets(filtered);
    };

    fetchDatasets();
  }, [countryIso, includeGIS]);

  // Level logic + notice
  useEffect(() => {
    if (!datasetA || !datasetB) return;
    const levels = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"];
    const idxA = levels.indexOf(datasetA.admin_level || "");
    const idxB = levels.indexOf(datasetB.admin_level || "");
    if (idxA === -1 || idxB === -1) return;
    const deeper = idxA > idxB ? datasetA.admin_level : datasetB.admin_level;
    const higher = idxA > idxB ? datasetB.admin_level : datasetA.admin_level;
    setTargetLevel((deeper ?? "ADM4") as string);
    if (deeper !== higher) {
      setAggregationNotice(
        `Aggregating ${deeper} data upward to ${higher} may require summarization or averaging.`
      );
    } else setAggregationNotice(null);
  }, [datasetA, datasetB]);

  const handlePreviewJoin = async () => {
    if (!datasetA || !datasetB) return;
    setLoading(true);
    setPreviewRows([]);
    const { data, error } = await supabase.rpc("simulate_join_preview_aggregate", {
      table_a: datasetA.title.replace(/\s+/g, "_").toLowerCase(),
      table_b: datasetB.title.replace(/\s+/g, "_").toLowerCase(),
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

  return (
    <div className="p-4 w-full max-w-6xl mx-auto">
      <div className="flex justify-between mb-2">
        <h2 className="text-xl font-semibold">Create Derived Dataset</h2>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <p className="text-xs text-gray-600 mb-4">
        Step 1: Join Alignment → Step 2: Derivation → Step 3: Disaggregate (optional)
      </p>

      <label className="flex items-center space-x-2 mb-4 text-sm">
        <input
          type="checkbox"
          checked={includeGIS}
          onChange={(e) => setIncludeGIS(e.target.checked)}
        />
        <span>Include GIS datasets</span>
      </label>

      <h3 className="text-sm font-semibold mb-2">Step 1 — Join Alignment</h3>
      {aggregationNotice && (
        <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded">
          <AlertTriangle className="w-4 h-4 mt-[2px]" />
          <span>{aggregationNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-3">
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
            <option value="">Select...</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <div className="flex items-center space-x-2 mt-1">
            <label className="text-xs">Join Field</label>
            <select
              value={joinFieldA}
              onChange={(e) => setJoinFieldA(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="pcode">pcode</option>
              <option value="admin_pcode">admin_pcode</option>
              <option value="adm_code">adm_code</option>
              <option value="id">id</option>
            </select>
            <Button variant="link" size="sm" onClick={() => setShowPreviewA(!showPreviewA)}>
              {showPreviewA ? "Hide preview" : "Show preview"}
            </Button>
          </div>
          {showPreviewA && (
            <div className="mt-2 p-2 border rounded max-h-32 overflow-y-auto text-xs text-gray-700">
              <p className="italic text-gray-500">[Dataset A preview here]</p>
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
            <option value="">Select...</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <div className="flex items-center space-x-2 mt-1">
            <label className="text-xs">Join Field</label>
            <select
              value={joinFieldB}
              onChange={(e) => setJoinFieldB(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="pcode">pcode</option>
              <option value="admin_pcode">admin_pcode</option>
              <option value="adm_code">adm_code</option>
              <option value="id">id</option>
            </select>
            <Button variant="link" size="sm" onClick={() => setShowPreviewB(!showPreviewB)}>
              {showPreviewB ? "Hide preview" : "Show preview"}
            </Button>
          </div>
          {showPreviewB && (
            <div className="mt-2 p-2 border rounded max-h-32 overflow-y-auto text-xs text-gray-700">
              <p className="italic text-gray-500">[Dataset B preview here]</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2 text-xs">
          <span>Target admin level:</span>
          <select
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span>Formula:</span>
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
          <Button
            variant="link"
            size="sm"
            onClick={handlePreviewJoin}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" />
                Generating...
              </>
            ) : (
              "Preview join"
            )}
          </Button>
        </div>
      </div>

      {showJoinPreview && (
        <div className="mt-2 border rounded p-2 text-xs overflow-auto max-h-80">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="border p-1 text-left">PCode</th>
                <th className="border p-1 text-left">Name</th>
                <th className="border p-1 text-right">A</th>
                <th className="border p-1 text-right">B</th>
                <th className="border p-1 text-right">Derived</th>
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

      <h3 className="text-sm font-semibold mt-4 mb-2">
        Step 3 — Downward Disaggregation (optional)
      </h3>
      <div className="grid grid-cols-4 gap-2 text-xs items-end mb-2">
        <div className="col-span-2">
          <label className="block text-xs font-semibold mb-1">
            Parent dataset (e.g., ADM3 poverty %)
          </label>
          <select className="w-full border rounded p-2 text-sm">
            <option value="">Select...</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Method</label>
          <select className="border rounded p-2 text-sm w-full">
            <option>Weighted (population)</option>
            <option>Equal split</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">From → To</label>
          <div className="flex space-x-1">
            <select className="border rounded p-1 text-xs w-1/2">
              {["ADM2", "ADM3", "ADM4"].map((lvl) => (
                <option key={lvl}>{lvl}</option>
              ))}
            </select>
            <select className="border rounded p-1 text-xs w-1/2">
              {["ADM3", "ADM4"].map((lvl) => (
                <option key={lvl}>{lvl}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <Button variant="link" size="sm">
        Preview disaggregation
      </Button>

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
