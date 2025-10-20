"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle } from "lucide-react";

/** Lightweight local Button — avoids external UI deps to keep builds stable */
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
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center rounded transition-colors " +
    (disabled ? "opacity-50 cursor-not-allowed " : "hover:opacity-90 ");
  const variants: Record<string, string> = {
    default: "bg-blue-600 text-white",
    outline: "border border-gray-300 text-gray-700",
    link: "text-blue-600 underline",
  };
  const sizes: Record<string, string> = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
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

type DatasetOption = {
  id: string;
  title: string;
  dataset_type: string;
  admin_level: string | null;
  is_active?: boolean | null;
};

type JoinPreviewRow = {
  pcode: string;
  name: string;
  a: number | null;
  b: number | null;
  derived: number | null;
};

type DownPreviewRow = {
  parent_level: string;
  parent_pcode: string;
  parent_name: string;
  child_level: string;
  child_pcode: string;
  child_name: string;
  parent_value: number | null;
  weight_value: number | null;
  allocated_value: number | null;
};

export default function CreateDerivedDatasetWizard_JoinAware({
  open = true,
  countryIso,
  onClose,
  onCreated,
}: {
  open?: boolean;
  countryIso: string;
  onClose: () => void;
  onCreated?: () => void;
}) {
  if (!open) return null;

  // -----------------------------
  // State — datasets and controls
  // -----------------------------
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [includeGIS, setIncludeGIS] = useState(true);

  // Step 1: Join alignment (A + B)
  const [datasetAId, setDatasetAId] = useState<string>("");
  const [datasetBId, setDatasetBId] = useState<string>("");
  const [joinFieldA, setJoinFieldA] = useState<string>("pcode");
  const [joinFieldB, setJoinFieldB] = useState<string>("pcode");
  const [targetLevel, setTargetLevel] = useState<string>("ADM4");
  const [method, setMethod] = useState<"multiply" | "ratio" | "sum" | "difference">("multiply");
  const [aggregationNotice, setAggregationNotice] = useState<string | null>(null);

  // Step 2: dataset previews + join preview
  const [showPreviewA, setShowPreviewA] = useState(false);
  const [showPreviewB, setShowPreviewB] = useState(false);
  const [previewAData, setPreviewAData] = useState<any[]>([]);
  const [previewBData, setPreviewBData] = useState<any[]>([]);
  const [joinPreviewRows, setJoinPreviewRows] = useState<JoinPreviewRow[]>([]);
  const [showJoinPreview, setShowJoinPreview] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);

  // Step 3: Downward disaggregation preview
  const [showDownPreview, setShowDownPreview] = useState(false);
  const [downParentDatasetId, setDownParentDatasetId] = useState<string>("");
  const [downMethod, setDownMethod] = useState<"weighted" | "equal">("weighted");
  const [downParentLevel, setDownParentLevel] = useState<"ADM2" | "ADM3">("ADM3");
  const [downChildLevel, setDownChildLevel] = useState<"ADM3" | "ADM4">("ADM4");
  const [downRows, setDownRows] = useState<DownPreviewRow[]>([]);
  const [loadingDown, setLoadingDown] = useState(false);

  const dsA = useMemo(() => datasets.find((d) => d.id === datasetAId) || null, [datasets, datasetAId]);
  const dsB = useMemo(() => datasets.find((d) => d.id === datasetBId) || null, [datasets, datasetBId]);
  const dsDown = useMemo(
    () => datasets.find((d) => d.id === downParentDatasetId) || null,
    [datasets, downParentDatasetId]
  );

  // -----------------------------
  // Load datasets list (robust)
  // -----------------------------
  useEffect(() => {
    (async () => {
      // Pull all active dataset_metadata rows for the country
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id,title,dataset_type,admin_level,is_active,country_iso")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .order("title", { ascending: true });

      if (error) {
        console.error("dataset_metadata fetch error:", error.message);
        setDatasets([]);
        return;
      }

      let rows: DatasetOption[] =
        (data || []).map((d: any) => ({
          id: String(d.id),
          title: d.title ?? "Untitled Dataset",
          dataset_type: d.dataset_type ?? "other",
          admin_level: d.admin_level ?? null,
          is_active: d.is_active ?? true,
        })) ?? [];

      // Optionally omit GIS from pickers
      if (!includeGIS) {
        rows = rows.filter((r) => (r.dataset_type || "").toLowerCase() !== "gis");
      }

      setDatasets(rows);
    })();
  }, [countryIso, includeGIS]);

  // --------------------------------------
  // Auto target level + heads-up notice
  // --------------------------------------
  useEffect(() => {
    if (!dsA || !dsB) {
      setAggregationNotice(null);
      return;
    }
    const order = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"];
    const ia = dsA.admin_level ? order.indexOf(dsA.admin_level) : -1;
    const ib = dsB.admin_level ? order.indexOf(dsB.admin_level) : -1;
    if (ia === -1 || ib === -1) {
      setAggregationNotice(null);
      return;
    }
    const deeper = ia > ib ? dsA.admin_level! : dsB.admin_level!;
    const higher = ia > ib ? dsB.admin_level! : dsA.admin_level!;
    setTargetLevel(deeper);
    if (deeper !== higher) {
      setAggregationNotice(
        `Heads up: A is at ${dsA.admin_level ?? "—"}, B is at ${dsB.admin_level ?? "—"}. ` +
          `Preview will align at ${deeper}.`
      );
    } else {
      setAggregationNotice(null);
    }
  }, [dsA, dsB]);

  // --------------------------------------
  // Helpers — preview fetchers for A & B
  // --------------------------------------
  async function fetchDatasetPreview(datasetId: string): Promise<any[]> {
    if (!datasetId) return [];
    // Try the enriched view first
    const tryView = await supabase
      .from("view_dataset_values_with_names")
      .select("admin_pcode,name,value,unit")
      .eq("dataset_id", datasetId)
      .limit(25);

    if (!tryView.error && tryView.data && tryView.data.length > 0) {
      return tryView.data;
    }

    // Fallback to raw dataset_values
    const raw = await supabase
      .from("dataset_values")
      .select("admin_pcode,value,unit")
      .eq("dataset_id", datasetId)
      .limit(25);

    if (!raw.error && raw.data) return raw.data;
    return [];
  }

  // --------------------------------------
  // Actions — toggle previews
  // --------------------------------------
  async function handleTogglePreviewA() {
    if (!showPreviewA) {
      const rows = await fetchDatasetPreview(datasetAId);
      setPreviewAData(rows);
    }
    setShowPreviewA((v) => !v);
  }

  async function handleTogglePreviewB() {
    if (!showPreviewB) {
      const rows = await fetchDatasetPreview(datasetBId);
      setPreviewBData(rows);
    }
    setShowPreviewB((v) => !v);
  }

  // --------------------------------------
  // Action — Step 2 Join preview via RPC
  // --------------------------------------
  async function handlePreviewJoin() {
    if (!dsA || !dsB) return;
    setLoadingJoin(true);
    setShowJoinPreview(false);
    setJoinPreviewRows([]);

    // We’ll use a conservative call that most consistently returns rows for your current DB:
    // function signature we’ve been testing:
    // simulate_join_preview_aggregate(table_a text, table_b text, field_a text, field_b text, p_country text, target_level text, method text)
    //
    // For now, anchor to the canonical admin + population tables if it looks like that join:
    const detectAdmin = (label: string) => /admin/i.test(label);
    const detectPop = (label: string) => /pop(ulation)?/i.test(label);

    const tableA =
      detectAdmin(dsA.title) || (dsA.dataset_type || "").toLowerCase() === "admin"
        ? "admin_units"
        : "dataset_values";
    const tableB =
      detectPop(dsB.title) || (dsB.dataset_type || "").toLowerCase() === "population"
        ? "population_data"
        : "dataset_values";

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
      console.error("Join preview error:", error);
      setLoadingJoin(false);
      return;
    }

    const rows: JoinPreviewRow[] =
      (data || []).map((r: any) => ({
        pcode: r.pcode,
        name: r.name,
        a: r.a ?? null,
        b: r.b ?? null,
        derived: r.derived ?? null,
      })) ?? [];

    setJoinPreviewRows(rows);
    setShowJoinPreview(true);
    setLoadingJoin(false);
  }

  // --------------------------------------
  // Action — Step 3 Downward disaggregation preview via RPC
  // --------------------------------------
  async function handleDownPreview() {
    if (!downParentDatasetId) return;
    setLoadingDown(true);
    setShowDownPreview(false);
    setDownRows([]);

    // RPC signature (validated in SQL):
    // simulate_downward_preview_disaggregate_multi(
    //   p_country text,
    //   p_parent_dataset_id uuid,
    //   p_method text DEFAULT 'weighted',
    //   p_weight_source text DEFAULT 'population_data',
    //   p_parent_level text DEFAULT 'ADM3',
    //   p_child_level text DEFAULT 'ADM4',
    //   p_value_column text DEFAULT 'value'
    // )
    const { data, error } = await supabase.rpc("simulate_downward_preview_disaggregate_multi", {
      p_country: countryIso,
      p_parent_dataset_id: downParentDatasetId,
      p_method: downMethod, // 'weighted' | 'equal'
      p_weight_source: "population_data",
      p_parent_level: downParentLevel,
      p_child_level: downChildLevel,
      p_value_column: "value",
    });

    if (error) {
      console.error("Downward preview error:", error);
      setLoadingDown(false);
      return;
    }

    const rows: DownPreviewRow[] =
      (data || []).map((r: any) => ({
        parent_level: r.parent_level,
        parent_pcode: r.parent_pcode,
        parent_name: r.parent_name,
        child_level: r.child_level,
        child_pcode: r.child_pcode,
        child_name: r.child_name,
        parent_value: r.parent_value ?? null,
        weight_value: r.weight_value ?? null,
        allocated_value: r.allocated_value ?? null,
      })) ?? [];

    setDownRows(rows);
    setShowDownPreview(true);
    setLoadingDown(false);
  }

  // --------------------------------------
  // Create action (placeholder)
  // --------------------------------------
  async function handleCreate() {
    // We will wire this to your create_* function(s) later.
    if (onCreated) onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg p-4 my-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Create Derived Dataset</h2>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <p className="text-xs text-gray-600 mb-4">
          Step 1: Join Alignment → Step 2: Derivation → Step 3: Disaggregate (optional)
        </p>

        <label className="flex items-center space-x-2 mb-4 text-sm">
          <input
            type="checkbox"
            checked={includeGIS}
            onChange={(e) => setIncludeGIS(e.target.checked)}
          />
          <span>Include GIS datasets</span>
        </label>

        {/* Step 1 — Join alignment */}
        <h3 className="text-sm font-semibold mb-2">Step 1 — Join Alignment</h3>
        {aggregationNotice && (
          <div className="flex items-start space-x-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-xs p-2 mb-3 rounded">
            <AlertTriangle className="w-4 h-4 mt-[2px]" />
            <span>{aggregationNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Dataset A */}
          <div className="border rounded p-3">
            <label className="text-xs font-semibold">Dataset A</label>
            <select
              className="w-full border rounded p-2 text-sm mt-1"
              value={datasetAId}
              onChange={(e) => setDatasetAId(e.target.value)}
            >
              <option value="">Select...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs">Join Field</label>
              <select
                value={joinFieldA}
                onChange={(e) => setJoinFieldA(e.target.value)}
                className="border rounded px-2 py-1 text-xs"
              >
                <option value="pcode">pcode</option>
                <option value="admin_pcode">admin_pcode</option>
                <option value="id">id</option>
              </select>
              <Button variant="link" size="sm" onClick={handleTogglePreviewA}>
                {showPreviewA ? "Hide preview" : "Show preview"}
              </Button>
            </div>

            {showPreviewA && (
              <div className="mt-2 p-2 border rounded max-h-40 overflow-y-auto text-xs text-gray-700">
                {previewAData.length === 0 ? (
                  <p className="italic text-gray-500">No preview rows.</p>
                ) : (
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-gray-600">
                        <th className="text-left p-1">PCode</th>
                        <th className="text-left p-1">Name</th>
                        <th className="text-right p-1">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewAData.slice(0, 15).map((r: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="p-1">{r.admin_pcode ?? "—"}</td>
                          <td className="p-1">{r.name ?? "—"}</td>
                          <td className="p-1 text-right">
                            {r.value ?? r.population ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="text-[10px] text-gray-500 mt-1">Showing up to 15 rows.</p>
              </div>
            )}
          </div>

          {/* Dataset B */}
          <div className="border rounded p-3">
            <label className="text-xs font-semibold">Dataset B</label>
            <select
              className="w-full border rounded p-2 text-sm mt-1"
              value={datasetBId}
              onChange={(e) => setDatasetBId(e.target.value)}
            >
              <option value="">Select...</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 mt-2">
              <label className="text-xs">Join Field</label>
              <select
                value={joinFieldB}
                onChange={(e) => setJoinFieldB(e.target.value)}
                className="border rounded px-2 py-1 text-xs"
              >
                <option value="pcode">pcode</option>
                <option value="admin_pcode">admin_pcode</option>
                <option value="id">id</option>
              </select>
              <Button variant="link" size="sm" onClick={handleTogglePreviewB}>
                {showPreviewB ? "Hide preview" : "Show preview"}
              </Button>
            </div>

            {showPreviewB && (
              <div className="mt-2 p-2 border rounded max-h-40 overflow-y-auto text-xs text-gray-700">
                {previewBData.length === 0 ? (
                  <p className="italic text-gray-500">No preview rows.</p>
                ) : (
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="text-gray-600">
                        <th className="text-left p-1">PCode</th>
                        <th className="text-left p-1">Name</th>
                        <th className="text-right p-1">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewBData.slice(0, 15).map((r: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="p-1">{r.admin_pcode ?? "—"}</td>
                          <td className="p-1">{r.name ?? "—"}</td>
                          <td className="p-1 text-right">
                            {r.value ?? r.population ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="text-[10px] text-gray-500 mt-1">Showing up to 15 rows.</p>
              </div>
            )}
          </div>
        </div>

        {/* Target + method */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs">Target admin level:</span>
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
            <span className="text-xs">Formula:</span>
            {(["multiply", "ratio", "sum", "difference"] as const).map((m) => (
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

          <Button
            variant="link"
            size="sm"
            onClick={handlePreviewJoin}
            disabled={loadingJoin || !dsA || !dsB}
          >
            {loadingJoin ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" /> Generating join preview…
              </>
            ) : (
              "Preview join"
            )}
          </Button>
        </div>

        {/* Join preview table */}
        {showJoinPreview && (
          <div className="mt-2 border rounded p-2 text-xs overflow-auto max-h-72">
            {joinPreviewRows.length === 0 ? (
              <div className="text-gray-500 italic">No rows previewed.</div>
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
                  {joinPreviewRows.slice(0, 25).map((r, i) => (
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
        )}

        {/* Step 3 — Disaggregate (optional) */}
        <h3 className="text-sm font-semibold mt-6 mb-2">Step 3 — Downward Disaggregation (optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold">Parent dataset (e.g., ADM3 poverty %)</label>
            <select
              className="w-full border rounded p-2 text-sm mt-1"
              value={downParentDatasetId}
              onChange={(e) => setDownParentDatasetId(e.target.value)}
            >
              <option value="">Select…</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} {d.admin_level ? `(${d.admin_level})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold">Method</label>
            <select
              className="w-full border rounded p-2 text-sm mt-1"
              value={downMethod}
              onChange={(e) => setDownMethod(e.target.value as "weighted" | "equal")}
            >
              <option value="weighted">Weighted (population)</option>
              <option value="equal">Equal split</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold">From</label>
            <select
              className="w-full border rounded p-2 text-sm mt-1"
              value={downParentLevel}
              onChange={(e) => setDownParentLevel(e.target.value as "ADM2" | "ADM3")}
            >
              <option value="ADM2">ADM2</option>
              <option value="ADM3">ADM3</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold">To</label>
            <select
              className="w-full border rounded p-2 text-sm mt-1"
              value={downChildLevel}
              onChange={(e) => setDownChildLevel(e.target.value as "ADM3" | "ADM4")}
            >
              <option value="ADM3">ADM3</option>
              <option value="ADM4">ADM4</option>
            </select>
          </div>
        </div>

        <div className="mt-2">
          <Button
            variant="link"
            size="sm"
            onClick={handleDownPreview}
            disabled={loadingDown || !downParentDatasetId}
          >
            {loadingDown ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" /> Generating disaggregation preview…
              </>
            ) : (
              "Preview disaggregation"
            )}
          </Button>
          {dsDown?.admin_level && (
            <span className="text-xs text-gray-500 ml-2">
              Parent: {dsDown.admin_level} → Child: {downChildLevel}
            </span>
          )}
        </div>

        {showDownPreview && (
          <div className="mt-2 border rounded p-2 text-xs overflow-auto max-h-72">
            {downRows.length === 0 ? (
              <div className="text-gray-500 italic">No rows previewed.</div>
            ) : (
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="text-left p-1 border">Parent (lvl)</th>
                    <th className="text-left p-1 border">Parent PCode</th>
                    <th className="text-left p-1 border">Parent Name</th>
                    <th className="text-left p-1 border">Child (lvl)</th>
                    <th className="text-left p-1 border">Child PCode</th>
                    <th className="text-left p-1 border">Child Name</th>
                    <th className="text-right p-1 border">Parent Val</th>
                    <th className="text-right p-1 border">Weight</th>
                    <th className="text-right p-1 border">Allocated</th>
                  </tr>
                </thead>
                <tbody>
                  {downRows.slice(0, 25).map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1">{r.parent_level}</td>
                      <td className="p-1">{r.parent_pcode}</td>
                      <td className="p-1">{r.parent_name}</td>
                      <td className="p-1">{r.child_level}</td>
                      <td className="p-1">{r.child_pcode}</td>
                      <td className="p-1">{r.child_name}</td>
                      <td className="p-1 text-right">{r.parent_value ?? "—"}</td>
                      <td className="p-1 text-right">{r.weight_value ?? "—"}</td>
                      <td className="p-1 text-right">{r.allocated_value ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-[10px] text-gray-500 mt-1">Showing up to 25 rows.</p>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-end mt-6">
          <Button variant="outline" className="mr-2" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create</Button>
        </div>
      </div>
    </div>
  );
}
