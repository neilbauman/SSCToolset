"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle, X } from "lucide-react";

type Method = "multiply" | "ratio" | "sum" | "difference";

type DatasetOption = {
  id: string;
  title: string;
  admin_level?: string | null;
  dataset_type?: string | null;
  source: "core" | "other" | "derived";
  table_name: string;
};

type JoinPreviewRow = {
  pcode: string;
  name: string;
  parent_pcode?: string | null;
  parent_name?: string | null;
  a: number | null;
  b: number | null;
  derived: number | null;
  col_a_used?: string | null;
  col_b_used?: string | null;
};

/** Local, build-safe Button */
function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  disabled = false,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "link";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}) {
  const base =
    "rounded px-3 py-1 text-sm font-medium transition-colors " +
    (disabled ? "opacity-50 cursor-not-allowed " : "cursor-pointer ");
  const variants: Record<string, string> = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    link: "text-blue-600 underline hover:text-blue-800",
  };
  const sizes: Record<string, string> = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
  };
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

const PREVIEW_RPC = "simulate_join_preview_autoaggregate"; // change if your DB uses a different name

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  countryIso,
  onClose,
  onCreated,
}: {
  open: boolean;
  countryIso: string;
  onClose: () => void;
  onCreated?: () => void;
}) {
  if (!open) return null;

  const backdropRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // datasets
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);

  // join fields
  const [joinFieldA, setJoinFieldA] = useState<string>("pcode");
  const [joinFieldB, setJoinFieldB] = useState<string>("pcode");

  // target level + method
  const [targetLevel, setTargetLevel] = useState<string>("ADM4");
  const [method, setMethod] = useState<Method>("multiply");
  const [aggregationNotice, setAggregationNotice] = useState<string | null>(null);

  // scalar path (for B)
  const [useScalarB, setUseScalarB] = useState<boolean>(false);
  const [scalarB, setScalarB] = useState<number | undefined>(undefined);

  // preview
  const [loading, setLoading] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<JoinPreviewRow[]>([]);
  const [showPreviewA, setShowPreviewA] = useState<boolean>(false);
  const [showPreviewB, setShowPreviewB] = useState<boolean>(false);
  const [showJoinPreview, setShowJoinPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // filters
  const [includeCore, setIncludeCore] = useState<boolean>(true);
  const [includeOther, setIncludeOther] = useState<boolean>(true);
  const [includeDerived, setIncludeDerived] = useState<boolean>(true);
  const [includeGIS, setIncludeGIS] = useState<boolean>(false); // off by default per your note

  // save metadata
  const [dsTitle, setDsTitle] = useState<string>("");
  const [dsYear, setDsYear] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch datasets (core + other + derived)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const merged: DatasetOption[] = [];

      if (includeCore) {
        merged.push({
          id: "core-admin",
          title: "Administrative Areas",
          admin_level: "ADM4",
          dataset_type: "admin",
          source: "core",
          table_name: "admin_units",
        });
        merged.push({
          id: "core-pop",
          title: "Population Data",
          admin_level: "ADM4",
          dataset_type: "population",
          source: "core",
          table_name: "population_data",
        });
        if (includeGIS) {
          merged.push({
            id: "core-gis",
            title: "GIS Features",
            admin_level: "ADM3",
            dataset_type: "gis",
            source: "core",
            table_name: "gis_features",
          });
        }
      }

      if (includeOther) {
        const { data: md, error } = await supabase
          .from("dataset_metadata")
          .select("id, title, admin_level, dataset_type, country_iso")
          .eq("country_iso", countryIso)
          .order("title");

        if (!error && md) {
          merged.push(
            ...md.map((d: any) => ({
              id: d.id as string,
              title: d.title || "(Untitled dataset)",
              admin_level: d.admin_level || null,
              dataset_type: d.dataset_type || null,
              source: "other" as const,
              table_name: (d.title || `dataset_${d.id}`) // placeholder table name if needed
                .replace(/\s+/g, "_")
                .toLowerCase(),
            }))
          );
        }
      }

      if (includeDerived) {
        const { data: dv } = await supabase
          .from("view_derived_dataset_summary")
          .select("derived_dataset_id, derived_title, admin_level")
          .eq("country_iso", countryIso)
          .order("derived_title");
        if (dv) {
          merged.push(
            ...dv.map((d: any) => ({
              id: d.derived_dataset_id as string,
              title: d.derived_title as string,
              admin_level: (d.admin_level as string) ?? null,
              dataset_type: "derived",
              source: "derived" as const,
              table_name: `derived_${d.derived_dataset_id}`,
            }))
          );
        }
      }

      if (!cancelled) setDatasets(merged);
    })();
    return () => {
      cancelled = true;
    };
  }, [countryIso, includeCore, includeOther, includeDerived, includeGIS]);

  // Grouped lists
  const groupDatasets = useMemo(
    () => ({
      core: datasets.filter((d) => d.source === "core"),
      other: datasets.filter((d) => d.source === "other"),
      derived: datasets.filter((d) => d.source === "derived"),
    }),
    [datasets]
  );

  // Auto target + heads-up
  useEffect(() => {
    if (!datasetA && !datasetB) return;
    const hierarchy = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"];
    const idxA = datasetA?.admin_level ? hierarchy.indexOf(datasetA.admin_level) : -1;
    const idxB = datasetB?.admin_level ? hierarchy.indexOf(datasetB.admin_level) : -1;

    if (idxA < 0 && idxB < 0) {
      setAggregationNotice(null);
      return;
    }
    if (idxA === -1 && idxB >= 0) {
      setTargetLevel(datasetB!.admin_level || "ADM4");
      setAggregationNotice(null);
      return;
    }
    if (idxB === -1 && idxA >= 0) {
      setTargetLevel(datasetA!.admin_level || "ADM4");
      setAggregationNotice(null);
      return;
    }

    const deeper = idxA > idxB ? datasetA?.admin_level : datasetB?.admin_level;
    const higher = idxA > idxB ? datasetB?.admin_level : datasetA?.admin_level;
    const nextTarget = deeper ?? "ADM4";
    setTargetLevel(nextTarget);
    setAggregationNotice(
      deeper !== higher && deeper && higher
        ? `Aggregating ${deeper} to ${higher} may require summarization; preview shows the result at ${nextTarget}.`
        : null
    );
  }, [datasetA, datasetB]);

  // auto-suggest title
  useEffect(() => {
    const tA = datasetA?.title ?? "A";
    const tB = useScalarB ? `scalar(${scalarB ?? "?"})` : (datasetB?.title ?? "B");
    setDsTitle(`${tA} ${method} ${tB} @ ${targetLevel}`);
  }, [datasetA, datasetB, useScalarB, scalarB, method, targetLevel]);

  // Preview JOIN
  const handlePreviewJoin = async () => {
    setPreviewError(null);
    setShowJoinPreview(false);
    setPreviewRows([]);
    if (!datasetA) {
      setPreviewError("Select Dataset A.");
      return;
    }
    if (!useScalarB && !datasetB) {
      setPreviewError("Select Dataset B or enable Scalar B.");
      return;
    }
    if (useScalarB && (scalarB === undefined || scalarB === null || isNaN(Number(scalarB)))) {
      setPreviewError("Enter a numeric scalar for B.");
      return;
    }

    setLoading(true);
    try {
      // For now we assume population column for core pop; adjust if you expose column pickers.
      const colA = "population";
      const colB = useScalarB ? "population" : "population";

      const payload: Record<string, any> = {
        p_table_a: datasetA.table_name,
        p_table_b: useScalarB ? (datasetB?.table_name ?? datasetA.table_name) : datasetB?.table_name,
        p_join_a: joinFieldA,
        p_join_b: joinFieldB,
        p_country: countryIso,
        p_target_level: targetLevel, // e.g., 'ADM4'
        p_method: method,            // 'sum' | 'multiply' | 'ratio' | 'difference'
        p_col_a: colA,
        p_col_b: colB,
        p_use_scalar_b: useScalarB,
        p_scalar_b_val: useScalarB ? Number(scalarB) : null,
      };

      const { data, error } = await supabase.rpc(PREVIEW_RPC, payload);
      if (error) throw error;

      const rows: JoinPreviewRow[] =
        (data || []).map((r: any) => ({
          pcode: r.pcode,
          name: r.name,
          parent_pcode: r.parent_pcode ?? null,
          parent_name: r.parent_name ?? null,
          a: r.a ?? null,
          b: useScalarB ? (scalarB ?? null) : (r.b ?? null),
          derived: r.derived ?? null,
          col_a_used: r.col_a_used ?? null,
          col_b_used: useScalarB ? "scalar" : (r.col_b_used ?? null),
        })) ?? [];

      setPreviewRows(rows);
      setShowJoinPreview(true);
    } catch (e: any) {
      console.error(e);
      setPreviewError(e?.message || "Preview failed.");
    } finally {
      setLoading(false);
    }
  };

  // Save (Create)
  const handleCreate = async () => {
    setSaveError(null);
    if (!showJoinPreview || previewRows.length === 0) {
      setSaveError("Generate a preview before creating.");
      return;
    }
    if (!dsTitle.trim()) {
      setSaveError("Please provide a title.");
      return;
    }

    setSaving(true);
    try {
      const sources = {
        a: datasetA
          ? { type: datasetA.source, id: datasetA.id, title: datasetA.title, admin_level: datasetA.admin_level ?? null }
          : null,
        b: useScalarB
          ? { type: "scalar", id: datasetB?.id ?? null, title: datasetB?.title ?? null, value: scalarB }
          : (datasetB
            ? { type: datasetB.source, id: datasetB.id, title: datasetB.title, admin_level: datasetB.admin_level ?? null }
            : null),
      };

      const rows = previewRows.map((r) => ({
        pcode: r.pcode,
        name: r.name,
        parent_pcode: r.parent_pcode ?? null,
        parent_name: r.parent_name ?? null,
        a: r.a,
        b: useScalarB ? (scalarB ?? null) : r.b,
        derived: r.derived,
        col_a_used: r.col_a_used ?? "A",
        col_b_used: useScalarB ? "scalar" : (r.col_b_used ?? "B"),
      }));

      const { data, error } = await supabase.rpc("create_derived_dataset", {
        p_country: countryIso,
        p_title: dsTitle.trim(),
        p_admin_level: targetLevel,
        p_year: dsYear ?? null,
        p_method: method,
        p_sources: sources as any,
        p_scalar_b: useScalarB ? Number(scalarB) : null,
        p_rows: rows as any,
      });

      if (error) throw error;

      onCreated?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      setSaveError(e?.message || "Failed to create derived dataset.");
    } finally {
      setSaving(false);
    }
  };

  // click outside to close
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={onBackdropClick}
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold">Create Derived Dataset</h2>
            <p className="text-xs text-gray-600">Step 1: Join alignment → Step 2: Derivation</p>
          </div>
          <button aria-label="Close" className="p-1 rounded hover:bg-gray-100" onClick={onClose}>
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 max-h-[78vh] overflow-y-auto">
          {/* Source toggles */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={includeCore} onChange={(e) => setIncludeCore(e.target.checked)} />
              <span>Include Core</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={includeOther} onChange={(e) => setIncludeOther(e.target.checked)} />
              <span>Include Other</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={includeDerived}
                onChange={(e) => setIncludeDerived(e.target.checked)}
              />
              <span>Include Derived</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={includeGIS} onChange={(e) => setIncludeGIS(e.target.checked)} />
              <span>Include GIS</span>
            </label>
          </div>

          {aggregationNotice && (
            <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded">
              <AlertTriangle className="w-4 h-4 mt-[2px]" />
              <span>{aggregationNotice}</span>
            </div>
          )}

          {/* Dataset Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Dataset A */}
            <div className="border rounded-lg p-3">
              <label className="text-xs font-semibold">Dataset A</label>
              <select
                className="w-full border rounded p-2 text-sm mt-1"
                value={datasetA?.id || ""}
                onChange={(e) => setDatasetA(datasets.find((d) => d.id === e.target.value) || null)}
              >
                <option value="">Select dataset...</option>
                <optgroup label="Core Datasets">
                  {groupDatasets.core.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other Datasets">
                  {groupDatasets.other.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Derived Datasets">
                  {groupDatasets.derived.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                    </option>
                  ))}
                </optgroup>
              </select>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs">Join Field</span>
                <select
                  value={joinFieldA}
                  onChange={(e) => setJoinFieldA(e.target.value)}
                  className="border rounded px-2 py-1 text-xs"
                >
                  <option value="pcode">pcode</option>
                  <option value="admin_pcode">admin_pcode</option>
                  <option value="id">id</option>
                </select>
              </div>

              <Button variant="link" className="text-xs mt-1" onClick={() => setShowPreviewA((p) => !p)}>
                {showPreviewA ? "Hide preview" : "Show preview"}
              </Button>
              {showPreviewA && (
                <div className="mt-2 p-2 border rounded max-h-32 overflow-y-auto text-xs text-gray-700">
                  <p className="font-semibold">{datasetA?.title ?? "—"}</p>
                  <p className="italic text-gray-500">[dataset preview]</p>
                </div>
              )}
            </div>

            {/* Dataset B */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Dataset B</label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={useScalarB}
                    onChange={(e) => setUseScalarB(e.target.checked)}
                  />
                  Use scalar for B
                </label>
              </div>

              {!useScalarB ? (
                <>
                  <select
                    className="w-full border rounded p-2 text-sm mt-1"
                    value={datasetB?.id || ""}
                    onChange={(e) => setDatasetB(datasets.find((d) => d.id === e.target.value) || null)}
                  >
                    <option value="">Select dataset...</option>
                    <optgroup label="Core Datasets">
                      {groupDatasets.core.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other Datasets">
                      {groupDatasets.other.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Derived Datasets">
                      {groupDatasets.derived.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs">Join Field</span>
                    <select
                      value={joinFieldB}
                      onChange={(e) => setJoinFieldB(e.target.value)}
                      className="border rounded px-2 py-1 text-xs"
                    >
                      <option value="pcode">pcode</option>
                      <option value="admin_pcode">admin_pcode</option>
                      <option value="id">id</option>
                    </select>
                  </div>

                  <Button variant="link" className="text-xs mt-1" onClick={() => setShowPreviewB((p) => !p)}>
                    {showPreviewB ? "Hide preview" : "Show preview"}
                  </Button>
                  {showPreviewB && (
                    <div className="mt-2 p-2 border rounded max-h-32 overflow-y-auto text-xs text-gray-700">
                      <p className="font-semibold">{datasetB?.title ?? "—"}</p>
                      <p className="italic text-gray-500">[dataset preview]</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-2">
                  <label className="block text-xs font-semibold mb-1">Scalar value for B</label>
                  <input
                    type="number"
                    step="any"
                    className="border rounded px-2 py-1 text-sm w-40"
                    value={scalarB ?? ""}
                    onChange={(e) => setScalarB(e.target.value === "" ? undefined : Number(e.target.value))}
                    placeholder="e.g. 5.1"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Example: average household size (ADM0 singleton) → use as divisor/multiplier in formulas.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Target + method + preview */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs">Target level</span>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                className="border rounded px-2 py-1 text-xs"
              >
                {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs">Method</span>
              <div className="flex gap-1">
                {(["multiply", "ratio", "sum", "difference"] as Method[]).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={method === m ? "default" : "outline"}
                    onClick={() => setMethod(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewJoin}
              disabled={loading || !datasetA || (!datasetB && !useScalarB)}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Generating preview…
                </>
              ) : (
                "Preview join"
              )}
            </Button>

            {previewError && <span className="text-xs text-red-600">{previewError}</span>}
          </div>

          {/* Compact Preview */}
          {showJoinPreview && (
            <>
              <div className="mt-2 border rounded p-2 text-xs overflow-auto max-h-64">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="p-1 border text-left">PCode</th>
                      <th className="p-1 border text-left">Name</th>
                      <th className="p-1 border text-left">Parent</th>
                      <th className="p-1 border text-right">A</th>
                      <th className="p-1 border text-right">B</th>
                      <th className="p-1 border text-right">Derived</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-1">{r.pcode}</td>
                        <td className="p-1">{r.name}</td>
                        <td className="p-1">
                          {r.parent_pcode
                            ? `${r.parent_pcode}${r.parent_name ? ` – ${r.parent_name}` : ""}`
                            : "—"}
                        </td>
                        <td className="p-1 text-right">{r.a ?? "—"}</td>
                        <td className="p-1 text-right">{r.b ?? (useScalarB ? scalarB ?? "—" : "—")}</td>
                        <td className="p-1 text-right">{r.derived ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[10px] text-gray-500 mt-1">Showing up to 50 rows.</p>
              </div>

              {/* Save-as strip */}
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Title</label>
                  <input
                    className="border rounded px-2 py-1 text-sm w-72"
                    value={dsTitle}
                    onChange={(e) => setDsTitle(e.target.value)}
                    placeholder="Derived dataset title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Year (optional)</label>
                  <input
                    className="border rounded px-2 py-1 text-sm w-28"
                    type="number"
                    value={dsYear ?? ""}
                    onChange={(e) => setDsYear(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 2024"
                  />
                </div>
                {saveError && <div className="text-xs text-red-600">{saveError}</div>}
              </div>
            </>
          )}

          {/* Step helper text */}
          <h3 className="text-sm font-semibold mt-4 mb-2">Step 2: Derivation / Aggregation</h3>
          <div className="text-xs mb-2">
            Formula:{" "}
            <strong>
              {datasetA?.title || "A"} {method} {useScalarB ? `scalar(${scalarB ?? "?"})` : datasetB?.title || "B"} →{" "}
              {targetLevel}
            </strong>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !showJoinPreview}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
