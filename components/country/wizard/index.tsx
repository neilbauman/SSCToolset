"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type Method = "ratio" | "multiply" | "sum" | "difference";

type DatasetOption = {
  id: string; // can be UUID or 'core-*'
  title: string;
  source: Source;
  table: string;
  defaultCol?: string | null;
};

type TaxonomyMap = Record<string, string[]>;

type EditPayload = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: Method;
  table_a?: string | null;
  table_b?: string | null;
  col_a?: string | null;
  col_b?: string | null;
};

type Props = {
  open?: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: EditPayload | null;
};

const ACCENT = "#640811";

export default function DerivedDatasetWizard({
  open = true,
  onClose,
  countryIso,
  editDataset = null,
}: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");
  const [method, setMethod] = useState<Method>("ratio");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [decimals, setDecimals] = useState(2);
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [taxonomyMap, setTaxonomyMap] = useState<TaxonomyMap>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});

  // ───────────── Load datasets ─────────────
  useEffect(() => {
    (async () => {
      const base: DatasetOption[] = [
        {
          id: "core-pop",
          title: "Population Data [core]",
          source: "core",
          table: "population_data",
          defaultCol: "population",
        },
        {
          id: "core-gis",
          title: "GIS Features [core]",
          source: "gis",
          table: "gis_features",
          defaultCol: "area_sqkm",
        },
      ];

      const { data: others } = await supabase
        .from("dataset_metadata")
        .select("id, title, default_numeric_column")
        .eq("country_iso", countryIso);

      if (others?.length) {
        for (const d of others) {
          base.push({
            id: d.id,
            title: d.title,
            source: "other",
            table: `dataset_${d.id}`,
            defaultCol: d.default_numeric_column || null,
          });
        }
      }
      setDatasets(base);
    })();
  }, [countryIso]);

  // ───────────── Load taxonomy ─────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      if (!data) return;
      const grouped: TaxonomyMap = {};
      data.forEach(({ category, name }) => {
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(name);
      });
      setTaxonomyMap(grouped);
    })();
  }, []);

  // ───────────── Auto column defaults ─────────────
  useEffect(() => {
    if (datasetA && !colA) setColA(datasetA.defaultCol || "value");
    if (datasetB && !colB) setColB(datasetB.defaultCol || "value");
  }, [datasetA, datasetB]);

  // ───────────── Compute formula ─────────────
  const methodSymbol = useMemo(() => {
    switch (method) {
      case "ratio":
        return "÷";
      case "multiply":
        return "×";
      case "sum":
        return "+";
      case "difference":
        return "−";
    }
  }, [method]);

  const computedFormula = useMemo(() => {
    return `A.${colA} ${methodSymbol} B.${colB}`;
  }, [colA, colB, methodSymbol]);

  // ───────────── Preview ─────────────
  async function previewJoin() {
    if (!datasetA || !datasetB) {
      alert("Select both Dataset A and B.");
      return;
    }

    setLoadingPreview(true);

    const isCoreA = datasetA.id.startsWith("core-");
    const isCoreB = datasetB.id.startsWith("core-");

    try {
      const { data, error } = await supabase.rpc("resolve_parametric_dataset_v3", {
        p_country_iso: countryIso,
        p_table_a: isCoreA ? null : datasetA.id,
        p_table_b: isCoreB ? null : datasetB.id,
        p_method: method,
        p_normalize_percent: false,
        p_target_admin_level: targetLevel,
      });

      if (error) throw error;
      setPreview(data || []);
    } catch (err: any) {
      alert("Preview failed: " + err.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  // ───────────── Save ─────────────
  async function saveDerived() {
    if (!datasetA || !datasetB) {
      alert("Select both datasets first.");
      return;
    }

    const cats = Object.keys(taxonomy);
    const terms = cats.flatMap((c) => Array.from(taxonomy[c] || []));

    const payload = {
      p_country: countryIso,
      p_title: `Derived: ${datasetA.table}_${method}_${datasetB.table}`,
      p_admin_level: targetLevel,
      p_method: method,
      p_table_a: datasetA.table,
      p_table_b: datasetB.table,
      p_col_a: colA,
      p_col_b: colB,
      p_formula: computedFormula,
      p_taxonomy_categories: cats,
      p_taxonomy_terms: terms,
    };

    const { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    alert("✅ Derived dataset created.");
    onClose();
  }

  if (!open) return null;

  // ───────────── UI ─────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3 text-[#640811]">
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Datasets */}
        <div className="flex gap-2 mb-3">
          <select
            className="border p-1 rounded flex-1"
            value={datasetA?.id || ""}
            onChange={(e) =>
              setDatasetA(datasets.find((d) => d.id === e.target.value) || null)
            }
          >
            <option value="">Select Dataset A</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <input
            className="border p-1 rounded w-40"
            value={colA}
            onChange={(e) => setColA(e.target.value)}
            placeholder="Column A"
          />

          <select
            className="border p-1 rounded flex-1"
            value={datasetB?.id || ""}
            onChange={(e) =>
              setDatasetB(datasets.find((d) => d.id === e.target.value) || null)
            }
          >
            <option value="">Select Dataset B</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <input
            className="border p-1 rounded w-40"
            value={colB}
            onChange={(e) => setColB(e.target.value)}
            placeholder="Column B"
          />
        </div>

        {/* Method and preview */}
        <div className="flex items-center gap-2 mb-3">
          {(["ratio", "multiply", "sum", "difference"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-2 py-1 border rounded ${
                method === m ? "text-white" : ""
              }`}
              style={{
                background: method === m ? ACCENT : "transparent",
                borderColor: "#ddd",
              }}
            >
              {m}
            </button>
          ))}
          <select
            className="border p-1 rounded ml-auto"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
          >
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
          <button
            onClick={previewJoin}
            className="ml-2 px-3 py-1 rounded text-white"
            style={{ background: ACCENT }}
          >
            {loadingPreview ? "Loading..." : "Preview"}
          </button>
        </div>

        <p className="text-xs italic mb-2">Derived = {computedFormula}</p>

        {/* Preview Table */}
        <div className="max-h-64 overflow-y-auto border rounded text-xs mb-4">
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
              {preview.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center italic text-gray-500 py-2">
                    No preview data
                  </td>
                </tr>
              ) : (
                preview.map((r: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">{r.pcode}</td>
                    <td className="p-1">{r.name}</td>
                    <td className="p-1 text-right">
                      {Number(r.a)?.toLocaleString()}
                    </td>
                    <td className="p-1 text-right">
                      {Number(r.b)?.toLocaleString()}
                    </td>
                    <td className="p-1 text-right font-medium text-[#640811]">
                      {Number(r.derived)?.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-2 text-[#640811]">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {Object.keys(taxonomyMap).map((cat) => {
            const isChecked = !!taxonomy[cat];
            return (
              <div key={cat} className="border rounded p-2">
                <label className="flex items-center gap-1 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      setTaxonomy((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) next[cat] = new Set<string>();
                        else delete next[cat];
                        return next;
                      })
                    }
                  />{" "}
                  {cat}
                </label>
                {isChecked && (
                  <div className="ml-3 mt-1 grid grid-cols-1">
                    {taxonomyMap[cat].map((term) => (
                      <label key={term} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!taxonomy[cat]?.has(term)}
                          onChange={(e) =>
                            setTaxonomy((prev) => {
                              const next = { ...prev };
                              if (!next[cat]) next[cat] = new Set<string>();
                              if (e.target.checked) next[cat]!.add(term);
                              else next[cat]!.delete(term);
                              return next;
                            })
                          }
                        />{" "}
                        {term}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={saveDerived}
            className="px-3 py-1 text-white rounded"
            style={{ background: ACCENT }}
          >
            Save Derived
          </button>
        </div>
      </div>
    </div>
  );
}
