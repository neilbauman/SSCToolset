"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import WizardHeader from "./WizardHeader";
import WizardComputationPanel from "./WizardComputationPanel";
import WizardTaxonomyPanel from "./WizardTaxonomyPanel";
import WizardDerivedPanel from "./WizardDerivedPanel";

type DatasetOption = {
  id: string;
  title: string;
  table: string;
  source: "core" | "other" | "derived" | "gis";
  defaultCol?: string | null;
};

type Method = "ratio" | "multiply" | "sum" | "difference";

type Props = {
  countryIso: string;
  onClose: () => void;
  editDataset?: any | null;
};

const ACCENT = "#640811";

export default function DerivedDatasetWizard({
  countryIso,
  onClose,
  editDataset = null,
}: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");
  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [decimals, setDecimals] = useState(2);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});
  const [taxonomyMap, setTaxonomyMap] = useState<Record<string, string[]>>({});

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
        .select("id,title,default_numeric_column")
        .eq("country_iso", countryIso);

      if (others?.length)
        others.forEach((d) =>
          base.push({
            id: d.id,
            title: d.title,
            table: `dataset_${d.id}`,
            source: "other",
            defaultCol: d.default_numeric_column || "value",
          })
        );

      const { data: derived } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title,method,admin_level");

      if (derived?.length)
        derived.forEach((d) =>
          base.push({
            id: d.id,
            title: `${d.title} [derived]`,
            table: `derived_${d.id}`,
            source: "derived",
            defaultCol: "derived",
          })
        );

      setDatasets(base);
    })();
  }, [countryIso]);

  // ───────────── Taxonomy terms ─────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      if (!data) return;
      const map: Record<string, string[]> = {};
      data.forEach((t) => {
        if (!map[t.category]) map[t.category] = [];
        map[t.category].push(t.name);
      });
      setTaxonomyMap(map);
    })();
  }, []);

  // ───────────── Hydrate for edits ─────────────
  useEffect(() => {
    if (!editDataset || datasets.length === 0) return;
    setTitle(editDataset.title || "");
    setDesc(editDataset.description || "");
    setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
    setMethod(editDataset.method || "ratio");
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || "");
    setColB(editDataset.col_b || "");
    setDecimals(editDataset.decimals ?? 2);

    const foundA = datasets.find((d) => d.table === editDataset.table_a);
    const foundB = datasets.find((d) => d.table === editDataset.table_b);
    setDatasetA(foundA || null);
    setDatasetB(foundB || null);
  }, [editDataset, datasets]);

  // ───────────── Preview (simulate_derived_preview_v2) ─────────────
  async function handlePreview() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select both datasets (or scalar).");
      return;
    }

    setLoadingPreview(true);
    const { data, error } = await supabase.rpc("simulate_derived_preview_v2", {
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_country_iso: countryIso,
      p_method: method,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_use_scalar_b: useScalarB,
      p_target_level: targetLevel,
    });
    setLoadingPreview(false);

    if (error) {
      console.warn("Preview RPC failed:", error);
      alert(
        "Preview error: Could not find simulate_derived_preview_v2(). " +
          "Please create that SQL function or rerun deployment."
      );
      return;
    }
    if (!data || data.length === 0) {
      alert("Preview complete but no data returned. Check inputs.");
      setPreview([]);
      return;
    }
    setPreview(data);
  }

  // ───────────── Save dataset ─────────────
  async function handleSave() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select both datasets (or scalar).");
      return;
    }
    const payload = {
      p_country_iso: countryIso,
      p_title: title || `Derived_${method}`,
      p_description: desc || null,
      p_admin_level: targetLevel,
      p_method: method,
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_taxonomy_categories: Object.keys(taxonomy),
      p_taxonomy_terms: Object.values(taxonomy).flatMap((s) => Array.from(s)),
    };

    const { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    alert("✅ Derived dataset saved successfully.");
    onClose();
  }

  // ───────────── UI ─────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm p-5">
        {/* HEADER */}
        <WizardHeader
          title={title}
          desc={desc}
          setTitle={setTitle}
          setDesc={setDesc}
          targetLevel={targetLevel}
          setTargetLevel={setTargetLevel}
        />

        {/* COMPUTATION PANEL */}
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
          onPreview={handlePreview}
          loadingPreview={loadingPreview}
          accent={ACCENT}
        />

        {/* TAXONOMY PANEL */}
        <WizardTaxonomyPanel
          taxonomyMap={taxonomyMap}
          taxonomy={taxonomy}
          setTaxonomy={setTaxonomy}
        />

        {/* DERIVED PREVIEW + SAVE */}
        <WizardDerivedPanel
          preview={preview}
          decimals={decimals}
          onClose={onClose}
          onSave={handleSave}
          accent={ACCENT}
        />
      </div>
    </div>
  );
}
