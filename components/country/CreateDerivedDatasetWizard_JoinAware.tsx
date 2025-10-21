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
  const [scalarVal, setScalarVal] = useState<number>(1);
  const [method, setMethod] = useState("multiply");
  const [decimals, setDecimals] = useState(0);
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [peekA, setPeekA] = useState<any[]>([]);
  const [peekB, setPeekB] = useState<any[]>([]);
  const [showTax, setShowTax] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const all: any[] = [];
      const push = (src: string, title: string, table: string) => all.push({ src, title, table });
      push("core", "Administrative Boundaries", "admin_units");
      push("core", "Population Data", "population_data");
      push("core", "GIS Features", "gis_features");
      const { data } = await supabase.from("dataset_metadata").select("title,table_name,source").eq("country_iso", countryIso);
      const { data: derived } = await supabase.from("derived_datasets").select("title,id").eq("country_iso", countryIso);
      data?.forEach((d) => all.push({ src: d.source || "other", title: d.title, table: d.table_name }));
      derived?.forEach((d) => all.push({ src: "derived", title: d.title, table: d.id }));
      setDatasets(all);
      const { data: tax } = await supabase.from("taxonomy_terms").select("category,name");
      const grouped = (tax || []).reduce((acc: any, t: any) => {
        acc[t.category] = acc[t.category] || [];
        acc[t.category].push(t.name);
        return acc;
      }, {});
      setTaxonomy(grouped);
    })();
  }, [open, countryIso]);

  const handlePeek = async (ds: any, side: "A" | "B") => {
    if (!ds) return;
    const { data, error } = await supabase.from(ds.table).select("pcode,name,population").limit(6);
    if (error) return alert(error.message);
    side === "A" ? setPeekA(data || []) : setPeekB(data || []);
  };

  const handleSave = async () => {
    const { data, error } = await supabase.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: `${datasetA?.title || "A"} × ${useScalar ? scalarVal : datasetB?.title || "B"}`,
      p_description: "Derived via join wizard",
      p_admin_level: "ADM4",
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: selectedCats,
      p_taxonomy_terms: selectedTerms,
    });
    if (error) return alert("Save failed: " + error.message);
    alert("Saved derived dataset!");
    onClose();
  };

  const toggleCat = (cat: string) =>
    setSelectedCats((p) => (p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]));
  const toggleTerm = (term: string) =>
    setSelectedTerms((p) => (p.includes(term) ? p.filter((t) => t !== term) : [...p, term]));

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg p-4 max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-2">Create Derived Dataset</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <button onClick={() => setShowPreview(!showPreview)} className="border rounded px-2 py-1">{showPreview ? "Hide Preview" : "Show Preview"}</button>
          <button onClick={() => setShowTax(!showTax)} className="border rounded px-2 py-1">{showTax ? "Hide Taxonomy" : "Show Taxonomy"}</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
          {[["Dataset A", datasetA, setA, peekA], ["Dataset B", datasetB, setB, peekB]].map(
            ([label, ds, setDs, rows]: any, i) =>
              (i === 0 || !useScalar) && (
                <div key={label as string} className="border rounded p-2">
                  <label className="font-medium text-xs">{label as string}</label>
                  <select
                    className="w-full border rounded mt-1 p-1 text-xs"
                    value={ds?.table || ""}
                    onChange={(e) => {
                      const found = datasets.find((d) => d.table === e.target.value);
                      setDs(found || null);
                    }}
                  >
                    <option value="">Select dataset...</option>
                    {["core", "other", "derived"].map((cat) => (
                      <optgroup key={cat} label={cat.toUpperCase()}>
                        {datasets.filter((d) => d.src === cat).map((d) => (
                          <option key={d.table} value={d.table}>{d.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className="flex justify-between mt-1 items-center">
                    <button onClick={() => handlePeek(ds, i === 0 ? "A" : "B")} className="text-xs underline text-blue-600">Peek</button>
                    {i === 1 && (
                      <label className="text-xs flex items-center gap-1">
                        <input type="checkbox" checked={useScalar} onChange={(e) => setUseScalar(e.target.checked)} />
                        Use scalar
                      </label>
                    )}
                  </div>
                  {i === 1 && useScalar && (
                    <input type="number" className="w-full border rounded mt-1 p-1 text-xs" value={scalarVal} onChange={(e) => setScalarVal(parseFloat(e.target.value))} />
                  )}
                  {rows.length > 0 && showPreview && (
                    <div className="border mt-1 max-h-24 overflow-y-auto text-[11px]">
                      {rows.map((r: any, j: number) => (
                        <div key={j} className="grid grid-cols-3 px-2 py-0.5 border-b">
                          <span>{r.pcode}</span><span>{r.name}</span><span>{r.population}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
          )}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs">Math:</label>
          <select className="border rounded p-1 text-xs" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="multiply">Multiply</option>
            <option value="ratio">Ratio</option>
            <option value="sum">Sum</option>
            <option value="difference">Difference</option>
          </select>
          <label className="text-xs ml-2">Decimals:</label>
          <input type="number" className="w-16 border rounded p-1 text-xs" value={decimals} onChange={(e) => setDecimals(parseInt(e.target.value))} />
        </div>

        {showTax && (
          <div className="border rounded p-2 max-h-48 overflow-y-auto">
            {Object.entries(taxonomy).map(([cat, terms]) => (
              <div key={cat} className="mb-2">
                <label className="font-semibold text-xs flex items-center gap-1">
                  <input type="checkbox" checked={selectedCats.includes(cat)} onChange={() => toggleCat(cat)} />
                  {cat}
                </label>
                {selectedCats.includes(cat) && (
                  <div className="ml-4 mt-1 grid grid-cols-2 gap-1">
                    {terms.map((term: string) => (
                      <label key={term} className="text-xs flex items-center gap-1">
                        <input type="checkbox" checked={selectedTerms.includes(term)} onChange={() => toggleTerm(term)} />
                        {term}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}
