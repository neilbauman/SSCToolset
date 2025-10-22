"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

type Dataset = { id: string; title: string; table: string; source: string };
type Taxonomy = Record<string, string[]>;

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
}) {
  const sb = supabaseBrowser;
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [method, setMethod] = useState("ratio");
  const [decimals, setDecimals] = useState(0);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [datasetA, setDatasetA] = useState<Dataset | null>(null);
  const [datasetB, setDatasetB] = useState<Dataset | null>(null);
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState(1);
  const [previewA, setPreviewA] = useState<any[]>([]);
  const [previewB, setPreviewB] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [taxonomyCats, setTaxonomyCats] = useState<Taxonomy>({});
  const [taxonomySel, setTaxonomySel] = useState<Taxonomy>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      const all: Dataset[] = [];
      const core = [
        { id: "core-admin", title: "Administrative Boundaries [core]", table: "admin_units", source: "core" },
        { id: "core-pop", title: "Population [core]", table: "population_data", source: "core" },
        { id: "core-gis", title: "GIS Features [core]", table: "gis_features", source: "core" },
      ];
      all.push(...core);
      const { data: other } = await sb.from("dataset_metadata").select("id,title").eq("country_iso", countryIso);
      if (other)
        other.forEach((d) =>
          all.push({ id: d.id, title: d.title, table: `dataset_${d.id}`, source: "other" })
        );
      const { data: derived } = await sb
        .from("derived_datasets")
        .select("id,title")
        .eq("country_iso", countryIso);
      if (derived)
        derived.forEach((d) =>
          all.push({ id: d.id, title: d.title, table: `derived_${d.id}`, source: "derived" })
        );
      setDatasets(all);

      const { data: tx } = await sb.from("taxonomy_terms").select("category,name");
      if (tx) {
        const grouped: Taxonomy = {};
        tx.forEach((t) => {
          if (!grouped[t.category]) grouped[t.category] = [];
          grouped[t.category].push(t.name);
        });
        setTaxonomyCats(grouped);
      }
    })();
  }, [open, countryIso]);

  async function peek(table: string, side: "A" | "B") {
    if (!table) return;
    const { data } = await sb.from(table).select("*").limit(5);
    const rows =
      data?.map((r: any) => ({
        pcode: r.pcode,
        name: r.name,
        value: Object.values(r).find((v) => typeof v === "number"),
      })) ?? [];
    side === "A" ? setPreviewA(rows) : setPreviewB(rows);
  }

  async function previewJoin() {
    const { data, error } = await sb.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA?.table || "",
      p_table_b: datasetB?.table || "",
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
    });
    if (!error && data) setPreview(data);
  }

  async function save() {
    const { data, error } = await sb.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc,
      p_admin_level: targetLevel,
      p_table_a: datasetA?.table,
      p_table_b: useScalarB ? null : datasetB?.table,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: Object.keys(taxonomySel),
      p_taxonomy_terms: Object.values(taxonomySel).flat(),
      p_formula: `A.${colA} ${method === "ratio" ? "/" : method === "sum" ? "+" : method === "difference" ? "-" : "*"} ${
        useScalarB ? `scalar(${scalarB})` : `B.${colB}`
      }`,
    });
    if (error) {
      alert("Save failed: " + error.message);
      console.error(error);
    } else {
      alert("Derived dataset created successfully.");
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center text-sm">
      <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-4xl max-h-[85vh] overflow-y-auto border border-gray-200">
        <h2 className="text-base font-semibold mb-3">Create Derived Dataset</h2>

        {/* Title + Description + Level */}
        <div className="flex flex-wrap gap-2 mb-3">
          <input className="border p-1 rounded flex-1" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="border p-1 rounded flex-1" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <select className="border p-1 rounded" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)}>
            {["ADM1","ADM2","ADM3","ADM4"].map((lvl) => <option key={lvl}>{lvl}</option>)}
          </select>
        </div>

        {/* Dataset selectors */}
        <div className="flex gap-2 mb-3">
          {/* Dataset A */}
          <div className="flex-1">
            <label className="font-medium text-xs mb-1 block">Dataset A</label>
            <select className="border p-1 rounded w-full" value={datasetA?.id || ""} onChange={(e) => setDatasetA(datasets.find((d) => d.id === e.target.value) || null)}>
              <option value="">Select dataset</option>
              {["core","other","derived"].map((group) => (
                <optgroup key={group} label={group.toUpperCase()}>
                  {datasets.filter((d) => d.source === group).map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="flex gap-1 mt-1">
              <button onClick={() => peek(datasetA?.table || "", "A")} className="text-xs border px-2 py-1 rounded bg-gray-50 hover:bg-gray-100">Peek</button>
              <input className="border p-1 text-xs rounded flex-1" placeholder="Column A" value={colA} onChange={(e) => setColA(e.target.value)} />
            </div>
            {previewA.length > 0 && (
              <div className="border mt-1 rounded max-h-24 overflow-y-auto text-xs">
                {previewA.map((r,i)=>(
                  <div key={i} className="grid grid-cols-3 border-b px-1 py-0.5">
                    <span>{r.pcode}</span><span>{r.name}</span><span className="text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dataset B or Scalar */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <label className="font-medium text-xs">Dataset B</label>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={useScalarB} onChange={(e) => setUseScalarB(e.target.checked)} />
                Use scalar
              </label>
            </div>
            {!useScalarB ? (
              <>
                <select className="border p-1 rounded w-full" value={datasetB?.id || ""} onChange={(e) => setDatasetB(datasets.find((d) => d.id === e.target.value) || null)}>
                  <option value="">Select dataset</option>
                  {["core","other","derived"].map((group) => (
                    <optgroup key={group} label={group.toUpperCase()}>
                      {datasets.filter((d) => d.source === group).map((d) => (
                        <option key={d.id} value={d.id}>{d.title}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="flex gap-1 mt-1">
                  <button onClick={() => peek(datasetB?.table || "", "B")} className="text-xs border px-2 py-1 rounded bg-gray-50 hover:bg-gray-100">Peek</button>
                  <input className="border p-1 text-xs rounded flex-1" placeholder="Column B" value={colB} onChange={(e) => setColB(e.target.value)} />
                </div>
                {previewB.length > 0 && (
                  <div className="border mt-1 rounded max-h-24 overflow-y-auto text-xs">
                    {previewB.map((r,i)=>(
                      <div key={i} className="grid grid-cols-3 border-b px-1 py-0.5">
                        <span>{r.pcode}</span><span>{r.name}</span><span className="text-right">{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex gap-2 mt-1">
                <input type="number" value={scalarB} onChange={(e)=>setScalarB(parseFloat(e.target.value)||0)} className="border p-1 rounded w-24 text-right text-xs" />
                <select className="border p-1 rounded text-xs" value={decimals} onChange={(e)=>setDecimals(parseInt(e.target.value))}>
                  {[0,1,2].map(n=><option key={n}>{n} dec</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Math + Preview */}
        <div className="mb-2 text-xs italic text-gray-600">
          Derived = A.{colA || "x"} {method==="ratio"?"/":method==="sum"?"+":method==="difference"?"-":"×"} {useScalarB?`scalar(${scalarB})`:`B.${colB||"y"}`}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs">Method:</span>
          {["multiply","ratio","sum","difference"].map((m)=>(
            <button key={m} onClick={()=>setMethod(m)} className={`px-2 py-0.5 rounded text-xs border ${method===m?"bg-[#640811] text-white border-[#640811]":"bg-gray-50"}`}>{m}</button>
          ))}
          <button onClick={previewJoin} className="ml-auto px-3 py-1 rounded text-xs bg-[#640811] text-white">Preview</button>
        </div>

        {preview.length>0 && (
          <div className="border rounded max-h-40 overflow-y-auto text-xs mb-3">
            <table className="w-full">
              <thead className="bg-gray-100 text-left">
                <tr><th className="p-1">Pcode</th><th>Name</th><th className="text-right">A</th><th className="text-right">B</th><th className="text-right">Derived</th></tr>
              </thead>
              <tbody>
                {preview.map((r,i)=>(
                  <tr key={i} className="border-t">
                    <td className="p-1">{r.out_pcode}</td>
                    <td>{r.place_name}</td>
                    <td className="text-right">{r.a}</td>
                    <td className="text-right">{r.b}</td>
                    <td className="text-right font-medium">{Number(r.derived)?.toFixed(decimals)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Taxonomy */}
        <h3 className="font-semibold text-xs mb-1">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {Object.keys(taxonomyCats).map((cat)=>(
            <div key={cat}>
              <label className="flex items-center gap-1 text-xs font-medium">
                <input type="checkbox" checked={!!taxonomySel[cat]} onChange={(e)=>{
                  const t={...taxonomySel}; if(e.target.checked)t[cat]=[]; else delete t[cat]; setTaxonomySel(t);
                }}/> {cat}
              </label>
              {taxonomySel[cat] && (
                <div className="ml-4 mt-1">
                  {taxonomyCats[cat].map((t)=>(
                    <label key={t} className="flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={taxonomySel[cat]?.includes(t)} onChange={(e)=>{
                        const nt={...taxonomySel};
                        if(e.target.checked)nt[cat]=[...(nt[cat]||[]),t];
                        else nt[cat]=nt[cat].filter(x=>x!==t);
                        setTaxonomySel(nt);
                      }}/> {t}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded text-xs bg-gray-50 hover:bg-gray-100">Cancel</button>
          <button onClick={save} className="px-3 py-1 rounded text-xs text-white bg-[#640811] hover:opacity-90">Save</button>
        </div>
      </div>
    </div>
  );
}
