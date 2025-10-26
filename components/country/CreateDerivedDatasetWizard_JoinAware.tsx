"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type DatasetOption = { id: string; title: string; source: Source; table: string };
type Method = "ratio" | "multiply" | "sum" | "difference";
type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: {
    id: string;
    title: string;
    description: string | null;
    admin_level: string;
    method: Method;
    use_scalar_b: boolean;
    scalar_b_val: number | null;
    dataset_a_id: string | null;
    dataset_b_id: string | null;
    table_a: string | null;
    table_b: string | null;
    col_a: string | null;
    col_b: string | null;
    decimals: number | null;
    source_level: string | null;
    target_level: string | null;
    dynamic_resolution: boolean | null;
    dependencies: any | null;
    formula: string | null;
    taxonomy_categories: string[] | null;
    taxonomy_terms: string[] | null;
  } | null;
};

const ACCENT = "#640811";

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  editDataset = null,
}: Props) {
  // ───────────────── state
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("area_sqkm");
  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [decimals, setDecimals] = useState(2);
  const [preview, setPreview] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [loadingPreview, setLoadingPreview] = useState(false);

  // taxonomy
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});

  // ───────────────── helper toast (inline)
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const toast = (msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  // ───────────────── dataset options
  useEffect(() => {
    if (!open) return;
    (async () => {
      const list: DatasetOption[] = [
        { id: "core-admin", title: "Administrative Boundaries [core]", source: "core", table: "admin_units" },
        { id: "core-pop",   title: "Population Data [core]",           source: "core", table: "population_data" },
        { id: "core-gis",   title: "GIS Features [core]",              source: "gis",  table: "gis_features" },
      ];

      // user datasets (other)
      const { data: others, error: e1 } = await supabase
        .from("dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);
      if (!e1 && others) {
        others.forEach((d: any) =>
          list.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` })
        );
      }

      // derived datasets
      const { data: derived, error: e2 } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);
      if (!e2 && derived) {
        derived.forEach((d: any) =>
          list.push({ id: d.id, title: d.title, source: "derived", table: `derived_${d.id}` })
        );
      }

      setDatasets(list);
    })();
  }, [open, countryIso]);

  // ───────────────── taxonomy options
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase.from("taxonomy_terms").select("category,name");
      if (error || !data) return;
      const grouped: Record<string, string[]> = {};
      data.forEach((t) => {
        if (!grouped[t.category]) grouped[t.category] = [];
        grouped[t.category].push(t.name);
      });
      setCategories(grouped);
    })();
  }, [open]);

  // ───────────────── load edit values
  useEffect(() => {
    if (!open) return;

    if (editDataset) {
      setTitle(editDataset.title || "");
      setDesc(editDataset.description || "");
      setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
      setMethod((editDataset.method as Method) || "ratio");
      setUseScalarB(!!editDataset.use_scalar_b);
      setScalarB(editDataset.scalar_b_val ?? 1);
      setColA(editDataset.col_a || "population");
      setColB(editDataset.col_b || "area_sqkm");
      setDecimals(editDataset.decimals ?? 2);

      // best-effort hydrate datasetA/B from current list after datasets load
      // (we’ll resolve in a memo below)
    } else {
      // sensible defaults for a fresh “population density” style config
      setTitle("");
      setDesc("");
      setTargetLevel("ADM3");
      setMethod("ratio");
      setUseScalarB(false);
      setScalarB(1);
      setColA("population");
      setColB("area_sqkm");
      setDecimals(2);
      setTaxonomy({});
    }
  }, [open, editDataset]);

  // resolve datasetA/datasetB against datasets list after it arrives
  useEffect(() => {
    if (!editDataset || datasets.length === 0) return;
    const a =
      datasets.find((d) => d.table === (editDataset.table_a || "")) ||
      datasets.find((d) => d.id === (editDataset.dataset_a_id || ""));
    const b =
      datasets.find((d) => d.table === (editDataset.table_b || "")) ||
      datasets.find((d) => d.id === (editDataset.dataset_b_id || ""));
    if (a) setDatasetA(a);
    if (b) setDatasetB(b);
    // taxonomy
    const tcat = editDataset.taxonomy_categories || [];
    const tterms = editDataset.taxonomy_terms || [];
    if (tcat.length || tterms.length) {
      const next: Record<string, string[]> = {};
      tcat.forEach((c) => { next[c] = []; });
      tterms.forEach((t) => {
        const cat = Object.keys(categories).find((c) => categories[c]?.includes(t));
        if (cat) next[cat] = Array.from(new Set([...(next[cat] || []), t]));
      });
      setTaxonomy(next);
    }
  }, [editDataset, datasets, categories]);

  // ───────────────── methods
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      toast("Select Dataset A and (Dataset B or a scalar).");
      return;
    }
    setLoadingPreview(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
    });
    setLoadingPreview(false);
    if (error) {
      toast("Preview error: " + error.message);
      return;
    }
    setPreview(data || []);
  }

  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      toast("Select Dataset A and (Dataset B or a scalar).");
      return;
    }
    const formula = `${colA} ${method === "ratio" ? "/" : method === "multiply" ? "*" : method === "sum" ? "+" : "-"} ${useScalarB ? scalarB : colB}`;

    const { error } = await supabase.rpc("create_or_update_derived_dataset", {
      p_id: editDataset?.id ?? null,
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc || null,
      p_admin_level: targetLevel,
      p_method: method,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_decimals: decimals,
      p_formula: formula,
      p_taxonomy_categories: Object.keys(taxonomy),
      p_taxonomy_terms: Object.values(taxonomy).flat(),
    });

    if (error) {
      toast("Save error: " + error.message);
      return;
    }
    toast(editDataset ? "✅ Changes saved." : "✅ Derived dataset created.");
    onClose();
  }

  // ───────────────── UI helpers (compact)
  const MethodButton = ({ m }: { m: Method }) => (
    <button
      onClick={() => setMethod(m)}
      className={`px-2 py-1 border rounded text-xs ${
        method === m ? "text-white" : ""
      }`}
      style={{
        borderColor: ACCENT,
        background: method === m ? ACCENT : "transparent",
      }}
    >
      {m}
    </button>
  );

  const Group = ({ children }: { children: React.ReactNode }) => (
    <div className="flex flex-wrap gap-2 mb-2 items-center">{children}</div>
  );

  const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={`flex-1 min-w-[180px] ${className}`}>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {children}
    </div>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-base font-semibold mb-3" style={{ color: ACCENT }}>
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Title / Description / Target Level */}
        <Group>
          <Field label="Title">
            <input
              className="border p-1 rounded w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Population Density (ADM3)"
            />
          </Field>
          <Field label="Description">
            <input
              className="border p-1 rounded w-full"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Short description"
            />
          </Field>
          <Field label="Target Admin Level">
            <select
              className="border p-1 rounded w-full"
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
            >
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
                <option key={lvl}>{lvl}</option>
              ))}
            </select>
          </Field>
        </Group>

        {/* Dataset Pickers (explicit blocks, avoids TS tuple-ReactNode issue) */}
        <Group>
          <Field label="Dataset A">
            <select
              className="border p-1 rounded w-full"
              value={datasetA?.id || ""}
              onChange={(e) => setDatasetA(datasets.find((d) => d.id === e.target.value) || null)}
            >
              <option value="">Select Dataset A</option>
              {(["core", "gis", "other", "derived"] as Source[]).map((group) => (
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
          </Field>

          <Field label="Dataset B">
            <select
              className="border p-1 rounded w-full disabled:bg-gray-100"
              disabled={useScalarB}
              value={datasetB?.id || ""}
              onChange={(e) => setDatasetB(datasets.find((d) => d.id === e.target.value) || null)}
            >
              <option value="">Select Dataset B</option>
              {(["core", "gis", "other", "derived"] as Source[]).map((group) => (
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
          </Field>

          <div className="flex items-center gap-2 mt-5">
            <label className="text-xs">
              <input
                type="checkbox"
                checked={useScalarB}
                onChange={(e) => setUseScalarB(e.target.checked)}
                className="mr-1"
              />
              Use scalar for B
            </label>
            <input
              type="number"
              step="0.0001"
              disabled={!useScalarB}
              value={scalarB}
              onChange={(e) => setScalarB(parseFloat(e.target.value))}
              className="border rounded w-24 text-right p-1 disabled:bg-gray-100"
            />
            <select
              className="border rounded text-xs p-1 ml-2"
              value={decimals}
              onChange={(e) => setDecimals(parseInt(e.target.value))}
            >
              {[0, 1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {d} dec
                </option>
              ))}
            </select>
          </div>
        </Group>

        {/* Columns + Method */}
        <Group>
          <Field label="Column A">
            <input
              className="border p-1 rounded w-full"
              value={colA}
              onChange={(e) => setColA(e.target.value)}
              placeholder="population"
            />
          </Field>
          <Field label="Column B">
            <input
              className="border p-1 rounded w-full disabled:bg-gray-100"
              disabled={useScalarB}
              value={colB}
              onChange={(e) => setColB(e.target.value)}
              placeholder="area_sqkm"
            />
          </Field>

          <div className="flex items-center gap-2">
            <span className="text-xs">Method:</span>
            <MethodButton m="ratio" />
            <MethodButton m="multiply" />
            <MethodButton m="sum" />
            <MethodButton m="difference" />
            <button
              onClick={previewJoin}
              className="ml-2 px-3 py-1 rounded text-white text-xs"
              style={{ background: ACCENT }}
              disabled={loadingPreview}
            >
              {loadingPreview ? "Loading..." : "Preview"}
            </button>
          </div>
        </Group>

        <p className="text-xs italic mb-2">
          Derived = A.{colA} {method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "-"}{" "}
          {useScalarB ? scalarB : `B.${colB}`}
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
                <th className="p-1 text-left">Note</th>
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
                  <td className="p-1">{r.completeness_warning}</td>
                </tr>
              ))}
              {preview.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-2 text-center italic text-gray-500">
                    No preview yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Taxonomy (restored, compact) */}
        <h3 className="text-sm font-semibold mb-2" style={{ color: ACCENT }}>
          Assign Taxonomy
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {Object.keys(categories).map((cat) => (
            <div key={cat} className="border rounded p-2">
              <label className="flex items-center gap-1 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={!!taxonomy[cat]}
                  onChange={(e) => {
                    const t = { ...taxonomy };
                    if (e.target.checked) t[cat] = [...(t[cat] || [])];
                    else delete t[cat];
                    setTaxonomy(t);
                  }}
                />
                {cat}
              </label>
              {taxonomy[cat] && (
                <div className="mt-1 grid grid-cols-1 ml-2">
                  {categories[cat].map((term) => (
                    <label key={term} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={taxonomy[cat]?.includes(term) || false}
                        onChange={(e) => {
                          const t = { ...taxonomy };
                          if (e.target.checked) t[cat] = Array.from(new Set([...(t[cat] || []), term]));
                          else t[cat] = (t[cat] || []).filter((x) => x !== term);
                          if ((t[cat] || []).length === 0) delete t[cat];
                          setTaxonomy(t);
                        }}
                      />
                      {term}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded text-xs">
            Cancel
          </button>
          <button
            onClick={saveDerived}
            className="px-3 py-1 rounded text-white text-xs"
            style={{ background: ACCENT }}
          >
            {editDataset ? "Save Changes" : "Save Derived"}
          </button>
        </div>

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((t) => (
            <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded shadow-md text-white" style={{ background: ACCENT }}>
              <span className="text-xs">{t.msg}</span>
              <button onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))} className="text-white/80 text-xs">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
