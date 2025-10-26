"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, RefreshCw, X } from "lucide-react";

type Source = "core" | "other" | "derived" | "gis";
type DatasetOption = { id: string; title: string; source: Source; table: string };
type Props = { open: boolean; onClose: () => void; countryIso: string; editDataset?: any };

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso, editDataset }: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("area_sqkm");
  const [method, setMethod] = useState<"ratio" | "multiply" | "sum" | "difference">("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [decimals, setDecimals] = useState(2);
  const [dynamic, setDynamic] = useState(true);
  const [preview, setPreview] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM4");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const base: DatasetOption[] = [
        { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data" },
        { id: "core-gis", title: "GIS Features [core]", source: "core", table: "gis_features" },
        { id: "core-admin", title: "Administrative Units [core]", source: "core", table: "admin_units" },
      ];
      const { data: others } = await supabase.from("dataset_metadata").select("id,title").eq("country_iso", countryIso);
      if (others)
        others.forEach((d: any) =>
          base.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` })
        );
      const { data: derived } = await supabase.from("derived_dataset_metadata").select("id,title").eq("country_iso", countryIso);
      if (derived)
        derived.forEach((d: any) =>
          base.push({ id: d.id, title: d.title, source: "derived", table: `derived_${d.id}` })
        );
      setDatasets(base);
    };
    load();
  }, [open, countryIso]);

  useEffect(() => {
    if (editDataset) {
      setTitle(editDataset.title);
      setDesc(editDataset.description || "");
      setTargetLevel(editDataset.admin_level);
      setMethod(editDataset.method);
      setUseScalarB(editDataset.use_scalar_b);
      setScalarB(editDataset.scalar_b_val || 1);
      setDecimals(editDataset.decimals || 2);
      setDynamic(editDataset.dynamic_resolution);
    }
  }, [editDataset]);

  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select both datasets");
    setRefreshing(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table,
      p_table_b: datasetB?.table,
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
    });
    setRefreshing(false);
    if (error) alert("Preview error: " + error.message);
    else setPreview(data || []);
  }

  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select both datasets");
    const { error } = await supabase.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc,
      p_admin_level: targetLevel,
      p_table_a: datasetA.table,
      p_col_a: colA,
      p_method: method,
      p_table_b: datasetB?.table || null,
      p_col_b: colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
      p_decimals: decimals,
      p_dynamic_resolution: dynamic,
      p_formula: `${colA} ${method} ${useScalarB ? scalarB : colB}`,
      p_id: editDataset?.id || null, // ✅ supports edit mode
    });
    if (error) alert("Save failed: " + error.message);
    else {
      alert("✅ Derived dataset saved successfully");
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-[95%] max-w-4xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">{editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}</h2>

        {/* Title + Desc */}
        <div className="flex gap-2 mb-3">
          <input className="border p-1 flex-1 rounded" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="border p-1 flex-1 rounded" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
          <select className="border p-1 rounded" value={targetLevel} onChange={e => setTargetLevel(e.target.value)}>
            {["ADM1","ADM2","ADM3","ADM4"].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Dataset selectors */}
<div className="flex flex-wrap gap-2 mb-3">
  {([
    { label: "Dataset A", ds: datasetA, setDs: setDatasetA },
    { label: "Dataset B", ds: datasetB, setDs: setDatasetB },
  ] as { label: string; ds: DatasetOption | null; setDs: (v: DatasetOption | null) => void }[]).map(
    ({ label, ds, setDs }, i) => (
      <div key={i} className="flex-1">
        <label className="font-medium text-xs">{label}</label>
        <select
          className="border p-1 rounded w-full"
          value={ds?.id || ""}
          onChange={(e) =>
            setDs(datasets.find((x) => x.id === e.target.value) || null)
          }
        >
          <option value="">Select {label}</option>
          {["core", "other", "derived", "gis"].map((group) => (
            <optgroup key={group} label={group.toUpperCase()}>
              {datasets
                .filter((d) => d.source === group)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
    )
  )}
</div>
        

        {/* Method & Controls */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs">Method:</span>
          {["ratio", "multiply", "sum", "difference"].map(m => (
            <button key={m} onClick={() => setMethod(m as any)} className={`px-2 py-1 border rounded ${method===m?"bg-[#640811] text-white":""}`}>{m}</button>
          ))}
          <label className="ml-4 text-xs flex items-center gap-1">
            <input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)} /> Use scalar
          </label>
          {useScalarB && (
            <input type="number" value={scalarB} onChange={e=>setScalarB(parseFloat(e.target.value))} className="border rounded w-20 text-right p-1" />
          )}
          <label className="ml-4 text-xs flex items-center gap-1">
            <input type="checkbox" checked={dynamic} onChange={e=>setDynamic(e.target.checked)} /> Dynamic (join on save)
          </label>
          <button onClick={previewJoin} className="ml-auto px-3 py-1 bg-[#640811] text-white rounded">
            {refreshing ? "Loading…" : "Preview"}
          </button>
        </div>

        {/* Preview */}
        <div className="border rounded mb-3 max-h-56 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr><th>Pcode</th><th>Name</th><th>A</th><th>B</th><th>Derived</th></tr>
            </thead>
            <tbody>
              {preview.map((r,i)=>(
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

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={saveDerived} className="px-3 py-1 bg-[#640811] text-white rounded">Save Derived</button>
        </div>
      </div>
    </div>
  );
}
