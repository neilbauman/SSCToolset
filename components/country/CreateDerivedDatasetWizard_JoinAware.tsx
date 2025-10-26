"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Button } from "@/components/ui/button";

type DatasetOption = {
  id: string;
  title: string;
  table_name: string;
  admin_level: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: any | null;
  refreshList?: () => void;
}

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  editDataset,
  refreshList,
}: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [adminLevel, setAdminLevel] = useState("ADM3");
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarValue, setScalarValue] = useState<number | null>(null);
  const [method, setMethod] = useState("ratio");
  const [decimals, setDecimals] = useState(0);
  const [isDynamic, setIsDynamic] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Load available datasets
  useEffect(() => {
    if (!open) return;
    const fetchDatasets = async () => {
      const { data, error } = await supabase
        .from("datasets_catalogue")
        .select("id, title, table_name, admin_level")
        .order("title");
      if (!error && data) setDatasets(data as DatasetOption[]);
    };
    fetchDatasets();
  }, [open]);

  // 🔹 Pre-populate when editing
  useEffect(() => {
    if (editDataset) {
      setTitle(editDataset.title || "");
      setDescription(editDataset.description || "");
      setAdminLevel(editDataset.admin_level || "ADM3");
      setMethod(editDataset.method || "ratio");
      setUseScalarB(editDataset.use_scalar_b || false);
      setScalarValue(editDataset.scalar_b_val || null);
      setDecimals(editDataset.decimals || 0);
      setIsDynamic(editDataset.dynamic_resolution || false);
    }
  }, [editDataset]);

  // 🔹 Preview derived output
  const handlePreview = async () => {
    if (!datasetA) return alert("Select Dataset A first.");
    setLoading(true);
    setPreviewData([]);

    const { data, error } = await supabase.rpc(
      "simulate_join_preview_autoaggregate",
      {
        p_table_a: datasetA.table_name,
        p_col_a: "population",
        p_table_b: useScalarB ? null : datasetB?.table_name,
        p_col_b: useScalarB ? null : "area_sqkm",
        p_country: countryIso,
        p_method: method,
        p_use_scalar_b: useScalarB,
        p_scalar_b_val: useScalarB ? scalarValue : null,
        p_target_level: adminLevel,
      }
    );

    setLoading(false);
    if (error) {
      console.error(error);
      alert(`Preview error: ${error.message}`);
    } else if (data) {
      setPreviewData(data);
    }
  };

  // 🔹 Save / Update derived dataset
  const handleSave = async () => {
    if (!title || !datasetA) {
      alert("Please complete all required fields before saving.");
      return;
    }

    const { data, error } = await supabase.rpc(
      "create_or_update_derived_dataset",
      {
        p_country_iso: countryIso,
        p_title: title,
        p_description: description || null,
        p_admin_level: adminLevel,
        p_table_a: datasetA?.table_name || null,
        p_table_b: useScalarB ? null : datasetB?.table_name || null,
        p_col_a: "population",
        p_col_b: useScalarB ? null : "area_sqkm",
        p_use_scalar_b: useScalarB,
        p_scalar_b_val: useScalarB ? scalarValue || 1 : null,
        p_method: method,
        p_decimals: decimals ?? 0,
        p_dynamic_resolution: isDynamic,
        p_formula: useScalarB
          ? `A.population ÷ ${scalarValue}`
          : `A.population ÷ B.area_sqkm`,
        p_taxonomy_categories: [],
        p_taxonomy_terms: [],
        p_id: editDataset?.id || null,
      }
    );

    if (error) {
      console.error(error);
      alert(`Save failed: ${error.message}`);
    } else {
      alert("✅ Derived dataset saved successfully.");
      refreshList?.();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-full max-w-4xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">
          {editDataset ? "Edit" : "Create"} Derived Dataset
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            className="border p-2 rounded"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            className="border p-2 rounded"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={adminLevel}
            onChange={(e) => setAdminLevel(e.target.value)}
          >
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDynamic}
              onChange={() => setIsDynamic(!isDynamic)}
            />
            Dynamic (auto-refresh / parametric)
          </label>
        </div>

        {/* Dataset selectors */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          {[["Dataset A", datasetA, setDatasetA], ["Dataset B", datasetB, setDatasetB]].map(
            ([label, ds, setDs], i) => (
              <div key={i} className="flex-1">
                <label className="font-medium text-xs">{label}</label>
                <select
                  className="border p-1 rounded w-full disabled:bg-gray-100"
                  disabled={useScalarB && label === "Dataset B"}
                  value={(ds as DatasetOption | null)?.id || ""}
                  onChange={(e) => {
                    const opt = datasets.find((d) => d.id === e.target.value) || null;
                    (setDs as any)(opt);
                  }}
                >
                  <option value="">Select {label}</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} [{d.admin_level}]
                    </option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>

        {/* Scalar toggle */}
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={useScalarB}
            onChange={(e) => setUseScalarB(e.target.checked)}
          />
          <span className="text-sm">Use scalar instead of Dataset B</span>
          {useScalarB && (
            <input
              type="number"
              className="border p-1 rounded w-24 ml-2"
              value={scalarValue ?? ""}
              placeholder="Scalar"
              onChange={(e) => setScalarValue(parseFloat(e.target.value))}
            />
          )}
        </div>

        {/* Method + decimals */}
        <div className="flex items-center gap-2 mb-3">
          {["ratio", "multiply", "sum", "difference"].map((m) => (
            <Button
              key={m}
              variant={method === m ? "default" : "outline"}
              onClick={() => setMethod(m)}
            >
              {m}
            </Button>
          ))}
          <select
            className="border p-1 rounded ml-auto"
            value={decimals}
            onChange={(e) => setDecimals(parseInt(e.target.value))}
          >
            {[0, 1, 2, 3].map((d) => (
              <option key={d}>{d} decimals</option>
            ))}
          </select>
          <Button onClick={handlePreview} disabled={loading}>
            {loading ? "Loading…" : "Preview"}
          </Button>
        </div>

        {/* Preview table */}
        <div className="border rounded max-h-60 overflow-y-auto mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1">Pcode</th>
                <th className="p-1">Name</th>
                <th className="p-1">A</th>
                <th className="p-1">B</th>
                <th className="p-1">Derived</th>
              </tr>
            </thead>
            <tbody>
              {previewData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-2 text-gray-400">
                    No preview data
                  </td>
                </tr>
              ) : (
                previewData.map((row, i) => (
                  <tr key={i}>
                    <td className="p-1">{row.out_pcode}</td>
                    <td className="p-1">{row.place_name}</td>
                    <td className="p-1 text-right">{row.a}</td>
                    <td className="p-1 text-right">{row.b}</td>
                    <td className="p-1 text-right">{row.derived}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Derived</Button>
        </div>
      </div>
    </div>
  );
}
