"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle, X } from "lucide-react";

type Method = "multiply" | "ratio" | "sum" | "difference";
type Source = "core" | "other" | "derived";

type DatasetOption = {
  id: string;
  title: string;
  admin_level?: string | null;
  dataset_type?: string | null;
  source: Source;
  table_name: string;
};

type JoinPreviewRow = {
  pcode: string;
  name: string;
  a: number | null;
  b: number | null;
  derived: number | null;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  countryIso,
  onClose,
  onCreated,
}: {
  open: boolean;
  countryIso: string;
  onClose: () => void;
  onCreated?: (meta?: { title: string; indicator?: string; notes?: string }) => void;
}) {
  if (!open) return null;

  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Catalog + selections
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);

  // Joins / method / level
  const [joinFieldA, setJoinFieldA] = useState("pcode");
  const [joinFieldB, setJoinFieldB] = useState("pcode");
  const [targetLevel, setTargetLevel] = useState("ADM4");
  const [method, setMethod] = useState<Method>("multiply");

  // Toggles
  const [includeCore, setIncludeCore] = useState(true);
  const [includeOther, setIncludeOther] = useState(true);
  const [includeDerived, setIncludeDerived] = useState(true);
  const [includeGIS, setIncludeGIS] = useState(true);

  // Scalar mode for B
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number | null>(5.1);

  // Notices & loading
  const [aggNotice, setAggNotice] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Dataset mini-previews
  const [showPrevA, setShowPrevA] = useState(false);
  const [showPrevB, setShowPrevB] = useState(false);
  const [previewA, setPreviewA] = useState<any[]>([]);
  const [previewB, setPreviewB] = useState<any[]>([]);

  // Join preview rows
  const [joinRows, setJoinRows] = useState<JoinPreviewRow[]>([]);
  const [showJoin, setShowJoin] = useState(false);

  // Result metadata
  const [resultTitle, setResultTitle] = useState("");
  const [resultIndicator, setResultIndicator] = useState("");
  const [resultNotes, setResultNotes] = useState("");

  // ---------- Load dataset options ----------
  useEffect(() => {
    let stop = false;
    (async () => {
      const merged: DatasetOption[] = [];

      if (includeCore) {
        merged.push(
          {
            id: "core-admin",
            title: "Administrative Boundaries",
            admin_level: "ADM4",
            dataset_type: "admin",
            source: "core" as const,
            table_name: "admin_units",
          },
          {
            id: "core-pop",
            title: "Population Data",
            admin_level: "ADM4",
            dataset_type: "population",
            source: "core" as const,
            table_name: "population_data",
          },
          ...(includeGIS
            ? [
                {
                  id: "core-gis",
                  title: "GIS Features",
                  admin_level: "ADM4",
                  dataset_type: "gis",
                  source: "core" as const,
                  table_name: "gis_features",
                },
              ]
            : [])
        );
      }

      if (includeOther) {
        const { data } = await supabase
          .from("dataset_metadata")
          .select("id,title,admin_level,dataset_type,country_iso")
          .eq("country_iso", countryIso)
          .order("title");
        if (data) {
          merged.push(
            ...data.map((d: any) => ({
              id: d.id,
              title: d.title || "(Untitled)",
              admin_level: d.admin_level,
              dataset_type: d.dataset_type,
              source: "other" as const,
              table_name: (d.title || `dataset_${d.id}`)
                .replace(/\s+/g, "_")
                .toLowerCase(),
            }))
          );
        }
      }

      if (includeDerived) {
        const { data } = await supabase
          .from("view_derived_dataset_summary")
          .select("derived_dataset_id,derived_title,admin_level")
          .eq("country_iso", countryIso)
          .order("derived_title");
        if (data) {
          merged.push(
            ...data.map((d: any) => ({
              id: d.derived_dataset_id,
              title: d.derived_title,
              admin_level: d.admin_level,
              dataset_type: "derived",
              source: "derived" as const,
              table_name: `derived_${d.derived_dataset_id}`,
            }))
          );
        }
      }

      if (!stop) setDatasets(merged);
    })();
    return () => {
      stop = true;
    };
  }, [countryIso, includeCore, includeOther, includeDerived, includeGIS]);

  // ---------- Sense target/notice ----------
  useEffect(() => {
    if (!datasetA || (!datasetB && !useScalarB)) return;
    const lv = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"];
    const ia = lv.indexOf(datasetA.admin_level || "");
    const ib = useScalarB ? ia : lv.indexOf(datasetB?.admin_level || "");
    if (ia < 0 || ib < 0) return;

    const deeper = ia > ib ? datasetA.admin_level : datasetB?.admin_level;
    const higher = ia > ib ? datasetB?.admin_level : datasetA.admin_level;

    setTargetLevel(deeper ?? "ADM4");
    setAggNotice(
      deeper && higher && deeper !== higher
        ? `Aggregating ${deeper} to ${higher}; preview is shown at ${deeper}.`
        : null
    );
  }, [datasetA, datasetB, useScalarB]);

  // ---------- Mini previews ----------
  const loadMiniPreview = async (
    tableName: string,
    setter: (rows: any[]) => void
  ) => {
    // Generic “peek”: we don’t know the shape, just show first 10 rows.
    const { data } = await supabase.from(tableName).select("*").limit(10);
    setter(data || []);
  };

  useEffect(() => {
    if (showPrevA && datasetA) loadMiniPreview(datasetA.table_name, setPreviewA);
  }, [showPrevA, datasetA]);

  useEffect(() => {
    if (!useScalarB && showPrevB && datasetB)
      loadMiniPreview(datasetB.table_name, setPreviewB);
  }, [showPrevB, datasetB, useScalarB]);

  // ---------- Join preview ----------
  const handlePreviewJoin = async () => {
    if (!datasetA || (!datasetB && !useScalarB)) return;
    setLoadingPreview(true);
    setShowJoin(false);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table_name,
      p_table_b: useScalarB ? null : datasetB?.table_name ?? null,
      p_join_a: joinFieldA,
      p_join_b: joinFieldB,
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      // columns default to population for now; we can expose a picker later
      p_col_a: "population",
      p_col_b: "population",
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
    });

    if (error) {
      console.error("Join preview error:", error);
      setLoadingPreview(false);
      return;
    }

    setJoinRows(
      (data || []).map((r: any) => ({
        pcode: r.pcode,
        name: r.name,
        a: r.a ?? null,
        b: r.b ?? null,
        derived: r.derived ?? null,
      }))
    );
    setShowJoin(true);
    setLoadingPreview(false);
  };

  // ---------- Grouped option lists ----------
  const grouped = useMemo(
    () => ({
      core: datasets.filter((d) => d.source === "core"),
      other: datasets.filter((d) => d.source === "other"),
      derived: datasets.filter((d) => d.source === "derived"),
    }),
    [datasets]
  );

  // ---------- Close by clicking backdrop ----------
  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  // ---------- Create (only passes metadata upward; actual write is next step) ----------
  const canCreate =
    !!datasetA && (!!datasetB || useScalarB) && resultTitle.trim().length > 0;

  return (
    <div
      ref={backdropRef}
      onClick={onBackdrop}
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h2 className="text-xl font-semibold">Create Derived Dataset</h2>
            <p className="text-xs text-gray-600">Step 1 Join → Step 2 Derivation</p>
          </div>
          <button
            className="p-1 rounded hover:bg-gray-100"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 max-h-[80vh] overflow-y-auto">
          {/* Source filters */}
          <div className="flex flex-wrap gap-4 mb-3 text-sm">
            {([
              { label: "Include Core", v: includeCore, s: setIncludeCore },
              { label: "Include Other", v: includeOther, s: setIncludeOther },
              { label: "Include Derived", v: includeDerived, s: setIncludeDerived },
            ] as const).map(({ label, v, s }, i) => (
              <label key={i} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={v}
                  onChange={(e) => s(e.target.checked)}
                />
                <span>{label}</span>
              </label>
            ))}
            {includeCore && (
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={includeGIS}
                  onChange={(e) => setIncludeGIS(e.target.checked)}
                />
                <span>Include GIS</span>
              </label>
            )}
          </div>

          {aggNotice && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded">
              <AlertTriangle className="w-4 h-4 mt-[2px]" />
              <span>{aggNotice}</span>
            </div>
          )}

          {/* Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dataset A */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Dataset A</label>
                <div className="flex items-center gap-2 text-xs">
                  <span>Join</span>
                  <select
                    value={joinFieldA}
                    onChange={(e) => setJoinFieldA(e.target.value)}
                    className="border rounded px-2 py-0.5"
                  >
                    <option value="pcode">pcode</option>
                    <option value="admin_pcode">admin_pcode</option>
                    <option value="id">id</option>
                  </select>
                </div>
              </div>

              <select
                className="w-full border rounded p-2 text-sm mt-1"
                value={datasetA?.id || ""}
                onChange={(e) =>
                  setDatasetA(datasets.find((d) => d.id === e.target.value) || null)
                }
              >
                <option value="">Select dataset…</option>
                {(["core", "other", "derived"] as const).map((k) => (
                  <optgroup
                    key={k}
                    label={`${k[0].toUpperCase()}${k.slice(1)} Datasets`}
                  >
                    {grouped[k].map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <button
                className="text-xs text-blue-600 mt-2 underline"
                onClick={() => setShowPrevA((p) => !p)}
                disabled={!datasetA}
              >
                {showPrevA ? "Hide preview" : "Show preview"}
              </button>
              {showPrevA && (
                <div className="mt-2 border rounded p-2 text-xs max-h-32 overflow-auto">
                  {previewA.length === 0 ? (
                    <div className="text-gray-500 italic">[dataset preview]</div>
                  ) : (
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(previewA, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>

            {/* Dataset B (dataset or scalar) */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold">Dataset B</label>
                <label className="text-xs flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={useScalarB}
                    onChange={(e) => setUseScalarB(e.target.checked)}
                  />
                  Use scalar for B
                </label>
              </div>

              {useScalarB ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    step="any"
                    className="border rounded px-2 py-1 text-sm w-28"
                    value={scalarB ?? ""}
                    onChange={(e) =>
                      setScalarB(e.target.value === "" ? null : Number(e.target.value))
                    }
                    placeholder="e.g. 5.1"
                  />
                  <span className="text-xs text-gray-500">
                    Example: Avg HH Size (ADM0 singleton)
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mt-1">
                    <select
                      className="w-full border rounded p-2 text-sm"
                      value={datasetB?.id || ""}
                      onChange={(e) =>
                        setDatasetB(
                          datasets.find((d) => d.id === e.target.value) || null
                        )
                      }
                    >
                      <option value="">Select dataset…</option>
                      {(["core", "other", "derived"] as const).map((k) => (
                        <optgroup
                          key={k}
                          label={`${k[0].toUpperCase()}${k.slice(1)} Datasets`}
                        >
                          {grouped[k].map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span>Join</span>
                    <select
                      value={joinFieldB}
                      onChange={(e) => setJoinFieldB(e.target.value)}
                      className="border rounded px-2 py-0.5"
                    >
                      <option value="pcode">pcode</option>
                      <option value="admin_pcode">admin_pcode</option>
                      <option value="id">id</option>
                    </select>
                    <button
                      className="text-blue-600 underline ml-auto"
                      onClick={() => setShowPrevB((p) => !p)}
                      disabled={!datasetB}
                    >
                      {showPrevB ? "Hide preview" : "Show preview"}
                    </button>
                  </div>

                  {showPrevB && (
                    <div className="mt-2 border rounded p-2 text-xs max-h-32 overflow-auto">
                      {previewB.length === 0 ? (
                        <div className="text-gray-500 italic">[dataset preview]</div>
                      ) : (
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(previewB, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Method + target + join preview */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="text-xs text-gray-600">
              Target level: <strong>{targetLevel}</strong>
            </div>
            <div className="flex gap-2">
              {(["multiply", "ratio", "sum", "difference"] as Method[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`px-3 py-1 rounded text-xs ${
                    method === m
                      ? "bg-blue-600 text-white"
                      : "border hover:bg-gray-50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              onClick={handlePreviewJoin}
              disabled={
                loadingPreview || !datasetA || (!datasetB && !useScalarB)
              }
              className="ml-auto border rounded px-3 py-1 text-xs hover:bg-gray-50"
            >
              {loadingPreview ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" />
                  Generating…
                </>
              ) : (
                "Preview join"
              )}
            </button>
          </div>

          {/* Join preview table */}
          {showJoin && (
            <div className="mt-2 border rounded p-2 text-xs overflow-auto max-h-96">
              <table className="min-w-full text-xs border-collapse">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-1 border text-left">PCode</th>
                    <th className="p-1 border text-left">Name</th>
                    <th className="p-1 border text-right">A</th>
                    <th className="p-1 border text-right">B</th>
                    <th className="p-1 border text-right">Derived</th>
                  </tr>
                </thead>
                <tbody>
                  {joinRows.slice(0, 150).map((r, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-1">{r.pcode}</td>
                      <td className="p-1">{r.name}</td>
                      <td className="p-1 text-right">{r.a ?? "—"}</td>
                      <td className="p-1 text-right">{r.b ?? "—"}</td>
                      <td className="p-1 text-right">{r.derived ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-gray-500 mt-1">
                Showing up to 150 rows.
              </p>
            </div>
          )}

          {/* Result metadata */}
          <h3 className="text-sm font-semibold mt-5 mb-2">
            Result Metadata / Indicator Link
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Title</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., Population per Household (ADM4)"
                value={resultTitle}
                onChange={(e) => setResultTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Indicator Match</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Optional indicator ref"
                value={resultIndicator}
                onChange={(e) => setResultIndicator(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-600">Notes</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
              placeholder="Optional notes about formula, assumptions, sources…"
              value={resultNotes}
              onChange={(e) => setResultNotes(e.target.value)}
            />
          </div>

          {/* Formula summary */}
          <div className="text-xs text-gray-700 mt-3">
            Formula:&nbsp;
            <strong>
              {(datasetA?.title || "A")} {method}{" "}
              {useScalarB ? `scalar(${scalarB ?? "?"})` : datasetB?.title || "B"}{" "}
              → {targetLevel}
            </strong>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="border rounded px-3 py-1 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button
            disabled={!canCreate}
            onClick={() => {
              onCreated?.({
                title: resultTitle.trim(),
                indicator: resultIndicator.trim(),
                notes: resultNotes.trim(),
              });
              onClose();
            }}
            className={`px-3 py-1 text-sm rounded ${
              canCreate ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
