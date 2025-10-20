"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { AlertTriangle, Loader2, ChevronDown, ChevronRight, Eye } from "lucide-react";

type Method = "multiply" | "sum" | "ratio" | "difference";
type AdminLevel = "ADM0" | "ADM1" | "ADM2" | "ADM3" | "ADM4";
const HIERARCHY: AdminLevel[] = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"];

type DatasetOption = {
  id: string;
  title: string;
  dataset_type: string | null;
  admin_level: AdminLevel | null;
  join_field: string | null;
  // internal UI flags
  _kind: "builtin" | "user";
  _table: "admin_units" | "population_data" | "gis_features" | "unknown";
};

type PreviewRowA = { pcode?: string; name?: string; level?: string; parent_pcode?: string };
type PreviewRowB = { pcode?: string; population?: number | null; value?: number | null };

type JoinPreviewRow = {
  pcode: string;
  name: string;
  a: number | null;
  b: number | null;
  derived: number | null;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onCreated?: () => void;
}) {
  // Early escape to avoid rendering when closed (preserves page layout; controlled by parent)
  if (!open) return null;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [includeGIS, setIncludeGIS] = useState(true);

  const [allDatasets, setAllDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);

  const [joinFieldA, setJoinFieldA] = useState<string>("pcode");
  const [joinFieldB, setJoinFieldB] = useState<string>("pcode");

  const [targetLevel, setTargetLevel] = useState<AdminLevel>("ADM4");
  const [aggregationNotice, setAggregationNotice] = useState<string | null>(null);

  const [method, setMethod] = useState<Method>("multiply");

  const [loadingPreviewJoin, setLoadingPreviewJoin] = useState(false);
  const [joinPreview, setJoinPreview] = useState<JoinPreviewRow[]>([]);

  // collapsible dataset previews
  const [showPreviewA, setShowPreviewA] = useState<boolean>(false);
  const [showPreviewB, setShowPreviewB] = useState<boolean>(false);
  const [previewRowsA, setPreviewRowsA] = useState<PreviewRowA[]>([]);
  const [previewRowsB, setPreviewRowsB] = useState<PreviewRowB[]>([]);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const builtinTop: DatasetOption[] = useMemo(() => {
    const base: DatasetOption[] = [
      {
        id: "__admins",
        title: "Administrative Boundaries",
        dataset_type: "admin",
        admin_level: null,
        join_field: "pcode",
        _kind: "builtin",
        _table: "admin_units",
      },
      {
        id: "__population",
        title: "Population Data",
        dataset_type: "population",
        admin_level: "ADM4",
        join_field: "pcode",
        _kind: "builtin",
        _table: "population_data",
      },
    ];
    if (includeGIS) {
      base.push({
        id: "__gis",
        title: "GIS Layers",
        dataset_type: "gis",
        admin_level: null,
        join_field: "pcode",
        _kind: "builtin",
        _table: "gis_features",
      });
    }
    return base;
  }, [includeGIS]);

  // restrict join fields per table-kind (keeps list clean and relevant)
  const availableJoinFields = (d: DatasetOption | null): string[] => {
    if (!d) return ["pcode"];
    if (d._table === "admin_units") return ["pcode", "parent_pcode"];
    if (d._table === "population_data") return ["pcode"];
    if (d._table === "gis_features") return ["pcode"];
    // user datasets (until we unify), we expose likely keys
    return ["admin_pcode", "pcode", "id"];
  };

  // ---------------------------------------------------------------------------
  // Load datasets: builtin + active metadata
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;
    (async () => {
      // pull all active user datasets
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id, title, dataset_type, admin_level, join_field, is_active")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .order("title", { ascending: true });

      if (!mounted) return;

      if (error) {
        console.error("dataset_metadata load error:", error);
        setAllDatasets(builtinTop); // fallback to builtin only
        return;
      }

      const users: DatasetOption[] =
        (data || []).map((r: any) => ({
          id: r.id,
          title: r.title ?? "Untitled",
          dataset_type: r.dataset_type ?? null,
          admin_level: (r.admin_level as AdminLevel) ?? null,
          join_field: r.join_field ?? null,
          _kind: "user",
          _table:
            r.dataset_type === "admin"
              ? "admin_units"
              : r.dataset_type === "population"
              ? "population_data"
              : r.dataset_type === "gis"
              ? "gis_features"
              : "unknown",
        })) ?? [];

      setAllDatasets([...builtinTop, ...users]);
    })();
    return () => {
      mounted = false;
    };
  }, [countryIso, builtinTop]);

  // ---------------------------------------------------------------------------
  // Keep target level & notice in sync with A/B choices
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!datasetA || !datasetB) return;
    const a = datasetA.admin_level ?? "ADM4";
    const b = datasetB.admin_level ?? "ADM4";
    const idxA = HIERARCHY.indexOf(a);
    const idxB = HIERARCHY.indexOf(b);
    if (idxA === -1 || idxB === -1) return;

    const deeper = idxA > idxB ? a : b;
    const higher = idxA > idxB ? b : a;
    setTargetLevel(deeper);

    if (deeper !== higher) {
      setAggregationNotice(
        `Admin level mismatch detected: A is ${a}, B is ${b}. The preview will align to ${deeper} and may aggregate or disaggregate as needed.`
      );
    } else {
      setAggregationNotice(null);
    }
  }, [datasetA, datasetB]);

  // ---------------------------------------------------------------------------
  // Dataset Previews (collapsible)
  // ---------------------------------------------------------------------------
  const loadPreviewA = async () => {
    if (!datasetA) return;
    setLoadingA(true);
    setPreviewRowsA([]);
    try {
      if (datasetA._table === "admin_units") {
        const { data } = await supabase
          .from("admin_units")
          .select("pcode, name, level, parent_pcode")
          .eq("country_iso", countryIso)
          .order("pcode")
          .limit(15);
        setPreviewRowsA((data as any) || []);
      } else if (datasetA._table === "population_data") {
        const { data } = await supabase
          .from("population_data")
          .select("pcode, population")
          .order("pcode")
          .limit(15);
        setPreviewRowsA((data as any) || []);
      } else if (datasetA._table === "gis_features") {
        const { data } = await supabase
          .from("gis_features")
          .select("pcode, admin_level")
          .order("pcode")
          .limit(15);
        setPreviewRowsA((data as any) || []);
      } else {
        // generic preview via view (if present). We try names + values by admin pcode.
        const { data } = await supabase
          .from("view_dataset_values_with_names")
          .select("admin_pcode, admin_name, value")
          .order("admin_pcode")
          .limit(15);
        setPreviewRowsA(
          (data || []).map((r: any) => ({
            pcode: r.admin_pcode,
            name: r.admin_name,
            level: undefined,
            parent_pcode: undefined,
            value: r.value,
          }))
        );
      }
    } catch (e) {
      console.warn("preview A error:", e);
    } finally {
      setLoadingA(false);
    }
  };

  const loadPreviewB = async () => {
    if (!datasetB) return;
    setLoadingB(true);
    setPreviewRowsB([]);
    try {
      if (datasetB._table === "admin_units") {
        const { data } = await supabase
          .from("admin_units")
          .select("pcode, name, level, parent_pcode")
          .eq("country_iso", countryIso)
          .order("pcode")
          .limit(15);
        setPreviewRowsB((data as any) || []);
      } else if (datasetB._table === "population_data") {
        const { data } = await supabase
          .from("population_data")
          .select("pcode, population")
          .order("pcode")
          .limit(15);
        setPreviewRowsB((data as any) || []);
      } else if (datasetB._table === "gis_features") {
        const { data } = await supabase
          .from("gis_features")
          .select("pcode, admin_level")
          .order("pcode")
          .limit(15);
        setPreviewRowsB((data as any) || []);
      } else {
        const { data } = await supabase
          .from("view_dataset_values_with_names")
          .select("admin_pcode, admin_name, value")
          .order("admin_pcode")
          .limit(15);
        setPreviewRowsB(
          (data || []).map((r: any) => ({
            pcode: r.admin_pcode,
            population: undefined,
            value: r.value,
          }))
        );
      }
    } catch (e) {
      console.warn("preview B error:", e);
    } finally {
      setLoadingB(false);
    }
  };

  useEffect(() => {
    if (showPreviewA) loadPreviewA();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreviewA, datasetA, countryIso]);

  useEffect(() => {
    if (showPreviewB) loadPreviewB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPreviewB, datasetB, countryIso]);

  // ---------------------------------------------------------------------------
  // Join preview (calls existing RPC)
  // ---------------------------------------------------------------------------
  const handlePreviewJoin = async () => {
    if (!datasetA || !datasetB) return;
    setLoadingPreviewJoin(true);
    setJoinPreview([]);
    try {
      // resolve physical tables
      const tableA = datasetA._table;
      const tableB = datasetB._table;

      // guard: only preview reliably for admin/pop/gis (others need per-dataset filtering)
      if (tableA === "unknown" || tableB === "unknown") {
        setJoinPreview([]);
        setLoadingPreviewJoin(false);
        alert(
          "Preview currently supports Admin/Population/GIS sources. User-uploaded datasets will preview once dataset value routing is wired."
        );
        return;
      }

      const { data, error } = await supabase.rpc("simulate_join_preview_aggregate", {
        table_a: tableA,
        table_b: tableB,
        field_a: joinFieldA || "pcode",
        field_b: joinFieldB || "pcode",
        p_country: countryIso,
        target_level: targetLevel,
        method,
      });

      if (error) {
        console.error("simulate_join_preview_aggregate error:", error);
        setJoinPreview([]);
      } else {
        const rows =
          (data || []).map((r: any) => ({
            pcode: r.pcode,
            name: r.name,
            a: r.a ?? null,
            b: r.b ?? null,
            derived: r.derived ?? null,
          })) ?? [];
        setJoinPreview(rows);
      }
    } catch (e) {
      console.error("Join preview exception:", e);
    } finally {
      setLoadingPreviewJoin(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Math line (clear explanation)
  // ---------------------------------------------------------------------------
  const mathLine = useMemo(() => {
    const A = datasetA?.title || "A";
    const B = datasetB?.title || "B";
    switch (method) {
      case "multiply":
        return `Derived = ${A} × ${B}`;
      case "sum":
        return `Derived = ${A} + ${B}`;
      case "ratio":
        return `Derived = ${A} ÷ ${B}`;
      case "difference":
        return `Derived = ${A} − ${B}`;
      default:
        return "";
    }
  }, [datasetA, datasetB, method]);

  // ensure selected join fields are constrained to the dataset’s allowed list
  useEffect(() => {
    const fields = availableJoinFields(datasetA);
    if (!fields.includes(joinFieldA)) setJoinFieldA(fields[0] || "pcode");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetA]);

  useEffect(() => {
    const fields = availableJoinFields(datasetB);
    if (!fields.includes(joinFieldB)) setJoinFieldB(fields[0] || "pcode");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetB]);

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  const fieldSelect = (value: string, onChange: (v: string) => void, options: string[]) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded px-2 py-1 text-xs"
    >
      {options.map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  );

  const DatasetSelect = ({
    which,
    value,
    onChange,
  }: {
    which: "A" | "B";
    value: string;
    onChange: (id: string) => void;
  }) => {
    const label = which === "A" ? "Dataset A" : "Dataset B";
    return (
      <div>
        <label className="text-xs font-semibold">{label}</label>
        <select
          className="w-full border rounded p-2 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <optgroup label="Core datasets">
            {builtinTop.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </optgroup>
          {allDatasets.filter((d) => d._kind === "user").length > 0 && (
            <optgroup label="Other datasets">
              {allDatasets
                .filter((d) => d._kind === "user")
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      </div>
    );
  };

  const chosenA = allDatasets.find((d) => d.id === datasetA?.id) || datasetA;
  const chosenB = allDatasets.find((d) => d.id === datasetB?.id) || datasetB;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg border">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Create Derived Dataset</h2>
          <button
            className="text-sm px-2 py-1 border rounded hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="p-4">
          <p className="text-xs text-gray-600 mb-3">
            Step 1: Join Alignment → Step 2: Derivation. Target level defaults based on the
            deeper of the two inputs.
          </p>

          <label className="flex items-center space-x-2 mb-4 text-sm">
            <input
              type="checkbox"
              checked={includeGIS}
              onChange={(e) => setIncludeGIS(e.target.checked)}
            />
            <span>Include GIS datasets</span>
          </label>

          {aggregationNotice && (
            <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded">
              <AlertTriangle className="w-4 h-4 mt-[2px]" />
              <span>{aggregationNotice}</span>
            </div>
          )}

          {/* Step 1: Join Alignment */}
          <h3 className="text-sm font-semibold mb-2">Step 1 — Join Alignment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            {/* Dataset A */}
            <div className="border rounded p-3">
              <DatasetSelect
                which="A"
                value={datasetA?.id || builtinTop[0]?.id || ""}
                onChange={(id) => {
                  const next =
                    allDatasets.find((d) => d.id === id) ||
                    builtinTop.find((d) => d.id === id) ||
                    null;
                  setDatasetA(next);
                }}
              />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-700">Join Field</span>
                {fieldSelect(joinFieldA, setJoinFieldA, availableJoinFields(chosenA || null))}
              </div>

              {/* Preview A */}
              <button
                className="mt-2 text-xs inline-flex items-center gap-1 text-blue-600 hover:underline"
                onClick={() => setShowPreviewA((s) => !s)}
              >
                {showPreviewA ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Preview
              </button>
              {showPreviewA && (
                <div className="mt-2 p-2 border rounded max-h-40 overflow-y-auto text-xs text-gray-700">
                  {loadingA ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                    </div>
                  ) : previewRowsA.length === 0 ? (
                    <div className="text-gray-500 italic">No rows.</div>
                  ) : chosenA?._table === "admin_units" ? (
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="border p-1 text-left">pcode</th>
                          <th className="border p-1 text-left">name</th>
                          <th className="border p-1 text-left">level</th>
                          <th className="border p-1 text-left">parent_pcode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRowsA.map((r, i) => (
                          <tr key={i}>
                            <td className="border p-1">{r.pcode}</td>
                            <td className="border p-1">{r.name}</td>
                            <td className="border p-1">{r.level}</td>
                            <td className="border p-1">{r.parent_pcode}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : chosenA?._table === "population_data" ? (
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="border p-1 text-left">pcode</th>
                          <th className="border p-1 text-right">population</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(previewRowsA as any[]).map((r, i) => (
                          <tr key={i}>
                            <td className="border p-1">{r.pcode}</td>
                            <td className="border p-1 text-right">{r.population ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-gray-600">
                      Generic preview (admin_pcode, name, value)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dataset B */}
            <div className="border rounded p-3">
              <DatasetSelect
                which="B"
                value={datasetB?.id || builtinTop[1]?.id || ""}
                onChange={(id) => {
                  const next =
                    allDatasets.find((d) => d.id === id) ||
                    builtinTop.find((d) => d.id === id) ||
                    null;
                  setDatasetB(next);
                }}
              />
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-700">Join Field</span>
                {fieldSelect(joinFieldB, setJoinFieldB, availableJoinFields(chosenB || null))}
              </div>

              {/* Preview B */}
              <button
                className="mt-2 text-xs inline-flex items-center gap-1 text-blue-600 hover:underline"
                onClick={() => setShowPreviewB((s) => !s)}
              >
                {showPreviewB ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Preview
              </button>
              {showPreviewB && (
                <div className="mt-2 p-2 border rounded max-h-40 overflow-y-auto text-xs text-gray-700">
                  {loadingB ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                    </div>
                  ) : previewRowsB.length === 0 ? (
                    <div className="text-gray-500 italic">No rows.</div>
                  ) : chosenB?._table === "admin_units" ? (
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="border p-1 text-left">pcode</th>
                          <th className="border p-1 text-left">name</th>
                          <th className="border p-1 text-left">level</th>
                          <th className="border p-1 text-left">parent_pcode</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(previewRowsB as any[]).map((r, i) => (
                          <tr key={i}>
                            <td className="border p-1">{r.pcode}</td>
                            <td className="border p-1">{r.name}</td>
                            <td className="border p-1">{r.level}</td>
                            <td className="border p-1">{r.parent_pcode}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : chosenB?._table === "population_data" ? (
                    <table className="min-w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="border p-1 text-left">pcode</th>
                          <th className="border p-1 text-right">population</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(previewRowsB as any[]).map((r, i) => (
                          <tr key={i}>
                            <td className="border p-1">{r.pcode}</td>
                            <td className="border p-1 text-right">{r.population ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-gray-600">Generic preview (admin_pcode, name, value)</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Target level + Math */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700">Target level</span>
              <select
                className="border rounded px-2 py-1 text-xs"
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value as AdminLevel)}
              >
                {HIERARCHY.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-700">Operation</span>
              <div className="flex gap-1">
                {(["multiply", "sum", "ratio", "difference"] as Method[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`text-xs px-2 py-1 rounded border ${
                      method === m ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="ml-auto text-xs text-gray-700 flex items-center gap-2">
              <Eye className="w-3 h-3" />
              <span className="font-medium">{mathLine}</span>
              <span className="text-gray-500">→ {targetLevel}</span>
            </div>
          </div>

          <div className="mb-3">
            <button
              className="text-xs inline-flex items-center gap-2 px-2 py-1 border rounded bg-white hover:bg-gray-50"
              onClick={handlePreviewJoin}
              disabled={loadingPreviewJoin || !datasetA || !datasetB}
              title={!datasetA || !datasetB ? "Select both datasets first" : "Preview join"}
            >
              {loadingPreviewJoin ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating preview…
                </>
              ) : (
                <>Preview join</>
              )}
            </button>
          </div>

          {/* Join Preview Table */}
          <div className="mt-2 border rounded p-2 text-xs overflow-auto max-h-96">
            {joinPreview.length === 0 ? (
              <div className="text-gray-500 italic">No preview rows.</div>
            ) : (
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="text-left p-1 border">PCode</th>
                    <th className="text-left p-1 border">Name</th>
                    <th className="text-right p-1 border">A</th>
                    <th className="text-right p-1 border">B</th>
                    <th className="text-right p-1 border">Derived</th>
                  </tr>
                </thead>
                <tbody>
                  {joinPreview.slice(0, 25).map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1">{r.pcode}</td>
                      <td className="p-1">{r.name}</td>
                      <td className="p-1 text-right">{r.a ?? "—"}</td>
                      <td className="p-1 text-right">{r.b ?? "—"}</td>
                      <td className="p-1 text-right">{r.derived ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-[10px] text-gray-500 mt-1">Showing up to 25 rows.</p>
          </div>

          {/* Step 2 footer */}
          <h3 className="text-sm font-semibold mt-4 mb-2">Step 2 — Derivation</h3>
          <p className="text-xs text-gray-600 mb-3">
            The derived dataset will apply: <span className="font-medium">{mathLine}</span>.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                // Persist flow will be wired next; for now, close & refresh parent table.
                onCreated?.();
                onClose();
              }}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
