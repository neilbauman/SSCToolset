"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

type DatasetOption = {
  id: string;
  title: string;
  table: string;
  type: "Core" | "Other" | "Derived" | "GIS";
  admin_level?: string;
  year?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
};

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso }: Props) {
  const sb = supabaseBrowser;
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("population");
  const [method, setMethod] = useState("ratio");
  const [decimals, setDecimals] = useState(0);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [preview, setPreview] = useState<any[]>([]);
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [includeCore, setIncludeCore] = useState(true);
  const [includeOther, setIncludeOther] = useState(true);
  const [includeDerived, setIncludeDerived] = useState(true);
  const [includeGIS, setIncludeGIS] = useState(true);

  // ---------- Load datasets ----------
  useEffect(() => {
    if (!open) return;
    const loadDatasets = async () => {
      const all: DatasetOption[] = [];

      // Core
      if (includeCore) {
        all.push({
          id: "core-admin",
          title: "Administrative Boundaries [Core]",
          table: "admin_units",
          type: "Core",
        });
        all.push({
          id: "core-pop",
          title: "Population Data [Core]",
          table: "population_data",
          type: "Core",
        });
      }

      // GIS
      if (includeGIS) {
        const { data: gis } = await sb
          .from("view_gis_status")
          .select("dataset_id,title,admin_level,year")
          .eq("country_iso", countryIso);
        gis?.forEach((g: any) =>
          all.push({
            id: g.dataset_id,
            title: g.title,
            table: `gis_dataset_${g.dataset_id}`,
            type: "GIS",
            admin_level: g.admin_level,
            year: g.year,
          })
        );
      }

      // Other
      if (includeOther) {
        const { data } = await sb
          .from("dataset_metadata")
          .select("id,title,admin_level,year")
          .eq("country_iso", countryIso);
        data?.forEach((d: any) =>
          all.push({
            id: d.id,
            title: d.title,
            table: `dataset_${d.id}`,
            type: "Other",
            admin_level: d.admin_level,
            year: d.year,
          })
        );
      }

      // Derived
      if (includeDerived) {
        const { data } = await sb
          .from("view_derived_dataset_summary")
          .select("derived_dataset_id,derived_title,admin_level,year")
          .eq("country_iso", countryIso);
        data?.forEach((d: any) =>
          all.push({
            id: d.derived_dataset_id,
            title: d.derived_title,
            table: `derived_${d.derived_dataset_id}`,
            type: "Derived",
            admin_level: d.admin_level,
            year: d.year,
          })
        );
      }

      setDatasets(all);
    };
    loadDatasets();
  }, [open, includeCore, includeOther, includeDerived, includeGIS, countryIso]);

  // ---------- Load taxonomy ----------
  useEffect(() => {
    if (!open) return;
    const loadTaxonomy = async () => {
      const { data } = await sb.from("taxonomy_terms").select("category,name");
      const grouped: Record<string, string[]> = {};
      data?.forEach((t: any) => {
        if (!grouped[t.category]) grouped[t.category] = [];
        grouped[t.category].push(t.name);
      });
      setCategories(grouped);
    };
    loadTaxonomy();
  }, [open]);

  // ---------- Preview join ----------
  const previewJoin = async () => {
    if (!datasetA) return;
    const { data, error } = await sb.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table,
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
    });
    if (!error && data) setPreview(data);
  };

  // ---------- Save derived dataset ----------
  const saveDerived = async () => {
    const { error } = await sb.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc,
      p_admin_level: targetLevel,
      p_table_a: datasetA?.table || null,
      p_table_b: useScalarB ? null : datasetB?.table || null,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: Object.keys(taxonomy),
      p_taxonomy_terms: Object.values(taxonomy).flat(),
      p_formula: `${method.toUpperCase()} of ${colA} and ${useScalarB ? scalarB : colB}`,
    });
    if (error) alert("Save failed: " + error.message);
    else {
      alert("Derived dataset created successfully.");
      onClose();
    }
  };

  if (!open) return null;

  const filteredDatasets = datasets.filter(
    (d) =>
      (includeCore && d.type === "Core") ||
      (includeOther && d.type === "Other") ||
      (includeDerived && d.type === "Derived") ||
      (includeGIS && d.type === "GIS")
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 text-[13px]">
      <div className="bg-white max-w-xl w-[90%] rounded-xl shadow-lg p-3 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-semibold">Create Derived Dataset</h2>
          <button onClick={onClose} className="text-gray-500 text-sm">✕</button>
        </div>

        {/* Title / Level / Year */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <input className="border p-1.5 rounded" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="border p-1.5 rounded" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)}>
            {["ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => <option key={lvl}>{lvl}</option>)}
          </select>
          <input className="border p-1.5 rounded" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>

        {/* Include toggles */}
        <div className="flex flex-wrap gap-2 mb-2">
          {[
            { label: "Core", val: includeCore, set: setIncludeCore },
            { label: "Other", val: includeOther, set: setIncludeOther },
            { label: "Derived", val: includeDerived, set: setIncludeDerived },
            { label: "GIS", val: includeGIS, set: setIncludeGIS },
          ].map((t) => (
            <label key={t.label} className="flex items-center gap-1">
              <input type="checkbox" checked={t.val} onChange={(e) => t.set(e.target.checked)} /> {t.label}
            </label>
          ))}
        </div>

        {/* Dataset selection */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <select
              className="border p-1.5 rounded w-full"
              value={datasetA?.id || ""}
              onChange={(e) => setDatasetA(filteredDatasets.find((x) => x.id === e.target.value) || null)}
            >
              <option value="">Select Dataset A</option>
              {filteredDatasets.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          <div>
            {!useScalarB ? (
              <select
                className="border p-1.5 rounded w-full"
                value={datasetB?.id || ""}
                onChange={(e) => setDatasetB(filteredDatasets.find((x) => x.id === e.target.value) || null)}
              >
                <option value="">Select Dataset B</option>
                {filteredDatasets.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                className="border p-1.5 rounded w-full text-right"
                value={scalarB}
                onChange={(e) => setScalarB(parseFloat(e.target.value))}
              />
            )}
          </div>
        </div>

        {/* Method / Decimals */}
        <div className="flex items-center gap-2 mb-2">
          <select className="border p-1.5 rounded" value={method} onChange={(e) => setMethod(e.target.value)}>
            {["ratio", "multiply", "sum", "difference"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select className="border p-1.5 rounded" value={decimals} onChange={(e) => setDecimals(parseInt(e.target.value))}>
            {[0, 1, 2].map((n) => (
              <option key={n}>{n} decimals</option>
            ))}
          </select>
          <label className="flex items-center gap-1 ml-auto">
            <input type="checkbox" checked={useScalarB} onChange={(e) => setUseScalarB(e.target.checked)} /> Scalar B
          </label>
          <button onClick={previewJoin} className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Preview</button>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="max-h-24 overflow-y-auto border rounded text-xs mb-3">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  {["Pcode", "Name", "A", "B", "Derived"].map((h) => (
                    <th key={h} className="p-1 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 4).map((r, i) => (
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
        )}

        {/* Taxonomy */}
        <div className="mb-3">
          <h3 className="text-sm font-semibold mb-1">Assign Taxonomy</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.keys(categories).map((cat) => (
              <div key={cat}>
                <label className="flex items-center gap-1 font-medium text-sm">
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
                  <div className="ml-4 mt-1 grid grid-cols-1 text-xs">
                    {categories[cat].map((t) => (
                      <label key={t} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={taxonomy[cat]?.includes(t)}
                          onChange={(e) => {
                            const nt = { ...taxonomy };
                            if (e.target.checked) nt[cat] = [...(nt[cat] || []), t];
                            else nt[cat] = nt[cat].filter((x) => x !== t);
                            setTaxonomy(nt);
                          }}
                        />{" "}
                        {t}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="border px-3 py-1 rounded text-xs">Cancel</button>
          <button onClick={saveDerived} className="bg-green-600 text-white px-3 py-1 rounded text-xs">
            Save Derived
          </button>
        </div>
      </div>
    </div>
  );
}
