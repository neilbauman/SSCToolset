"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import WizardHeader from "./WizardHeader";
import WizardComputationPanel from "./WizardComputationPanel";
import WizardTaxonomyPanel from "./WizardTaxonomyPanel";

type Method = "ratio" | "multiply" | "sum" | "difference";

/** The options shown in the dataset selectors.
 *  NOTE: we intentionally use `id` to store the PHYSICAL TABLE NAME so we
 *  can pass it straight to the RPC (p_table_a / p_table_b).
 */
type DatasetOption = { id: string; title: string };

type EditPayload = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: Method;
  use_scalar_b?: boolean | null;
  scalar_b_val?: number | null;
  table_a?: string | null;
  table_b?: string | null;
  col_a?: string | null;
  col_b?: string | null;
  decimals?: number | null;
  formula?: string | null;
  target_level?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: EditPayload | null;
};

const ACCENT = "#640811";

// sensible defaults per your preference:
// ratio => 2; others => 0
const DEFAULT_DECIMALS: Record<Method, number> = {
  ratio: 2,
  multiply: 0,
  sum: 0,
  difference: 0,
};

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  editDataset = null,
}: Props) {
  // dataset choices
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);

  // metadata + config
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM4");

  // computation
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("area_sqkm");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [decimals, setDecimals] = useState<number>(DEFAULT_DECIMALS.ratio);
  const [method, setMethod] = useState<Method>("ratio");

  // preview
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // taxonomy
  const [taxonomyMap, setTaxonomyMap] = useState<Record<string, string[]>>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});
  const [showTaxonomy, setShowTaxonomy] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // load dataset options (core + user datasets)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    (async () => {
      const opts: DatasetOption[] = [
        // Core tables first (use id = PHYSICAL TABLE for simple RPC passing)
        { id: "population_data", title: "Population Data [core]" },
        { id: "gis_features", title: "GIS Features [core]" },
      ];

      // user datasets (dataset_metadata)
      const { data: meta, error } = await supabase
        .from("dataset_metadata")
        .select("id,title,country_iso")
        .or(`country_iso.eq.${countryIso},country_iso.is.null`);

      if (!error && meta?.length) {
        for (const row of meta) {
          opts.push({
            id: `dataset_${row.id}`, // physical table naming convention
            title: row.title || "Untitled dataset",
          });
        }
      }

      // derived datasets (optional: include as selectable B inputs)
      const { data: dmeta } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title,country_iso")
        .eq("country_iso", countryIso);

      if (dmeta?.length) {
        for (const row of dmeta) {
          opts.push({
            id: `derived_${row.id}`,
            title: row.title || "Derived dataset",
          });
        }
      }

      setDatasets(opts);
    })();
  }, [open, countryIso]);

  // ─────────────────────────────────────────────────────────────
  // load taxonomy map (category -> terms)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("category,name");
      if (error || !data) return;

      const grouped: Record<string, string[]> = {};
      for (const { category, name } of data) {
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(name);
      }
      setTaxonomyMap(grouped);
    })();
  }, [open]);

  // ─────────────────────────────────────────────────────────────
  // hydrate from editDataset (if provided)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    if (!editDataset) {
      setTitle("");
      setDesc("");
      setTargetLevel("ADM4");
      setMethod("ratio");
      setDecimals(DEFAULT_DECIMALS.ratio);
      setUseScalarB(false);
      setScalarB(1);
      setColA("population");
      setColB("area_sqkm");
      setDatasetA(null);
      setDatasetB(null);
      setShowPreview(true);
      setShowTaxonomy(false);
      setPreview([]);
      setTaxonomy({});
      return;
    }

    setTitle(editDataset.title || "");
    setDesc(editDataset.description || "");
    setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM4");
    setMethod((editDataset.method as Method) || "ratio");
    setDecimals(
      Number.isInteger(editDataset.decimals ?? NaN)
        ? (editDataset.decimals as number)
        : DEFAULT_DECIMALS[(editDataset.method as Method) || "ratio"]
    );
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || "population");
    setColB(editDataset.col_b || "area_sqkm");

    // resolve datasetA/B from provided physical tables
    if (datasets.length > 0) {
      const foundA =
        datasets.find((d) => d.id === editDataset.table_a) ||
        datasets.find((d) => d.id === "population_data") ||
        null;
      const foundB =
        editDataset.use_scalar_b
          ? null
          : datasets.find((d) => d.id === editDataset.table_b || "") || null;
      setDatasetA(foundA);
      setDatasetB(foundB);
    }
  }, [open, editDataset, datasets]);

  // ─────────────────────────────────────────────────────────────
  // set default decimals when method changes (user can override)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setDecimals(DEFAULT_DECIMALS[method]);
  }, [method]);

  // ─────────────────────────────────────────────────────────────
  // helpers
  // ─────────────────────────────────────────────────────────────
  const methodSymbol = useMemo(() => {
    switch (method) {
      case "ratio": return "÷";
      case "multiply": return "×";
      case "sum": return "+";
      case "difference": return "−";
    }
  }, [method]);

  const computedFormula = useMemo(() => {
    const rhs = useScalarB ? String(scalarB) : `B.${colB}`;
    return `A.${colA} ${methodSymbol} ${rhs}`;
  }, [useScalarB, scalarB, colA, colB, methodSymbol]);

  const formatNumber = (v: number | null) => {
    if (v == null || isNaN(v as any)) return "";
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  // ─────────────────────────────────────────────────────────────
  // preview call → new RPC (data-health-aware)
  // ─────────────────────────────────────────────────────────────
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or a scalar).");
      return;
    }
    setLoadingPreview(true);

    const { data, error } = await supabase.rpc(
      "simulate_join_preview_autoaggregate",
      {
        p_table_a: datasetA.id,
        p_table_b: useScalarB ? null : datasetB?.id ?? null,
        p_country: countryIso,
        p_target_level: targetLevel,
        p_method: method,
        p_col_a: colA,
        p_col_b: useScalarB ? null : colB,
        p_use_scalar_b: useScalarB,
        p_scalar_b_val: useScalarB ? scalarB : null,
      }
    );

    setLoadingPreview(false);
    if (error) {
      console.error(error);
      alert("Preview error: " + error.message);
      return;
    }
    setPreview((data as any[]) || []);
  }

  // ─────────────────────────────────────────────────────────────
  // save → create_derived_dataset RPC
  // ─────────────────────────────────────────────────────────────
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or a scalar).");
      return;
    }

    const cats = Object.keys(taxonomy);
    const terms = cats.flatMap((c) => Array.from(taxonomy[c] || []));

    const payload: Record<string, any> = {
      p_country_iso: countryIso,
      p_title: title || `${method[0].toUpperCase()}${method.slice(1)} (${targetLevel})`,
      p_description: desc || null,
      p_admin_level: targetLevel,
      p_table_a: datasetA.id,
      p_table_b: useScalarB ? null : datasetB?.id ?? null,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: cats,
      p_taxonomy_terms: terms,
      p_formula: computedFormula,
      p_is_parametric: true, // keep compatibility with earlier flows
    };

    // if editing, pass the record id
    if (editDataset?.id) payload.p_existing_id = editDataset.id;

    const { error } = await supabase.rpc("create_derived_dataset", payload);
    if (error) {
      console.error(error);
      alert("Save failed: " + error.message);
      return;
    }
    alert(editDataset ? "✅ Changes saved." : "✅ Derived dataset created.");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Header: title/desc/level + dataset selectors */}
        <WizardHeader
          title={title}
          setTitle={setTitle}
          desc={desc}
          setDesc={setDesc}
          targetLevel={targetLevel}
          setTargetLevel={setTargetLevel}
          datasetA={datasetA}
          setDatasetA={setDatasetA}
          datasetB={datasetB}
          setDatasetB={setDatasetB}
          datasets={datasets}
          useScalarB={useScalarB}
        />

        {/* Computation & preview */}
        <WizardComputationPanel
          colA={colA}
          setColA={setColA}
          colB={colB}
          setColB={setColB}
          useScalarB={useScalarB}
          setUseScalarB={setUseScalarB}
          scalarB={scalarB}
          setScalarB={setScalarB}
          decimals={decimals}
          setDecimals={setDecimals}
          method={method}
          setMethod={(m) => setMethod(m as Method)}
          preview={preview}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          previewJoin={previewJoin}
          loadingPreview={loadingPreview}
          formatNumber={formatNumber}
        />

        <p className="text-xs italic mb-2">
          Derived = {computedFormula}
        </p>

        {/* Taxonomy */}
        <WizardTaxonomyPanel
          taxonomyMap={taxonomyMap}
          taxonomy={taxonomy}
          setTaxonomy={setTaxonomy}
          showTaxonomy={showTaxonomy}
          setShowTaxonomy={setShowTaxonomy}
        />

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={saveDerived}
            className="px-3 py-1 text-white rounded"
            style={{ background: ACCENT }}
          >
            {editDataset ? "Save Changes" : "Save Derived"}
          </button>
        </div>
      </div>
    </div>
  );
}
