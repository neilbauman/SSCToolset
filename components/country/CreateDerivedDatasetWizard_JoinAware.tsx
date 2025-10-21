"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function CreateDerivedDatasetWizard_JoinAware({
  open, onClose, countryIso
}: { open: boolean; onClose: () => void; countryIso: string }) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [datasetA, setA] = useState<any | null>(null);
  const [datasetB, setB] = useState<any | null>(null);
  const [useScalar, setUseScalar] = useState(false);
  const [scalarVal, setScalarVal] = useState(1);
  const [method, setMethod] = useState("ratio");
  const [decimals, setDecimals] = useState(0);
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [peekA, setPeekA] = useState<any[]>([]);
  const [peekB, setPeekB] = useState<any[]>([]);
  const [showTaxonomy, setShowTaxonomy] = useState(true);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const list: any[] = [];
      const add = (src: string, title: string, table: string) => list.push({ src, title, table });
      add("core", "Administrative Boundaries", "admin_units");
      add("core", "Population Data", "population_data");
      add("core", "GIS Features", "gis_features");
      const { data: others } = await supabase.from("dataset_metadata").select("title,table_name,source").eq("country_iso", countryIso);
      const { data: derived } = await supabase.from("derived_datasets").select("title,id").eq("country_iso", countryIso);
      others?.forEach((d) => add(d.source || "other", d.title, d.table_name));
      derived?.forEach((d) => add("derived", d.title, d.id));
      setDatasets(list);
      const { data: tax } = await supabase.from("taxonomy_terms").select("category,name");
      const grouped = (tax || []).reduce((a: any, t: any) => {
        a[t.category] = a[t.category] || [];
        a[t.category].push(t.name);
        return a;
      }, {});
      setTaxonomy(grouped);
    })();
  }, [open, countryIso]);

  const handlePeek = async (ds: any, side: "A" | "B") => {
    if (!ds) return;
    const { data, error } = await supabase.from(ds.table).select("pcode,name,population").limit(10);
    if (error) return alert(error.message);
    side === "A" ? setPeekA(data || []) : setPeekB(data || []);
  };

  const handleSave = async () => {
    const { error } = await supabase.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: `${datasetA?.title || "A"} ${method} ${useScalar ? scalarVal : datasetB?.title || "B"}`,
      p_description: "Derived dataset",
      p_admin_level: "ADM4",
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: selectedCats,
      p_taxonomy_terms: selectedTerms,
    });
    if (error) return alert("Save failed: " + error.message);
    alert("Saved successfully!");
    onClose();
  };

  const toggleCat = (c: string) =>
    setSelectedCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const toggleTerm = (t: string) =>
    setSelectedTerms((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-5xl rounded-lg shadow-lg p-4 max-h-[90vh] overflow-y-auto text-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Create Derived Dataset</h2>
          <button onClick={onClose} className="text-xs text-gray-600 underline">Close</button>
        </div>

        <div className="flex gap-3 mb-3">
          <button className="border rounded px-2 py-1" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          <button className="border rounded px-2 py-1" onClick={() => setShowTaxonomy(!showTaxonomy)}>
            {showTaxonomy ? "Hide Taxonomy" : "Show Taxonomy"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          {[
            { label: "Dataset A", ds: datasetA, set: setA, rows: peekA },
            { label: "Dataset B", ds: datasetB, set: setB, rows: peekB },
          ].map(({ label, ds, set, rows }, i) =>
            i === 0 || !useScalar ? (
              <div key={label} className="border rounded p-2">
                <div className="flex justify-between items-center">
                  <label className="font-medium text-xs">{label}</label>
                  {i === 1 && (
                    <label className="text-xs flex items-center gap-1">
                      <input type="checkbox" checked={useScalar} onChange={(e) => setUseScalar(e.target.checked)} />
                      Use scalar
                    </label>
                  )}
                </div>
                <select
                  className="w-full border rounded mt-1 p-1 text-xs"
                  value={ds?.table || ""}
                  onChange={(e) => {
                    const found = datasets.find((d) => d.table === e.target.value);
                    set(found || null);
                  }}
                >
                  <option value="">Select dataset...</option>
                  {["core", "other", "derived"].map((cat) => (
                    <optgroup key={cat} label={cat.toUpperCase()}>
                      {datasets
                        .filter((d) => d.src === cat)
                        .map((d) => (
                          <option key={d.table} value={d.table}>
                            {d.title}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>

                {i === 1 && useScalar && (
                  <input
                    type="number"
                    className="w-full border rounded mt-1 p-1 text-xs"
                    value={scalarVal}
                    onChange={(e) => setScalarVal(parseFloat(e.target.value))}
                  />
                )}
                <button onClick={() => handlePeek(ds, i === 0 ? "A" : "B")} className="text-xs underline text-blue-600 mt-1">
                  Peek
                </button>

                {showPreview && rows.length > 0 && (
                  <div className="border mt-1 max-h-24 overflow-y-auto text-[11px]">
                    {rows.map((r: any, j: number) => (
                      <div key={j} className="grid grid-cols-3 px-2 py-0.5 border-b">
                        <span>{r.pcode}</span><span>{r.name}</span><span>{r.population}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <label className="text-xs">Math:</label>
          <select className="border rounded p-1 text-xs" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="multiply">Multiply</option>
            <option value="ratio">Ratio</option>
            <option value="sum">Sum</option>
            <option value="difference">Difference</option>
          </select>
          <label className="text-xs ml-2">Decimals:</label>
          <input
            type="number"
            className="w-16 border rounded p-1 text-xs"
            value={decimals}
            onChange={(e) => setDecimals(parseInt(e.target.value))}
          />
        </div>

        {showTaxonomy && (
          <div className="border rounded p-2 max-h-48 overflow-y-auto mb-3">
            {Object.entries(taxonomy).map(([cat, terms]) => (
              <div key={cat} className="mb-2">
                <label className="font-semibold text-xs flex items-center gap-1">
                  <input type="checkbox" checked={selectedCats.includes(cat)} onChange={() => toggleCat(cat)} />
                  {cat}
                </label>
                {selectedCats.includes(cat) && (
                  <div className="ml-4 mt-1 grid grid-cols-2 gap-1">
                    {terms.map((t) => (
                      <label key={t} className="text-xs flex items-center gap-1">
                        <input type="checkbox" checked={selectedTerms.includes(t)} onChange={() => toggleTerm(t)} />
                        {t}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}
