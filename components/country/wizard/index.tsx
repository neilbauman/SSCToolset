"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import WizardComputationPanel from "./WizardComputationPanel";
import WizardTaxonomyPanel from "./WizardTaxonomyPanel";

const ACCENT = "#640811";

type Source = "core" | "other" | "derived" | "gis";
type Method = "ratio" | "multiply" | "sum" | "difference";

type DatasetOption = {
  id: string;
  title: string;
  source: Source;
  table: string;
};

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
  is_parametric?: boolean | null;
  taxonomy_categories?: string[] | null;
  taxonomy_terms?: string[] | null;
  country_iso?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: EditPayload | null;
};

export default function CreateDerivedDatasetWizard({
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
  const [method, setMethod] = useState<Method>("ratio");
  const [decimals, setDecimals] = useState(2);
  const [isParametric, setIsParametric] = useState(true);
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [showTaxonomy, setShowTaxonomy] = useState(true);
  const [taxonomyMap, setTaxonomyMap] = useState<Record<string, string[]>>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});

  // ─────────────────────────────
  // Load datasets
  // ─────────────────────────────
  useEffect(() => {
    if (!open) return;
    (async () => {
      const all: DatasetOption[] = [
        { id: "core-admin", title: "Administrative Units [core]", source: "core", table: "admin_units" },
        { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data" },
        { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features" },
      ];
      const { data: others } = await supabase
        .from("dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);
      if (others?.length) {
        others.forEach((d) =>
          all.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` })
        );
      }
      const { data: derived } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);
      if (derived?.length) {
        derived.forEach((d) =>
          all.push({ id: d.id, title: d.title, source: "derived", table: `derived_${d.id}` })
        );
      }
      setDatasets(all);
    })();
  }, [open, countryIso]);

  // ─────────────────────────────
  // Load taxonomy
  // ─────────────────────────────
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      if (!data) return;
      const grouped: Record<string, string[]> = {};
      data.forEach(({ category, name }) => {
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(name);
      });
      setTaxonomyMap(grouped);
    })();
  }, [open]);

  // ─────────────────────────────
  // Hydrate when editing
  // ─────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (!editDataset) {
      setTitle("");
      setDesc("");
      setColA("population");
      setColB("area_sqkm");
      setMethod("ratio");
      setDecimals(2);
      setIsParametric(true);
      setTaxonomy({});
      return;
    }

    setTitle(editDataset.title || "");
    setDesc(editDataset.description || "");
    setMethod(editDataset.method || "ratio");
    setDecimals(editDataset.decimals ?? 2);
    setIsParametric(editDataset.is_parametric ?? true);
    setColA(editDataset.col_a || "population");
    setColB(editDataset.col_b || "area_sqkm");
    setUseScalarB(editDataset.use_scalar_b ?? false);
    setScalarB(editDataset.scalar_b_val ?? 1);

    // Match dataset references
    if (editDataset.table_a) {
      const foundA = datasets.find((d) => d.table === editDataset.table_a);
      setDatasetA(foundA || null);
    }
    if (editDataset.table_b) {
      const foundB = datasets.find((d) => d.table === editDataset.table_b);
      setDatasetB(foundB || null);
    }

    // Taxonomy
    const catArr = editDataset.taxonomy_categories || [];
    const termArr = editDataset.taxonomy_terms || [];
    const next: Record<string, Set<string>> = {};
    catArr.forEach((c) => (next[c] = new Set<string>()));
    termArr.forEach((t) => {
      for (const cat of Object.keys(taxonomyMap)) {
        if (taxonomyMap[cat]?.includes(t)) {
          if (!next[cat]) next[cat] = new Set<string>();
          next[cat].add(t);
        }
      }
    });
    setTaxonomy(next);
  }, [open, editDataset, datasets, taxonomyMap]);

  // ─────────────────────────────
  // Derived formula
  // ─────────────────────────────
  const computedFormula = useMemo(() => {
    const rhs = useScalarB ? String(scalarB) : `B.${colB}`;
    return `A.${colA} ${method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "-"} ${rhs}`;
  }, [colA, colB, method, scalarB, useScalarB]);

  // ─────────────────────────────
  // Preview RPC
  // ─────────────────────────────
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or a scalar).");
      return;
    }
    setLoadingPreview(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_country: countryIso,
      p_method: method,
      p_target_level: targetLevel,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
    });
    setLoadingPreview(false);
    if (error) {
      alert("Preview error: " + error.message);
      return;
    }
    setPreview(data || []);
  }

  // ─────────────────────────────
  // Save dataset
  // ─────────────────────────────
  async function saveDerived() {
    if (!datasetA?.table) {
      alert("Please select Dataset A before saving.");
      return;
    }
    const txCategories = Object.keys(taxonomy);
    const txTerms = txCategories.flatMap((c) => Array.from(taxonomy[c] || []));
    const payload = {
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc,
      p_admin_level: targetLevel,
      p_table_a: datasetA?.table ?? null,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: txCategories,
      p_taxonomy_terms: txTerms,
      p_formula: computedFormula,
      p_is_parametric: isParametric,
      p_existing_id: editDataset?.id ?? null,
    };
    const { error } = await supabase.rpc("create_derived_dataset", payload);
    if (error) {
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
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
        </div>

        <WizardComputationPanel
          datasets={datasets}
          datasetA={datasetA}
          setDatasetA={setDatasetA}
          datasetB={datasetB}
          setDatasetB={setDatasetB}
          colA={colA}
          setColA={setColA}
          colB={colB}
          setColB={setColB}
          method={method}
          setMethod={setMethod}
          useScalarB={useScalarB}
          setUseScalarB={setUseScalarB}
          scalarB={scalarB}
          setScalarB={setScalarB}
          decimals={decimals}
          setDecimals={setDecimals}
          isParametric={isParametric}
          setIsParametric={setIsParametric}
          previewJoin={previewJoin}
          loadingPreview={loadingPreview}
          preview={preview}
          computedFormula={computedFormula}
        />

        <WizardTaxonomyPanel
          taxonomyMap={taxonomyMap}
          taxonomy={taxonomy}
          setTaxonomy={setTaxonomy}
          showTaxonomy={showTaxonomy}
          setShowTaxonomy={setShowTaxonomy}
        />

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
