"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type DatasetOption = { id: string; title: string; source: Source; table: string };

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: any | null;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  editDataset = null,
}: Props) {
  const isEdit = !!editDataset;
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [method, setMethod] = useState<"ratio" | "multiply" | "sum" | "difference">("ratio");
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("area_sqkm");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDatasets = async () => {
      const all: DatasetOption[] = [
        { id: "core-admin", title: "Admin Boundaries [core]", source: "core", table: "admin_units" },
        { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data" },
        { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features" },
      ];
      const { data: others } = await supabase
        .from("dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);
      if (others)
        others.forEach((d: any) =>
          all.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` })
        );
      setDatasets(all);
    };
    if (open) loadDatasets();
  }, [open, countryIso]);

  useEffect(() => {
    if (isEdit && editDataset) {
      setTitle(editDataset.title || "");
      setDesc(editDataset.description || "");
      setMethod(editDataset.method || "ratio");
      setTargetLevel(editDataset.admin_level || "ADM3");
    }
  }, [isEdit, editDataset]);

  async function previewJoin() {
    if (!datasetA || !datasetB) return alert("Select datasets first");
    setLoading(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table,
      p_table_b: datasetB.table,
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: false,
      p_scalar_b_val: 1,
    });
    setLoading(false);
    if (error) return alert("Preview failed: " + error.message);
    setPreview(data || []);
  }

  async function saveDerived() {
    const fn = isEdit ? "update_derived_dataset" : "create_derived_dataset";
    const { error } = await supabase.rpc(fn, {
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc,
      p_admin_level: targetLevel,
      p_table_a: datasetA?.table,
      p_table_b: datasetB?.table,
      p_col_a: colA,
      p_col_b: colB,
      p_method: method,
      p_formula: `${colA} ${method} ${colB}`,
    });
    if (error) return alert("Save failed: " + error.message);
    alert(isEdit ? "✅ Dataset updated!" : "✅ Dataset created!");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">
          {isEdit ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Basic Info */}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Description"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          <select
            className="border p-1 rounded"
            value={targetLevel}
            onChange={e => setTargetLevel(e.target.value)}
          >
            {["ADM1", "ADM2", "ADM3", "ADM4"].map(l => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Dataset selectors */}
        <div className="flex flex-wrap gap-2 mb-3">
          {[["Dataset A", datasetA, setDatasetA], ["Dataset B", datasetB, setDatasetB]].map(
            ([label, ds, setDs], i) => (
              <div key={i} className="flex-1">
                <label className="font-medium text-xs">{label}</label>
                <select
                  className="border p-1 rounded w-full"
                  value={(ds as DatasetOption | null)?.id || ""}
                  onChange={e => setDs(datasets.find(x => x.id === e.target.value) || null)}
                >
                  <option value="">Select {label}</option>
                  {datasets.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}
        </div>

        {/* Methods */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs">Method:</span>
          {["ratio", "multiply", "sum", "difference"].map(m => (
            <button
              key={m}
              onClick={() => setMethod(m as any)}
              className={`px-2 py-1 border rounded ${
                method === m ? "bg-[#640811] text-white" : ""
              }`}
            >
              {m}
            </button>
          ))}
          <button
            onClick={previewJoin}
            className="ml-auto px-3 py-1 bg-[#640811] text-white rounded"
          >
            {loading ? "Loading..." : "Preview"}
          </button>
        </div>

        <p className="text-xs italic mb-2">
          Derived = A.{colA} {method} B.{colB}
        </p>

        {/* Preview Table */}
        <div className="max-h-48 overflow-y-auto border rounded mb-4 text-xs">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1 text-left">Pcode</th>
                <th className="p-1 text-left">Name</th>
                <th className="p-1 text-right">A</th>
                <th className="p-1 text-right">B</th>
                <th className="p-1 text-right">Derived</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{r.out_pcode}</td>
                  <td className="p-1">{r.place_name}</td>
                  <td className="p-1 text-right">{r.a}</td>
                  <td className="p-1 text-right">{r.b}</td>
                  <td className="p-1 text-right">{r.derived}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={saveDerived}
            className="px-3 py-1 bg-[#640811] text-white rounded"
          >
            {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
