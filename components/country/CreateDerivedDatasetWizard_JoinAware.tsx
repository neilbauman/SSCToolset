"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onCreated: () => void;
}) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [datasetA, setA] = useState<string>("");
  const [datasetB, setB] = useState<string>("");
  const [useScalar, setUseScalar] = useState(false);
  const [scalarVal, setScalarVal] = useState<number>(5);
  const [method, setMethod] = useState("ratio");
  const [decimals, setDecimals] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [peekRows, setPeekRows] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [showTax, setShowTax] = useState(false);
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("available_datasets_view")
        .select("id,title,category")
        .order("category");
      setDatasets(data || []);
      const { data: tax } = await supabase
        .from("taxonomy_terms")
        .select("category,name")
        .order("category");
      const grouped = (tax || []).reduce((a: any, t: any) => {
        (a[t.category] ||= []).push(t.name);
        return a;
      }, {});
      setTaxonomy(grouped);
    })();
  }, [open]);

  const peekDataset = async (tbl: string) => {
    if (!tbl) return;
    const { data } = await supabase
      .from(tbl)
      .select("pcode,name,population")
      .limit(5);
    setPeekRows(data || []);
  };

  const previewJoin = async () => {
    if (!datasetA || (!datasetB && !useScalar)) return;
    const { data, error } = await supabase.rpc(
      "simulate_join_preview_autoaggregate",
      {
        p_table_a: datasetA,
        p_table_b: datasetB || datasetA,
        p_country: countryIso,
        p_target_level: "ADM4",
        p_method: method,
        p_col_a: "population",
        p_col_b: "population",
        p_use_scalar_b: useScalar,
        p_scalar_b_val: scalarVal,
      }
    );
    if (error) console.error(error);
    setPreviewRows(data || []);
  };

  const toggleCat = (cat: string) =>
    setSelectedCats((p) =>
      p.includes(cat) ? p.filter((c) => c !== cat) : [...p, cat]
    );

  const toggleTerm = (t: string) =>
    setSelectedTerms((p) =>
      p.includes(t) ? p.filter((x) => x !== t) : [...p, t]
    );

  const save = async () => {
    const payload = {
      p_country_iso: countryIso,
      p_title: title,
      p_description: description,
      p_admin_level: "ADM4",
      p_table_a: datasetA,
      p_table_b: datasetB || null,
      p_col_a: "population",
      p_col_b: "population",
      p_use_scalar_b: useScalar,
      p_scalar_b_val: scalarVal,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: selectedCats,
      p_taxonomy_terms: selectedTerms,
      p_formula: `Derived = A ${method} ${useScalar ? scalarVal : "B"}`,
    };
    const { data, error } = await supabase.rpc("create_derived_dataset", payload);
    if (error) return alert("Save failed: " + error.message);
    onCreated();
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[95%] max-w-5xl p-4 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between mb-2">
          <h2 className="text-xl font-semibold">Create Derived Dataset</h2>
          <button onClick={onClose} className="text-sm underline">
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <input
            className="border rounded p-1"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="border rounded p-1"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-between mb-3">
          <button
            className="border px-3 py-1 rounded text-sm"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          <button
            className="border px-3 py-1 rounded text-sm"
            onClick={() => setShowTax((v) => !v)}
          >
            {showTax ? "Hide Taxonomy" : "Show Taxonomy"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="border rounded p-2">
            <div className="font-semibold mb-1">Dataset A</div>
            <select
              className="border rounded w-full p-1 text-sm"
              value={datasetA}
              onChange={(e) => setA(e.target.value)}
            >
              <option value="">Select dataset...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.title}>
                  {d.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => peekDataset(datasetA)}
              className="text-blue-600 text-xs underline mt-1"
            >
              Peek
            </button>
          </div>

          <div className="border rounded p-2">
            <div className="font-semibold mb-1">Dataset B</div>
            {useScalar ? (
              <div className="flex items-center gap-2">
                <label className="text-xs">Scalar B:</label>
                <input
                  type="number"
                  className="border rounded p-1 text-sm w-20"
                  value={scalarVal}
                  onChange={(e) => setScalarVal(Number(e.target.value))}
                />
              </div>
            ) : (
              <select
                className="border rounded w-full p-1 text-sm"
                value={datasetB}
                onChange={(e) => setB(e.target.value)}
              >
                <option value="">Select dataset...</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.title}>
                    {d.title}
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center justify-between mt-1">
              <button
                onClick={() => peekDataset(datasetB)}
                className="text-blue-600 text-xs underline"
              >
                Peek
              </button>
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={useScalar}
                  onChange={(e) => setUseScalar(e.target.checked)}
                />
                Use scalar
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3 text-sm">
          <div>
            Math:
            <select
              className="border rounded ml-1 p-1"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="multiply">Multiply</option>
              <option value="ratio">Ratio</option>
              <option value="sum">Sum</option>
              <option value="difference">Difference</option>
            </select>
          </div>
          <div>
            Decimals:
            <input
              type="number"
              className="border rounded ml-1 p-1 w-14"
              value={decimals}
              onChange={(e) => setDecimals(Number(e.target.value))}
            />
          </div>
          <div className="italic text-xs">
            Derived = A {method} {useScalar ? scalarVal : "B"}
          </div>
          <button
            onClick={previewJoin}
            className="border px-3 py-1 rounded text-sm ml-auto"
          >
            Preview Join
          </button>
        </div>

        {showPreview && previewRows.length > 0 && (
          <div className="border rounded p-2 max-h-40 overflow-y-auto text-xs mb-3">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th>PCode</th>
                  <th>Name</th>
                  <th>A</th>
                  <th>B</th>
                  <th>Derived</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td>{r.out_pcode}</td>
                    <td>{r.place_name}</td>
                    <td>{r.a}</td>
                    <td>{r.b}</td>
                    <td>{r.derived}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showTax && (
          <div className="border rounded p-2 mt-2 text-sm">
            {Object.entries(taxonomy).map(([cat, terms]) => (
              <div key={cat} className="mb-2">
                <label className="font-semibold flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat)}
                    onChange={() => toggleCat(cat)}
                  />
                  {cat}
                </label>
                {selectedCats.includes(cat) && (
                  <div className="grid grid-cols-2 ml-4 mt-1 text-xs">
                    {terms.map((t) => (
                      <label key={t} className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={selectedTerms.includes(t)}
                          onChange={() => toggleTerm(t)}
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-4 gap-2">
          <button
            onClick={onClose}
            className="border rounded px-3 py-1 text-sm bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
