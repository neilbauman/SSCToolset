"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type DatasetOption = {
  id: string;
  title: string;
  dataset_type: string;
  admin_level: string;
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
  countryIso,
  onClose,
}: {
  countryIso: string;
  onClose: () => void;
}) {
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

  // Fetch available datasets
  useEffect(() => {
    const fetchDatasets = async () => {
      const { data } = await supabase
        .from("dataset_metadata")
        .select("id, dataset_title as title, dataset_type, admin_level, dataset_title")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .order("dataset_title");
      const rows = (data || []).map((d) => ({
        ...d,
        table_name: d.title.replace(/\s+/g, "_").toLowerCase(),
      }));
      setDatasets(rows);
    };
    fetchDatasets();
  }, [countryIso]);

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

  return (
    <div className="p-4 w-full max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold mb-2">Create Derived Dataset</h2>
      <p className="text-xs text-gray-600 mb-4">Step 1 Join Alignment → Step 2 Derivation</p>

      <label className="flex items-center space-x-2 mb-4 text-sm">
        <input
          type="checkbox"
          checked={includeGIS}
          onChange={(e) => setIncludeGIS(e.target.checked)}
        />
        <span>Include GIS datasets</span>
      </label>

      {/* Step 1 */}
      <h3 className="text-sm font-semibold mb-2">Step 1 Join Alignment</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
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
          <div className="flex space-x-2 mt-2">
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
          </div>
          <div className="flex space-x-2 mt-2">
            <label className="text-xs">Admin Level</label>
            <select
              value={datasetA?.admin_level || "ADM4"}
              onChange={(e) => setTargetLevel(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="ADM0">ADM0</option>
              <option value="ADM1">ADM1</option>
              <option value="ADM2">ADM2</option>
              <option value="ADM3">ADM3</option>
              <option value="ADM4">ADM4</option>
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
              <p>Preview of {datasetA?.title}</p>
              <p className="italic text-gray-500">[dataset preview here]</p>
            </div>
          )}
        </div>

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
          <div className="flex space-x-2 mt-2">
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
          </div>
          <div className="flex space-x-2 mt-2">
            <label className="text-xs">Admin Level</label>
            <select
              value={datasetB?.admin_level || "ADM4"}
              onChange={(e) => setTargetLevel(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="ADM0">ADM0</option>
              <option value="ADM1">ADM1</option>
              <option value="ADM2">ADM2</option>
              <option value="ADM3">ADM3</option>
              <option value="ADM4">ADM4</option>
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
              <p>Preview of {datasetB?.title}</p>
              <p className="italic text-gray-500">[dataset preview here]</p>
            </div>
          )}
        </div>
      </div>

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

      {showJoinPreview && (
        <div className="mt-2 border rounded p-2 text-xs overflow-auto max-h-96">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-left p-1 border">PCode</th>
                <th className="text-left p-1 border">Name</th>
                <th className="text-right p-1 border">A</th>
                <th className="text-right p-1 border">B</th>
                <th className="text-right p-1 border">Derived</th>
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
      <h3 className="text-sm font-semibold mt-4 mb-2">
        Step 2 Derivation / Aggregation
      </h3>
      <div className="flex items-center space-x-2 mb-2">
        <span className="text-xs">Formula:</span>
        <span className="text-xs font-semibold">
          {datasetA?.title || "A"} {method} {datasetB?.title || "B"} → target{" "}
          {targetLevel}
        </span>
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
        <Button>Create</Button>
      </div>
    </div>
  );
}
