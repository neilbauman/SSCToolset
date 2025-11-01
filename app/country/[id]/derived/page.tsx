"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
  Eye,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Database,
  DatabaseOff,
  Loader2,
  Info,
} from "lucide-react";
import DerivedDatasetWizard from "@/components/country/wizard";
import type { CountryParams } from "@/app/country/types";

type Method = "ratio" | "multiply" | "sum" | "difference";

type DerivedMeta = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string | null;
  target_level: string | null;
  method: Method | string;
  created_at: string;
  is_parametric: boolean | null;
  storage_model: "fixed" | "uuid_table" | null;
  record_count: number | null;
  normalize_percent: boolean | null;
};

type UnifiedRow = {
  dataset_id: string;
  dataset_title: string;
  dataset_type: "derived" | "other" | "gradient" | "adm0" | "core" | string;
  data_type: "numeric" | "categorical" | "percentage" | string | null;
  country_iso: string;
  admin_level: string;
  join_field: string;
  created_at: string;
  updated_at: string;
};

type PreviewRow = {
  dataset_id: string;
  admin_pcode: string;
  value: number | null;
  category_code: string | null;
  category_label: string | null;
  dataset_type: string;
};

export default function DerivedDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;

  // table (list) state
  const [datasets, setDatasets] = useState<DerivedMeta[]>([]);
  const [sortField, setSortField] = useState<keyof DerivedMeta>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // selection + preview
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMeta, setSelectedMeta] = useState<DerivedMeta | null>(null);
  const [unifiedInfo, setUnifiedInfo] = useState<UnifiedRow | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // health/coverage
  const [valueCount, setValueCount] = useState<number | null>(null);
  const [targetCount, setTargetCount] = useState<number | null>(null);

  // wizard
  const [openWizard, setOpenWizard] = useState(false);
  const [editDataset, setEditDataset] = useState<any | null>(null);

  // --- Load list
  async function loadDatasets() {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select(
        "id,title,description,admin_level,target_level,method,created_at,is_parametric,storage_model,record_count,normalize_percent"
      )
      .eq("country_iso", countryIso)
      .order(sortField as string, { ascending: sortAsc });

    if (!error && data) {
      setDatasets(data as DerivedMeta[]);
      // re-sync selection row (keep selected if still present)
      if (selectedId) {
        const found = data.find((d) => d.id === selectedId) as DerivedMeta | undefined;
        setSelectedMeta(found ?? null);
      }
    }
  }

  useEffect(() => {
    loadDatasets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField, sortAsc, countryIso]);

  const toggleSort = (field: keyof DerivedMeta) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDatasets();
    // also refresh the preview/health if a dataset is selected
    if (selectedId) {
      await loadUnifiedInfo(selectedId);
      await loadPreview(selectedId);
      await loadHealth(selectedId);
    }
    setRefreshing(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete derived dataset "${title}"?`)) return;
    await supabase.from("derived_dataset_metadata").delete().eq("id", id);
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedMeta(null);
      setUnifiedInfo(null);
      setPreview([]);
      setValueCount(null);
      setTargetCount(null);
    }
    await loadDatasets();
  };

  // --- Unified info for selected dataset (data_type, join_field, etc.)
  async function loadUnifiedInfo(id: string) {
    // unified_datasets is a VIEW we created
    const { data, error } = await supabase
      .from("unified_datasets")
      .select("*")
      .eq("dataset_id", id)
      .maybeSingle();

    if (!error && data) setUnifiedInfo(data as UnifiedRow);
    else setUnifiedInfo(null);
  }

  // --- Health / coverage (uses unified_dataset_values_mat to count values)
  async function loadHealth(id: string) {
    // count values for selected dataset (works for fixed + parametric)
    const { count: rowCount } = await supabase
      .from("unified_dataset_values_mat")
      .select("admin_pcode", { count: "exact", head: true })
      .eq("dataset_id", id);
    setValueCount(rowCount ?? null);

    // count target admin units at (target_level || admin_level) in this country
    const level = selectedMeta?.target_level || selectedMeta?.admin_level;
    if (level) {
      const { count: targCount } = await supabase
        .from("admin_units")
        .select("admin_pcode", { count: "exact", head: true })
        .eq("country_iso", countryIso)
        .eq("admin_level", level);
      setTargetCount(targCount ?? null);
    } else {
      setTargetCount(null);
    }
  }

  // --- Preview values (inline panel)
  async function loadPreview(id: string) {
    setLoadingPreview(true);
    setPreview([]);
    // get_dataset_values(p_dataset_id uuid)
    const { data, error } = await supabase.rpc("get_dataset_values", { p_dataset_id: id });
    setLoadingPreview(false);
    if (!error && data) {
      // light client-side limit to keep UI snappy
      const trimmed = (data as PreviewRow[]).slice(0, 300);
      setPreview(trimmed);
    } else {
      setPreview([]);
    }
  }

  // selecting a dataset row
  const onSelect = async (meta: DerivedMeta) => {
    setSelectedId(meta.id);
    setSelectedMeta(meta);
    await loadUnifiedInfo(meta.id);
    await loadPreview(meta.id);
    await loadHealth(meta.id);
  };

  // Materialize / Dematerialize
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const handleMaterialize = async (meta: DerivedMeta) => {
    setBusyActionId(meta.id);
    const { error } = await supabase.rpc("materialize_derived_dataset", { p_dataset_id: meta.id });
    setBusyActionId(null);
    if (error) {
      alert("Materialize failed: " + error.message);
      return;
    }
    await loadDatasets();
    if (selectedId === meta.id) {
      await loadPreview(meta.id);
      await loadHealth(meta.id);
    }
  };

  const handleDematerialize = async (meta: DerivedMeta) => {
    if (!confirm(`Dematerialize "${meta.title}"? This deletes stored rows but keeps the definition.`)) return;
    setBusyActionId(meta.id);
    const { error } = await supabase.rpc("dematerialize_derived_dataset", { p_dataset_id: meta.id });
    setBusyActionId(null);
    if (error) {
      alert("Dematerialize failed: " + error.message);
      return;
    }
    await loadDatasets();
    if (selectedId === meta.id) {
      await loadPreview(meta.id);
      await loadHealth(meta.id);
    }
  };

  // Pretty helpers
  const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString() : "—");
  const levelOf = (m?: DerivedMeta | null) => m?.target_level || m?.admin_level || "—";
  const dataTypeBadge = (u?: UnifiedRow | null) => {
    const t = u?.data_type || "numeric";
    return t === "categorical" ? "Categorical" : t === "percentage" ? "Percentage" : "Numeric";
  };
  const fixedBadge = (m?: DerivedMeta | null) =>
    m?.storage_model === "fixed" ? "Fixed" : "Parametric";
  const healthPct = useMemo(() => {
    if (!valueCount || !targetCount || targetCount === 0) return null;
    return Math.round((valueCount / targetCount) * 100);
  }, [valueCount, targetCount]);

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – Derived Datasets`,
        group: "country-config",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Country Configuration", href: "/country" },
              { label: countryIso, href: `/country/${countryIso}` },
              { label: "Derived Datasets", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Derived Datasets</h2>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setEditDataset(null);
                setOpenWizard(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  ["title", "Title"],
                  ["description", "Description"],
                  ["admin_level", "Admin"],
                  ["created_at", "Created"],
                ].map(([field, label]) => (
                  <th
                    key={field}
                    className="px-3 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort(field as keyof DerivedMeta)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {sortField === field &&
                        (sortAsc ? (
                          <ChevronUp className="w-3 h-3 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        ))}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Fixed/Param</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center italic text-gray-500 py-3">
                    No derived datasets found.
                  </td>
                </tr>
              ) : (
                datasets.map((ds) => {
                  const selected = ds.id === selectedId;
                  return (
                    <tr
                      key={ds.id}
                      className={`border-b hover:bg-gray-50 ${selected ? "bg-rose-50/40" : ""}`}
                    >
                      <td className="px-3 py-2 text-[#640811] font-medium">
                        <button
                          className="hover:underline"
                          onClick={() => onSelect(ds)}
                          title="Preview data below"
                        >
                          {ds.title}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[360px]">
                        {ds.description || "—"}
                      </td>
                      <td className="px-3 py-2">{levelOf(ds)}</td>
                      <td className="px-3 py-2">{fmtDate(ds.created_at)}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]">
                          {dataTypeBadge(unifiedInfo && selected ? unifiedInfo : null)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                            ds.storage_model === "fixed"
                              ? "border border-green-300 text-green-700"
                              : "border border-amber-300 text-amber-700"
                          }`}
                          title={
                            ds.storage_model === "fixed"
                              ? `${ds.record_count ?? 0} rows materialized`
                              : "Computed on the fly"
                          }
                        >
                          {fixedBadge(ds)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2 justify-end">
                          {/* Preview */}
                          <button
                            title="Preview"
                            onClick={() => onSelect(ds)}
                            className="text-gray-700 hover:text-[#640811]"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Edit (opens wizard) */}
                          <button
                            title="Edit definition"
                            onClick={() => {
                              setEditDataset({
                                ...ds,
                                method: (ds.method as Method) || "multiply",
                                description: ds.description ?? null,
                                admin_level: ds.admin_level ?? levelOf(ds),
                                target_level: ds.target_level ?? levelOf(ds),
                              });
                              setOpenWizard(true);
                            }}
                            className="text-gray-700 hover:text-[#640811]"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {/* Materialize / Dematerialize */}
                          {ds.storage_model === "fixed" ? (
                            <button
                              title="Dematerialize"
                              onClick={() => handleDematerialize(ds)}
                              className="text-gray-700 hover:text-[#640811]"
                              disabled={busyActionId === ds.id}
                            >
                              {busyActionId === ds.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <DatabaseOff className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <button
                              title="Materialize"
                              onClick={() => handleMaterialize(ds)}
                              className="text-gray-700 hover:text-[#640811]"
                              disabled={busyActionId === ds.id}
                            >
                              {busyActionId === ds.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Database className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            title="Delete"
                            onClick={() => handleDelete(ds.id, ds.title)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Inline Preview Panel */}
        {selectedId && (
          <div className="bg-white border rounded-md shadow">
            <div className="px-4 py-3 border-b flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#640811]">
                    {selectedMeta?.title || "Dataset"}
                  </h3>
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]">
                    {dataTypeBadge(unifiedInfo)}
                  </span>
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]">
                    {fixedBadge(selectedMeta)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {selectedMeta?.description || "—"}
                </p>
              </div>

              {/* Health summary */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-gray-500" />
                  <span>
                    Admin level:{" "}
                    <strong>{levelOf(selectedMeta)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-gray-500" />
                  <span>
                    Rows: <strong>{valueCount ?? "—"}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-gray-500" />
                  <span>
                    Coverage:{" "}
                    <strong>
                      {healthPct !== null && targetCount !== null
                        ? `${healthPct}% (${valueCount}/${targetCount})`
                        : "—"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Data table */}
            <div className="p-4">
              <div className="max-h-[420px] overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left">Admin Pcode</th>
                      <th className="px-2 py-1 text-left">Value</th>
                      <th className="px-2 py-1 text-left">Category</th>
                      <th className="px-2 py-1 text-left">Label</th>
                      <th className="px-2 py-1 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingPreview ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-500">
                          <Loader2 className="inline w-4 h-4 animate-spin mr-2" />
                          Loading preview…
                        </td>
                      </tr>
                    ) : preview.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-500 italic">
                          No data found for this dataset.
                        </td>
                      </tr>
                    ) : (
                      preview.map((r, i) => (
                        <tr key={i} className="border-t hover:bg-gray-50">
                          <td className="px-2 py-1">{r.admin_pcode}</td>
                          <td className="px-2 py-1">
                            {r.value === null ? "—" : String(r.value)}
                          </td>
                          <td className="px-2 py-1">{r.category_code ?? "—"}</td>
                          <td className="px-2 py-1">{r.category_label ?? "—"}</td>
                          <td className="px-2 py-1">{r.dataset_type}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Preview shows up to 300 rows via <code>get_dataset_values(uuid)</code>. Use “Materialize” for a persisted snapshot and faster filtering/export.
              </p>
            </div>
          </div>
        )}

        {/* Wizard */}
        {openWizard && (
          <DerivedDatasetWizard
            open={openWizard}
            onClose={async () => {
              setOpenWizard(false);
              await loadDatasets();
              if (selectedId) {
                await loadUnifiedInfo(selectedId);
                await loadPreview(selectedId);
                await loadHealth(selectedId);
              }
            }}
            countryIso={countryIso}
            editDataset={editDataset}
          />
        )}
      </div>
    </SidebarLayout>
  );
}
