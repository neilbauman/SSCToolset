"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Dataset = {
  id: string;
  title: string;
  dataset_type: string;
  admin_level: string | null;
};
type Method = "multiply" | "ratio" | "sum" | "difference";

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onCreated?: (id?: string) => void;
}) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [includeGIS, setIncludeGIS] = useState(true);
  const [a, setA] = useState(""),
    [b, setB] = useState(""),
    [aJoin, setAJoin] = useState(""),
    [bJoin, setBJoin] = useState(""),
    [aLevel, setALevel] = useState("ADM3"),
    [bLevel, setBLevel] = useState("ADM3");
  const [aMeta, setAMeta] = useState<Dataset | null>(null),
    [bMeta, setBMeta] = useState<Dataset | null>(null);
  const [aFields, setAFields] = useState<string[]>([]),
    [bFields, setBFields] = useState<string[]>([]);
  const [aPreview, setAPreview] = useState<any[]>([]),
    [bPreview, setBPreview] = useState<any[]>([]);
  const [aCollapsed, setACollapsed] = useState(true),
    [bCollapsed, setBCollapsed] = useState(true);
  const [method, setMethod] = useState<Method>("multiply");
  const [rows, setRows] = useState<any[]>([]);
  const [warn, setWarn] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");

  // Load datasets
  useEffect(() => {
    if (open) loadDatasets();
  }, [open, includeGIS]);
  async function loadDatasets() {
    const all: Dataset[] = [];
    const { data: meta } = await supabase
      .from("dataset_metadata")
      .select("id,title,dataset_type,admin_level")
      .eq("country_iso", countryIso);
    if (meta) all.push(...meta);
    const { data: pop } = await supabase
      .from("view_population_country_active_summary")
      .select("population_title")
      .eq("country_iso", countryIso);
    if (pop?.length)
      all.push({
        id: "population_data",
        title: pop[0].population_title || "Population Dataset",
        dataset_type: "population",
        admin_level: "ADM4",
      });
    const { data: adm } = await supabase
      .from("admin_dataset_versions")
      .select("id,title,is_active,year")
      .eq("country_iso", countryIso);
    if (adm)
      all.push(
        ...adm.map((d: any) => ({
          id: d.id,
          title: d.title || "Admin Dataset",
          dataset_type: "admin",
          admin_level: "ADM4",
        }))
      );
    if (includeGIS) {
      const { data: gis } = await supabase
        .from("gis_datasets")
        .select("id,title,is_active")
        .eq("country_iso", countryIso);
      if (gis)
        all.push(
          ...gis.map((d: any) => ({
            id: d.id,
            title: d.title || "GIS Dataset",
            dataset_type: "gis",
            admin_level: null,
          }))
        );
    }
    setDatasets(all);
  }

  useEffect(() => {
    setAMeta(datasets.find((d) => d.id === a) || null);
    setBMeta(datasets.find((d) => d.id === b) || null);
  }, [a, b, datasets]);

  // Determine table for each dataset type
  const getTableForDataset = (meta: Dataset | null) => {
    if (!meta) return "dataset_values";
    switch (meta.dataset_type) {
      case "population":
        return "population_data";
      case "admin":
        return "admin_units";
      case "gis":
        return "gis_layers";
      default:
        return "dataset_values";
    }
  };

  async function fetchFields(meta: Dataset | null, setter: (v: string[]) => void, setJoin: (v: string) => void) {
    if (!meta) return setter([]);
    const table = getTableForDataset(meta);
    const { data, error } = await supabase.rpc("get_table_columns", { table_name: table });
    if (error || !data) {
      setter(["pcode", "admin_pcode", "adm_code", "id", "parent_pcode"]);
      setJoin("pcode");
    } else {
      const names = data.map((f: { column_name: string }) => f.column_name);
      setter(names);
      const guess = names.find((n) =>
        ["pcode", "admin_pcode", "adm_code", "parent_pcode"].includes(n)
      );
      setJoin(guess || names[0]);
    }
  }

  useEffect(() => {
    if (aMeta) fetchFields(aMeta, setAFields, setAJoin);
  }, [aMeta]);
  useEffect(() => {
    if (bMeta) fetchFields(bMeta, setBFields, setBJoin);
  }, [bMeta]);

  async function previewDataset(meta: Dataset | null, setter: (r: any[]) => void) {
    if (!meta) return setter([]);
    const table = getTableForDataset(meta);
    const { data } = await supabase.from(table).select("*").limit(10);
    setter(data || []);
  }
  useEffect(() => {
    if (aMeta) previewDataset(aMeta, setAPreview);
  }, [aMeta]);
  useEffect(() => {
    if (bMeta) previewDataset(bMeta, setBPreview);
  }, [bMeta]);

  useEffect(() => {
    const lv = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"];
    const idxA = lv.indexOf(aLevel),
      idxB = lv.indexOf(bLevel);
    setWarn(
      aLevel !== bLevel
        ? `⚠️ Joining ${aLevel} with ${bLevel} may require aggregation.`
        : null
    );
  }, [aLevel, bLevel]);

  async function previewJoin() {
    if (!aMeta || !bMeta) return;
    const aTable = getTableForDataset(aMeta);
    const bTable = getTableForDataset(bMeta);
    const { data, error } = await supabase.rpc("simulate_join_preview", {
      table_a: aTable,
      table_b: bTable,
      field_a: aJoin,
      field_b: bJoin,
      p_country: countryIso,
    });
    if (error || !data) {
      const fallback = await supabase
        .from("admin_units")
        .select("pcode,name,level,parent_pcode")
        .eq("country_iso", countryIso)
        .eq("level", aLevel)
        .limit(10);
      setRows(
        (fallback.data || []).map((d) => ({
          ...d,
          a: "—",
          b: "—",
          derived: "—",
        }))
      );
    } else setRows(data);
  }

  async function handleCreate() {
    if (!aMeta || !bMeta) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        "create_simple_derived_dataset_v2",
        {
          p_country_iso: countryIso,
          p_dataset_a: aMeta.id,
          p_dataset_b: bMeta.id,
          p_title: title || `${aMeta.title} × ${bMeta.title}`,
          p_method: method,
          p_admin_level: aLevel,
        }
      );
      if (error) throw error;
      onCreated?.(Array.isArray(data) ? data[0] : data);
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  const PreviewTable = ({
    rows,
    collapsed,
    toggle,
  }: {
    rows: any[];
    collapsed: boolean;
    toggle: () => void;
  }) => (
    <div className="mt-1">
      <button
        onClick={toggle}
        className="text-xs text-blue-600 hover:underline mb-1"
      >
        {collapsed ? "Show preview" : "Hide preview"}
      </button>
      {!collapsed && (
        <div className="border rounded max-h-40 overflow-auto">
          {rows.length ? (
            <table className="text-xs min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(rows[0]).map((k) => (
                    <th key={k} className="px-2 py-1 text-left">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    {Object.values(r).map((v, j) => (
                      <td key={j} className="px-2 py-1">
                        {String(v ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-xs text-gray-400 italic p-2">No data</div>
          )}
        </div>
      )}
    </div>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b">
          <h2 className="text-2xl font-semibold">Create Derived Dataset</h2>
          <p className="text-xs text-gray-500">
            Step 1 Join Alignment → Step 2 Derivation
          </p>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          <div className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={includeGIS}
              onChange={(e) => setIncludeGIS(e.target.checked)}
            />
            <label>Include GIS datasets</label>
          </div>

          <h3 className="text-sm font-semibold text-gray-700">
            Step 1 Join Alignment
          </h3>
          {warn && (
            <div className="text-xs bg-yellow-100 text-yellow-800 border p-2 rounded">
              {warn}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {[
              ["A", a, setA, aMeta, aJoin, setAJoin, aFields, aLevel, setALevel, aPreview, aCollapsed, setACollapsed],
              ["B", b, setB, bMeta, bJoin, setBJoin, bFields, bLevel, setBLevel, bPreview, bCollapsed, setBCollapsed],
            ].map(
              ([
                label,
                id,
                setId,
                meta,
                join,
                setJoin,
                fields,
                lvl,
                setLvl,
                preview,
                collapsed,
                setCollapsed,
              ]: any) => (
                <div key={label}>
                  <label className="text-sm font-medium">Dataset {label}</label>
                  <select
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full border rounded px-2 py-1.5"
                  >
                    <option value="">Select…</option>
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                  {meta && (
                    <div className="text-xs text-gray-600 mt-1">
                      Type:{meta.dataset_type} · Level:{meta.admin_level}
                    </div>
                  )}
                  {fields.length > 0 && (
                    <>
                      <label className="text-xs text-gray-700 mt-1 block">
                        Join Field
                      </label>
                      <select
                        value={join}
                        onChange={(e) => setJoin(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-xs"
                      >
                        {fields.map((f: string, i: number) => (
                          <option key={i}>{f}</option>
                        ))}
                      </select>
                    </>
                  )}
                  <label className="text-xs text-gray-700 mt-1 block">
                    Admin Level
                  </label>
                  <select
                    value={lvl}
                    onChange={(e) => setLvl(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs"
                  >
                    {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                  <PreviewTable
                    rows={preview}
                    collapsed={collapsed}
                    toggle={() => setCollapsed(!collapsed)}
                  />
                </div>
              )
            )}
          </div>

          <button
            onClick={previewJoin}
            className="text-blue-600 text-xs hover:underline mt-2"
          >
            Preview join
          </button>
          <PreviewTable
            rows={rows}
            collapsed={false}
            toggle={() => {}}
          />

          <h3 className="text-sm font-semibold text-gray-700">
            Step 2 Derivation / Aggregation
          </h3>

          <div className="text-xs text-gray-600 border rounded p-2 bg-gray-50">
            Formula: <strong>{aMeta?.title || "A"}</strong> {method}{" "}
            <strong>{bMeta?.title || "B"}</strong> → target{" "}
            <strong>{aLevel}</strong>
          </div>

          <div className="flex gap-2 mt-2">
            {(["multiply", "ratio", "sum", "difference"] as Method[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-3 py-1 border rounded text-xs ${
                  method === m ? "bg-blue-600 text-white border-blue-600" : ""
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border rounded px-2 py-1 w-full mt-2 text-sm"
            placeholder="Derived Dataset Title"
          />
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="border px-3 py-1.5 rounded">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !aMeta || !bMeta}
            className="bg-blue-600 text-white px-3 py-1.5 rounded"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
