"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Play, Save, XCircle } from "lucide-react";

export default function CreateDerivedDatasetWizard_JoinAware({
  countryIso,
  onClose,
  editDataset,
}: {
  countryIso: string;
  onClose: () => void;
  editDataset?: any;
}) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [tableA, setTableA] = useState("");
  const [tableB, setTableB] = useState("");
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");
  const [method, setMethod] = useState("multiply");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [normalizePercent, setNormalizePercent] = useState(false);
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarBVal, setScalarBVal] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Load all available datasets
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id, title, admin_level, method")
        .eq("country_iso", countryIso);
      if (error) console.error(error);
      setDatasets(data || []);
    };
    load();
  }, [countryIso]);

  const handlePreview = async () => {
    if (!tableA || !colA || (!tableB && !useScalarB)) {
      setMessage("Please select both datasets and columns (or enable scalar).");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.rpc("resolve_parametric_dataset_v2", {
        p_derived_dataset_id: editDataset?.id || null,
        p_country_iso: countryIso,
        p_scalar_b_val: scalarBVal,
        p_normalize_percent: normalizePercent,
        p_debug: true,
      });

      if (error) throw error;
      setPreviewData(data || []);
      setMessage(`Preview generated (${data?.length || 0} rows).`);
    } catch (err: any) {
      console.error(err);
      setMessage("⚠️ Preview failed: " + err.message);
      setPreviewData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!tableA || !colA || (!tableB && !useScalarB)) {
      setMessage("Missing dataset selections or columns.");
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc("create_derived_dataset_v2", {
        p_table_a: tableA,
        p_table_b: tableB || null,
        p_col_a: colA,
        p_col_b: colB || null,
        p_country_iso: countryIso,
        p_method: method,
        p_target_level: targetLevel,
        p_use_scalar_b: useScalarB,
        p_scalar_b_val: scalarBVal,
        p_normalize_percent: normalizePercent,
        p_is_parametric: true,
      });

      if (error) throw error;

      setMessage("✅ Derived dataset created successfully!");
      setPreviewData([]);
      setTimeout(onClose, 1200);
    } catch (err: any) {
      console.error(err);
      setMessage("❌ Creation failed: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-4 text-sm">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-3">
        <h2 className="text-lg font-semibold text-[#640811]">
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-[#640811] transition"
        >
          <XCircle size={20} />
        </button>
      </div>

      {/* Dataset Selection */}
      <div className="grid grid-cols-2 gap-6">
        {/* Dataset A */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Dataset A
          </label>
          <select
            className="w-full border rounded px-2 py-1"
            value={tableA}
            onChange={(e) => setTableA(e.target.value)}
          >
            <option value="">Select dataset...</option>
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.title} ({ds.admin_level})
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Column name (e.g. population)"
            value={colA}
            onChange={(e) => setColA(e.target.value)}
            className="w-full border rounded px-2 py-1 mt-2"
          />
        </div>

        {/* Dataset B */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Dataset B
          </label>
          <select
            className="w-full border rounded px-2 py-1"
            value={tableB}
            onChange={(e) => setTableB(e.target.value)}
            disabled={useScalarB}
          >
            <option value="">Select dataset...</option>
            {datasets.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.title} ({ds.admin_level})
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Column name (e.g. area_sqkm)"
            value={colB}
            onChange={(e) => setColB(e.target.value)}
            className="w-full border rounded px-2 py-1 mt-2"
            disabled={useScalarB}
          />

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={useScalarB}
              onChange={(e) => setUseScalarB(e.target.checked)}
            />
            <span className="text-gray-700 text-xs">Use scalar instead</span>
          </div>
          {useScalarB && (
            <input
              type="number"
              placeholder="Scalar value"
              value={scalarBVal ?? ""}
              onChange={(e) => setScalarBVal(parseFloat(e.target.value))}
              className="w-full border rounded px-2 py-1 mt-2"
            />
          )}
        </div>
      </div>

      {/* Method & Options */}
      <div className="grid grid-cols-3 gap-4 mt-3">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Method</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="ratio">Ratio (A / B)</option>
            <option value="multiply">Multiply (A × B)</option>
            <option value="sum">Sum (A + B)</option>
            <option value="difference">Difference (A − B)</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Target Admin Level
          </label>
          <select
            className="w-full border rounded px-2 py-1"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
          >
            <option value="ADM1">ADM1</option>
            <option value="ADM2">ADM2</option>
            <option value="ADM3">ADM3</option>
            <option value="ADM4">ADM4</option>
          </select>
        </div>

        <div className="flex flex-col justify-center mt-4">
          <label className="flex items-center gap-2 text-gray-700 text-sm">
            <input
              type="checkbox"
              checked={normalizePercent}
              onChange={(e) => setNormalizePercent(e.target.checked)}
            />
            Normalize (%) divisor
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-5">
        <button
          onClick={handlePreview}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Play size={16} />}
          Preview
        </button>

        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#640811] text-white rounded hover:opacity-90 disabled:opacity-50"
        >
          {creating ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
          {editDataset ? "Update" : "Create"}
        </button>
      </div>

      {/* Feedback */}
      {message && (
        <div className="text-xs text-center text-gray-700 bg-gray-50 border rounded p-2">
          {message}
        </div>
      )}

      {/* Preview Table */}
      {previewData.length > 0 && (
        <div className="border rounded-md mt-4 max-h-72 overflow-y-auto text-xs">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                {Object.keys(previewData[0]).map((k) => (
                  <th key={k} className="p-1 text-left border-b">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, i) => (
                <tr key={i} className="border-b hover:bg-gray-50">
                  {Object.entries(row).map(([k, v], j) => (
                    <td key={j} className="p-1">
                      {v?.toString() ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
