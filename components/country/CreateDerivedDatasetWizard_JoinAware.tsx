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
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("area_sqkm");
  const [method, setMethod] = useState<"ratio" | "multiply" | "sum" | "difference">("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(2.5);
  const [decimals, setDecimals] = useState(3);
  const [preview, setPreview] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // ────────────────────────────────────────────────
  // 1️⃣ Load dataset options
  // ────────────────────────────────────────────────
  useEffect(() => {
    const loadDatasets = async () => {
      const all: DatasetOption[] = [
        { id: "core-admin", title: "Administrative Boundaries [core]", source: "core", table: "admin_units" },
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

      const { data: derived } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);

      if (derived)
        derived.forEach((d: any) =>
          all.push({ id: d.id, title: d.title, source: "derived", table: `derived_${d.id}` })
        );

      setDatasets(all);
    };

    if (open) loadDatasets();
  }, [open, countryIso]);

  // ────────────────────────────────────────────────
  // 2️⃣ Load taxonomy
  // ────────────────────────────────────────────────
  useEffect(() => {
    const loadTaxonomy = async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      if (!data) return;
      const grouped: Record<string, string[]> = {};
      data.forEach((t) => {
        if (!grouped[t.category]) grouped[t.category] = [];
        grouped[t.category].push(t.name);
      });
      setCategories(grouped);
    };
    if (open) loadTaxonomy();
  }, [open]);

  // ────────────────────────────────────────────────
  // 3️⃣ Load existing dataset (edit mode)
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!editDataset) return;
    setTitle(editDataset.title || "");
    setDesc(editDataset.description || "");
    setTargetLevel(editDataset.admin_level || "ADM3");
    setMethod(editDataset.method || "ratio");
    setColA(editDataset.col_a || "population");
    setColB(editDataset.col_b || "area_sqkm");
    setUseScalarB(editDataset.use_scalar_b || false);
    setScalarB(editDataset.scalar_b_val || 1);
    setDecimals(editDataset.decimals || 3);
    setTaxonomy(
      editDataset.taxonomy_categories?.reduce((acc: any, cat: string, i: number) => {
        acc[cat] = editDataset.taxonomy_terms?.filter((t: string) => t.includes(cat)) || [];
        return acc;
      }, {}) || {}
    );
  }, [editDataset]);

  // ────────────────────────────────────────────────
  // 4️⃣ Preview join — calls new RPC
  // ────────────────────────────────────────────────
  async function previewJoin() {
    if (!countryIso || !targetLevel) return alert("Missing parameters");
    setLoadingPreview(true);

    const { data, error } = await supabase.rpc("simulate_join_preview_pd_dynamic", {
      p_country_iso: countryIso,
      p_target_level: targetLevel,
    });

    setLoadingPreview(false);

    if (error) {
      console.error("Preview error:", error);
      return alert("Preview error: " + error.message);
    }
    setPreview(data || []);
  }

  // ────────────────────────────────────────────────
  // 5️⃣ Save derived dataset (create or update)
  // ────────────────────────────────────────────────
  async function saveDerived() {
    setSaving(true);
    const { data, error } = await supabase.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc,
      p_admin_level: targetLevel,
      p_table_a: "population_data",
      p_table_b: "gis_features",
      p_col_a: "population",
      p_col_b: "area_sqkm",
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: Object.keys(taxonomy),
      p_taxonomy_terms: Object.values(taxonomy).flat(),
      p_formula: `${colA} ${method} ${useScalarB ? scalarB : colB}`,
    });

    setSaving(false);
    if (error) return alert("Save failed: " + error.message);
    alert("✅ Derived dataset saved successfully.");
    onClose();
  }

  if (!open) return null;

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Title, Description, Admin Level */}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <select
            className="border p-1 rounded"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
          >
            {["ADM4", "ADM3", "ADM2", "ADM1", "ADM0"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
        </div>

        {/* Auto-locked source columns */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium">Column A (Population)</label>
            <input
              className="border p-1 w-full rounded bg-gray-100 text-gray-600"
              value="population"
              disabled
            />
          </div>
          <div>
            <label className="text-xs font-medium">Column B (Area km²)</label>
            <input
              className="border p-1 w-full rounded bg-gray-100 text-gray-600"
              value="area_sqkm"
              disabled
            />
          </div>
        </div>

        {/* Method + Preview */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs">Method:</span>
          {["ratio", "multiply", "sum", "difference"].map((m) => (
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
            {loadingPreview ? "Loading..." : "Preview"}
          </button>
        </div>

        <p className="text-xs italic mb-2">
          Derived = A.population {method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "-"} B.area_sqkm
        </p>

        {/* Preview Table */}
        <div className="max-h-60 overflow-y-auto border rounded mb-4 text-xs">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1 text-left">Pcode</th>
                <th className="p-1 text-left">Name</th>
                <th className="p-1 text-right">A (Pop)</th>
                <th className="p-1 text-right">B (Area)</th>
                <th className="p-1 text-right">Derived</th>
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center italic text-gray-500 py-3">
                    No preview data
                  </td>
                </tr>
              ) : (
                preview.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-1">{r.out_pcode}</td>
                    <td className="p-1">{r.place_name}</td>
                    <td className="p-1 text-right">{r.a?.toLocaleString()}</td>
                    <td className="p-1 text-right">{r.b?.toLocaleString()}</td>
                    <td className="p-1 text-right">{r.derived?.toFixed(decimals)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.keys(categories).map((cat) => (
            <div key={cat}>
              <label className="flex items-center gap-1 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={!!taxonomy[cat]}
                  onChange={(e) => {
                    const t = { ...taxonomy };
                    if (e.target.checked) t[cat] = [];
                    else delete t[cat];
                    setTaxonomy(t);
                  }}
                />{" "}
                {cat}
              </label>
              {taxonomy[cat] && (
                <div className="ml-3 mt-1 grid grid-cols-1">
                  {categories[cat].map((term) => (
                    <label key={term} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={taxonomy[cat]?.includes(term)}
                        onChange={(e) => {
                          const t = { ...taxonomy };
                          if (e.target.checked) t[cat] = [...(t[cat] || []), term];
                          else t[cat] = t[cat].filter((x) => x !== term);
                          setTaxonomy(t);
                        }}
                      />{" "}
                      {term}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={saveDerived}
            disabled={saving}
            className="px-3 py-1 bg-[#640811] text-white rounded"
          >
            {saving ? "Saving..." : editDataset ? "Save Changes" : "Save Derived"}
          </button>
        </div>
      </div>
    </div>
  );
}
