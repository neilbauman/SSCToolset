"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle, X } from "lucide-react";

/** Lightweight, build-safe Button */
type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "outline" | "link";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
};
function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  disabled = false,
  className = "",
  type = "button",
}: ButtonProps) {
  const base =
    "rounded px-3 py-1 text-sm font-medium transition-colors " +
    (disabled ? "opacity-50 cursor-not-allowed " : "cursor-pointer ");
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    link: "text-blue-600 underline hover:text-blue-800",
  };
  const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
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

/** Types */
type Method = "multiply" | "ratio" | "sum" | "difference" | "custom";

type DatasetSource = "core" | "other" | "derived";
type DatasetOption = {
  id: string; // dataset id or logical key
  title: string;
  admin_level?: string | null;
  dataset_type?: string | null;
  source: DatasetSource;
  table_name: string; // actual table/view to query/join
};

type JoinPreviewRow = {
  pcode: string;
  name: string | null;
  a?: number | null;
  b?: number | null;
  derived: number | null;
  col_a_used?: string | null;
  col_b_used?: string | null;
};

type DatasetJoinConfig = {
  alias: "A" | "B" | "C";
  option: DatasetOption | null;
  joinField: "pcode" | "admin_pcode" | "id";
};

type Props = {
  open: boolean;
  countryIso: string;
  onClose: () => void;
  onCreated: (newId?: string) => void;
};

const ADMIN_HIERARCHY = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"] as const;

/** Utility */
const detectTargetLevel = (configs: DatasetJoinConfig[]): string => {
  const levels = configs
    .map((c) => c.option?.admin_level)
    .filter(Boolean) as string[];
  if (!levels.length) return "ADM4";
  // choose the deepest (max index)
  let deepest = "ADM0";
  let maxIdx = -1;
  for (const lvl of levels) {
    const idx = ADMIN_HIERARCHY.indexOf(lvl as any);
    if (idx > maxIdx) {
      maxIdx = idx;
      deepest = lvl;
    }
  }
  return deepest;
};

export default function CreateDerivedDatasetWizard_Multi({
  open,
  countryIso,
  onClose,
  onCreated,
}: Props) {
  // If not open, render nothing
  if (!open) return null;

  // --- modal focus trap / esc close ---
  const backdropRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ---- state ----
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [configs, setConfigs] = useState<DatasetJoinConfig[]>([
    { alias: "A", option: null, joinField: "pcode" },
    { alias: "B", option: null, joinField: "pcode" },
  ]);

  const [includeCore, setIncludeCore] = useState<boolean>(true);
  const [includeOther, setIncludeOther] = useState<boolean>(true);
  const [includeDerived, setIncludeDerived] = useState<boolean>(true);
  const [includeGIS, setIncludeGIS] = useState<boolean>(true);

  const [method, setMethod] = useState<Method>("multiply");
  const [expression, setExpression] = useState<string>(""); // used only for custom or 3 inputs
  const [targetLevel, setTargetLevel] = useState<string>("ADM4");
  const [aggregationNotice, setAggregationNotice] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [previewRows, setPreviewRows] = useState<JoinPreviewRow[]>([]);
  const [showJoinPreview, setShowJoinPreview] = useState<boolean>(false);

  // Step 2 metadata
  const [title, setTitle] = useState<string>("");
  const [year, setYear] = useState<number | "">("");
  const [description, setDescription] = useState<string>("");
  const [saveBusy, setSaveBusy] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---- fetch dataset options (core + other + derived) ----
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const merged: DatasetOption[] = [];

      if (includeCore) {
        merged.push({
          id: "core-admin",
          title: "Admin Areas",
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
            admin_level: "ADM4",
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
        if (error) {
          console.error("dataset_metadata fetch error:", error);
        }
        if (md) {
          merged.push(
            ...md.map((d: any) => ({
              id: d.id as string,
              title: d.title || "(Untitled dataset)",
              admin_level: (d.admin_level as string) || null,
              dataset_type: d.dataset_type || null,
              source: "other" as const,
              // Use normalized preview table name; server-side RPC should translate this
              table_name: (d.title || `dataset_${d.id}`)
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
              // A logical name that the multi RPC should be able to interpret/resolve
              table_name: `derived_${d.derived_dataset_id}`,
            }))
          );
        }
      }

      if (!cancelled) setDatasets(merged);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [countryIso, includeCore, includeOther, includeDerived, includeGIS]);

  // ---- recompute target level and aggregation warnings ----
  useEffect(() => {
    const nextTL = detectTargetLevel(configs);
    setTargetLevel(nextTL);

    // detect if aggregation likely needed (mixed admin levels)
    const levels = configs
      .map((c) => c.option?.admin_level)
      .filter(Boolean) as string[];
    const unique = new Set(levels);
    if (unique.size > 1) {
      setAggregationNotice(
        "Mixed admin levels detected — preview will aggregate upward to match target."
      );
    } else {
      setAggregationNotice(null);
    }
  }, [configs]);

  // --- derived: dataset groupings
  const grouped = useMemo(() => {
    return {
      core: datasets.filter((d) => d.source === "core"),
      other: datasets.filter((d) => d.source === "other"),
      derived: datasets.filter((d) => d.source === "derived"),
    };
  }, [datasets]);

  // ---- mutators ----
  const updateConfig = (idx: number, patch: Partial<DatasetJoinConfig>) => {
    setConfigs((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const addDatasetC = () => {
    if (configs.find((c) => c.alias === "C")) return;
    setConfigs((prev) => [...prev, { alias: "C", option: null, joinField: "pcode" }]);
    // Switch to custom method by default for 3-way
    setMethod("custom");
  };

  const removeDatasetC = () => {
    setConfigs((prev) => prev.filter((c) => c.alias !== "C"));
  };

  // ---- RPC Preview ----
  const handlePreviewJoin = async () => {
    setLoading(true);
    setPreviewRows([]);
    setShowJoinPreview(false);

    // Pick path:
    const chosen = configs.filter((c) => c.option != null);
    const hasThree = chosen.length >= 3;
    const usingCustom = method === "custom" || hasThree;

    try {
      if (!usingCustom) {
        // 2-input, standard method → fallback to legacy RPC
        const a = configs[0];
        const b = configs[1];
        if (!(a?.option && b?.option)) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.rpc("simulate_join_preview_aggregate", {
          table_a: a.option.table_name,
          table_b: b.option.table_name,
          field_a: a.joinField,
          field_b: b.joinField,
          p_country: countryIso,
          target_level: targetLevel,
          method,
        });

        if (error) throw error;

        const rows: JoinPreviewRow[] =
          (data || []).map((r: any) => ({
            pcode: r.pcode,
            name: r.name,
            a: r.a ?? null,
            b: r.b ?? null,
            derived: r.derived ?? null,
            col_a_used: r.col_a_used ?? null,
            col_b_used: r.col_b_used ?? null,
          })) ?? [];

        setPreviewRows(rows);
        setShowJoinPreview(true);
      } else {
        // Multi-input or custom expression → new RPC
        const payloadDatasets = chosen.map((c) => ({
          alias: c.alias,
          table: c.option?.table_name,
          join_field: c.joinField,
        }));

        // Build a sane default expression if not provided
        let expr = expression.trim();
        if (!expr) {
          // Try simple ratio A/B if available
          const names = chosen.map((c) => c.alias);
          if (names.length >= 2) {
            expr = `${names[0]}.value / ${names[1]}.value`;
          } else {
            expr = `A.value`;
          }
        }

        const { data, error } = await supabase.rpc("simulate_join_preview_multi", {
          p_country: countryIso,
          p_datasets: payloadDatasets,
          p_expression: expr,
          p_target_level: targetLevel,
        });

        if (error) throw error;

        const rows: JoinPreviewRow[] =
          (data || []).map((r: any) => ({
            pcode: r.pcode,
            name: r.name ?? null,
            derived: r.derived ?? null,
          })) ?? [];

        setPreviewRows(rows);
        setShowJoinPreview(true);
      }
    } catch (e: any) {
      console.error("Preview error:", e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  // ---- Save Derived Dataset (Step 2) ----
  const handleSave = async () => {
    setSaveBusy(true);
    setSaveError(null);
    try {
      const chosen = configs.filter((c) => c.option != null);

      const inputs = {
        datasets: chosen.map((c) => ({
          alias: c.alias,
          id: c.option?.id,
          title: c.option?.title,
          dataset_type: c.option?.dataset_type,
          table_name: c.option?.table_name,
          join_field: c.joinField,
          admin_level: c.option?.admin_level,
        })),
        method,
        expression: method === "custom" || chosen.length >= 3 ? expression : method,
        target_level: targetLevel,
      };

      // Try RPC first (if you’ve added it); otherwise fallback to direct insert
      let newId: string | undefined;

      const { data: rpcId, error: rpcError } = await supabase.rpc(
        "create_derived_dataset_record",
        {
          p_country: countryIso,
          p_title: title || "Derived Dataset",
          p_inputs: inputs,
          p_method: method,
          p_expression:
            method === "custom" || chosen.length >= 3 ? expression : method,
          p_target_level: targetLevel,
          p_year: year === "" ? null : Number(year),
        }
      );

      if (rpcError) {
        // Fallback insert if RPC is not available
        const { data: ins, error: insErr } = await supabase
          .from("derived_datasets")
          .insert({
            country_iso: countryIso,
            title: title || "Derived Dataset",
            admin_level: targetLevel,
            year: year === "" ? null : Number(year),
            method,
            inputs,
            status: "active",
          })
          .select("id")
          .single();

        if (insErr) throw insErr;
        newId = ins?.id;
      } else {
        newId = rpcId as unknown as string | undefined;
      }

      onCreated(newId);
      onClose();
    } catch (e: any) {
      console.error(e);
      setSaveError(e?.message || "Failed to create derived dataset.");
    } finally {
      setSaveBusy(false);
    }
  };

  // ---- UI helpers ----
  const methodButtons: Method[] = ["multiply", "ratio", "sum", "difference", "custom"];

  const datasetSelect = (
    cfg: DatasetJoinConfig,
    idx: number,
    label: string
  ): React.ReactNode => {
    return (
      <div className="border rounded-lg p-3">
        <label className="text-xs font-semibold">{label}</label>
        <select
          className="w-full border rounded p-2 text-sm mt-1"
          value={cfg.option?.id || ""}
          onChange={(e) =>
            updateConfig(
              idx,
              { option: datasets.find((d) => d.id === e.target.value) || null }
            )
          }
        >
          <option value="">Select dataset...</option>
          <optgroup label="Core Datasets">
            {grouped.core.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
              </option>
            ))}
          </optgroup>
          <optgroup label="Other Datasets">
            {grouped.other.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
              </option>
            ))}
          </optgroup>
          <optgroup label="Derived Datasets">
            {grouped.derived.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
              </option>
            ))}
          </optgroup>
        </select>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs">Join Field</span>
          <select
            value={cfg.joinField}
            onChange={(e) => updateConfig(idx, { joinField: e.target.value as any })}
            className="border rounded px-2 py-1 text-xs"
          >
            <option value="pcode">pcode</option>
            <option value="admin_pcode">admin_pcode</option>
            <option value="id">id</option>
          </select>
        </div>
      </div>
    );
  };

  // ---- Render ----
  return (
    <div
      ref={backdropRef}
      onClick={(e) => e.target === backdropRef.current && onClose()}
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-lg font-semibold">Create Derived Dataset</h2>
            <p className="text-xs text-gray-600">
              Step 1: Join & Preview → Step 2: Metadata & Save
            </p>
          </div>
          <button
            aria-label="Close"
            className="p-1 rounded hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 max-h-[78vh] overflow-y-auto">
          {/* Source toggles */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={includeCore}
                onChange={(e) => setIncludeCore(e.target.checked)}
              />
              <span>Include Core</span>
            </label>
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={includeOther}
                onChange={(e) => setIncludeOther(e.target.checked)}
              />
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
            {includeCore && (
              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={includeGIS}
                  onChange={(e) => setIncludeGIS(e.target.checked)}
                />
                <span>Include GIS</span>
              </label>
            )}
          </div>

          {/* Dataset Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            {datasetSelect(configs[0], 0, "Dataset A")}
            {datasetSelect(configs[1], 1, "Dataset B")}
          </div>

          {/* Optional C */}
          <div className="mb-3">
            {!configs.find((c) => c.alias === "C") ? (
              <Button size="sm" variant="outline" onClick={addDatasetC}>
                + Add Dataset C
              </Button>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {datasetSelect(
                  configs.find((c) => c.alias === "C")!,
                  configs.findIndex((c) => c.alias === "C"),
                  "Dataset C"
                )}
                <div className="flex items-end">
                  <Button size="sm" variant="outline" onClick={removeDatasetC}>
                    Remove C
                  </Button>
                </div>
              </div>
            )}
          </div>

          {aggregationNotice && (
            <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded">
              <AlertTriangle className="w-4 h-4 mt-[2px]" />
              <span>{aggregationNotice}</span>
            </div>
          )}

          {/* Method & Expression */}
          <div className="mb-3">
            <div className="text-xs font-semibold mb-1">Method</div>
            <div className="flex flex-wrap gap-2">
              {methodButtons.map((m) => (
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
            {(method === "custom" || configs.filter((c) => c.option).length >= 3) && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">
                  Custom Expression (e.g., <code>A.population / B.area_km2</code>)
                </div>
                <input
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  placeholder="A.population / B.area_km2"
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>

          {/* Join Preview */}
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewJoin}
              disabled={
                loading ||
                !configs[0]?.option ||
                !configs[1]?.option ||
                (method === "custom" &&
                  (expression.trim().length === 0 ||
                    !["A", "B", "C"].some((al) => expression.includes(`${al}.`))))
              }
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
            <div className="text-xs text-gray-600">
              Target level: <span className="font-semibold">{targetLevel}</span>
            </div>
          </div>

          {showJoinPreview && (
            <div className="mt-2 border rounded p-2 text-xs overflow-auto max-h-48">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="p-1 border text-left">PCode</th>
                    <th className="p-1 border text-left">Name</th>
                    {/* Only show A/B cols when legacy RPC used */}
                    {previewRows.some((r) => typeof r.a !== "undefined") && (
                      <>
                        <th className="p-1 border text-right">A</th>
                        <th className="p-1 border text-right">B</th>
                      </>
                    )}
                    <th className="p-1 border text-right">Derived</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 25).map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1">{r.pcode}</td>
                      <td className="p-1">{r.name ?? "—"}</td>
                      {typeof r.a !== "undefined" && (
                        <>
                          <td className="p-1 text-right">
                            {r.a == null ? "—" : r.a}
                          </td>
                          <td className="p-1 text-right">
                            {r.b == null ? "—" : r.b}
                          </td>
                        </>
                      )}
                      <td className="p-1 text-right">
                        {r.derived == null ? "—" : r.derived}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-gray-500 mt-1">Showing up to 25 rows.</p>
            </div>
          )}

          {/* Step 2: Metadata */}
          <h3 className="text-sm font-semibold mt-4 mb-2">Step 2: Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-700">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Population Density (ADM3)"
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Year</label>
              <input
                value={year}
                onChange={(e) => {
                  const v = e.target.value;
                  setYear(v === "" ? "" : Number(v));
                }}
                placeholder="2025"
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Target Admin Level</label>
              <input
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-700">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of the derivation"
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
          {saveError && (
            <div className="text-xs text-red-600 mt-2">{saveError}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveBusy || !title || previewRows.length === 0}
          >
            {saveBusy ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1 inline" />
                Saving…
              </>
            ) : (
              "Save Derived Dataset"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
