"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import type { FeatureCollection, Geometry } from "geojson";

// Dynamic import for Leaflet components (client-only)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

type CountryInstanceParams = { id: string; instance_id: string };

type InstanceLayer = {
  id: string;
  instance_id: string;
  category: string | null;
  subcategory: string | null;
  result_table: string | null;
  dataset_id: string | null;
};

type DatasetOption = {
  id: string;
  label: string;
  result_table: string;
  category: string;
  subcategory: string;
  admin_level: string | null;
};

export default function SSCDashboardPage({ params }: { params: CountryInstanceParams }) {
  const countryIso = params.id;
  const instanceId = params.instance_id;

  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [geojson, setGeojson] = useState<FeatureCollection<Geometry> | null>(null);
  const [loading, setLoading] = useState(false);

  // ────────────────────────────────
  // Fetch available datasets for this instance
  // ────────────────────────────────
  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("instance_layers")
      .select("id,instance_id,category,subcategory,result_table,dataset_id")
      .eq("instance_id", instanceId);

    if (error) {
      console.error("⚠️ Failed to load instance_layers:", error);
      return;
    }

    if (!data?.length) {
      console.warn("⚠️ No datasets found for instance", instanceId);
      setDatasets([]);
      return;
    }

    const options = data
      .filter(d => d.result_table)
      .map(d => {
        const level =
          d.result_table?.toLowerCase().includes("adm4")
            ? "ADM4"
            : d.result_table?.toLowerCase().includes("adm3")
            ? "ADM3"
            : d.result_table?.toLowerCase().includes("adm2")
            ? "ADM2"
            : d.result_table?.toLowerCase().includes("adm1")
            ? "ADM1"
            : null;

        const label = `${(d.category || "").toUpperCase()} — ${d.subcategory || ""}`.trim();
        return {
          id: d.id,
          label: label || d.result_table!,
          result_table: d.result_table!,
          category: d.category || "OTHER",
          subcategory: d.subcategory || "",
          admin_level: level,
        };
      });

    console.log("✅ Loaded datasets:", options);
    setDatasets(options);
  };

  // ────────────────────────────────
  // Fetch GeoJSON for selected dataset
  // ────────────────────────────────
  const loadGeoJSON = async (result_table: string, admin_level: string | null) => {
    if (!result_table) return;
    setLoading(true);
    setGeojson(null);

    try {
      const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
        p_iso: countryIso,
        p_result_table: result_table,
        p_admin_level: admin_level,
        p_limit: 100000,
      });

      if (error) throw error;
      if (data && data.type === "FeatureCollection") {
        setGeojson(data);
        console.log("✅ Loaded GeoJSON:", data.features?.length || 0, "features");
      } else {
        alert("⚠️ No valid GeoJSON returned — check dataset geometry linkage.");
      }
    } catch (e: any) {
      console.error("❌ GeoJSON load failed:", e.message);
      alert("Failed to load map data.");
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────
  // Derive grouped options (P1/P3/etc.)
  // ────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, DatasetOption[]> = {};
    for (const d of datasets) {
      const g = d.category || "OTHER";
      if (!groups[g]) groups[g] = [];
      groups[g].push(d);
    }
    return groups;
  }, [datasets]);

  useEffect(() => {
    loadDatasets();
  }, []);

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} — SSC Map Dashboard`,
        group: "country-config",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Country", href: `/country/${countryIso}` },
              { label: "Instance", href: `/country/${countryIso}/instances/${instanceId}` },
              { label: "Map Dashboard", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-6 space-y-4">
        {/* Dataset selector */}
        <div>
          <label className="text-sm font-semibold text-gray-700">Select Dataset</label>
          <select
            value={selected}
            onChange={(e) => {
              const val = e.target.value;
              setSelected(val);
              const layer = datasets.find(d => d.result_table === val);
              if (layer) loadGeoJSON(layer.result_table, layer.admin_level);
            }}
            className="block w-full border rounded px-3 py-2 mt-1"
          >
            <option value="">Select dataset...</option>
            {Object.entries(grouped).map(([cat, arr]) => (
              <optgroup key={cat} label={cat.toUpperCase()}>
                {arr.map(d => (
                  <option key={d.result_table} value={d.result_table}>
                    {d.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Map display */}
        <div className="h-[600px] w-full border rounded overflow-hidden relative">
          <MapContainer
            center={[12.8797, 121.774]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geojson && (
              <GeoJSON
                key={selected}
                data={geojson as any}
                style={(feature: any) => {
                  const s = Number(feature?.properties?.score ?? 0);
                  const colors = ["#00A000", "#8DC63F", "#FFD700", "#FF8C00", "#CC0000"];
                  const color = s >= 1 && s <= 5 ? colors[s - 1] : "#AAAAAA";
                  return { color: "#000", weight: 0.5, fillColor: color, fillOpacity: 0.7 };
                }}
                onEachFeature={(feature, layer) => {
                  const p = feature.properties;
                  layer.bindTooltip(
                    `${p.admin_name || p.admin_pcode}<br/>Score: ${p.score ?? "—"}<br/>Raw: ${p.raw_value ?? "—"}`,
                    { sticky: true }
                  );
                }}
              />
            )}
          </MapContainer>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-gray-600 text-sm">
              Loading map…
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Eye, Settings2, RefreshCw, Trash2, Play } from "lucide-react";

import InterpretationModal from "@/components/SSC/InterpretationModal";
import DataPreviewModal from "@/components/SSC/DataPreviewModal";

type DatasetRow = {
  metric: string;
  source_note: string;
  pillar: "ssc_p1" | "ssc_p2" | "ssc_p3" | "ssc_hazard" | "ssc_vuln";
  data_type: "gradient" | "categorical";
  norm_method: string | null;
  norm_params: any | null;
  higher_is_better: boolean | null;
  admin_level?: string | null;
};

export default function SSCDashboard({
  params,
}: {
  params: { id: string; instance_id: string };
}) {
  const { id: countryId, instance_id } = params;

  const headerProps = useMemo(
    () => ({
      title: "SSC Analytical Framework",
      group: "country-config" as const,
      description:
        "Define datasets, interpret (normalize) them, preview results, and apply to this SSC instance.",
      breadcrumbs: (
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Country", href: `/country/${countryId}` },
            { label: "Instances", href: `/country/${countryId}/instances` },
            { label: "Framework" },
          ]}
        />
      ),
    }),
    [countryId]
  );

  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [showInterpret, setShowInterpret] = useState<DatasetRow | null>(null);
  const [showPreview, setShowPreview] = useState<DatasetRow | null>(null);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ssc_dataset_catalog")
        .select(
          "metric, source_note, pillar, data_type, norm_method, norm_params, higher_is_better, admin_level"
        )
        .order("pillar", { ascending: true })
        .order("metric", { ascending: true })
        .order("source_note", { ascending: true });

      if (error) throw error;
      setDatasets((data || []) as DatasetRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  // Unified fetcher for all previews/maps
  const fetchLayerGeoJSON = async (dataset: DatasetRow) => {
    const table = (dataset.source_note ?? "").replace(/^public\./, "");
    const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
      p_admin_level: dataset.admin_level ?? null,
      p_iso: countryId.toUpperCase(),
      p_schema: "public",
      p_result_table: table,
      p_limit: 100000,
    });
    if (error) throw error;
    return data;
  };

  const applyToInstance = async (dataset: DatasetRow) => {
    const method = (dataset.norm_method || "").toLowerCase();

    if (method.includes("threshold_bands")) {
      const { error } = await supabase.rpc(
        "apply_threshold_bands_for_dataset_instance",
        {
          p_instance_id: instance_id,
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
        }
      );
      if (error) throw error;
    } else if (
      method === "winsor_5_95" ||
      method === "linear_1to4_to_1to5" ||
      method === "linear_1to4_to_1to5_invert" ||
      method === "winsor_5_95_invert"
    ) {
      const { error } = await supabase.rpc(
        "apply_normalization_for_dataset_instance",
        {
          p_instance_id: instance_id,
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
        }
      );
      if (error) throw error;
    } else {
      const { error } = await supabase.rpc(
        "apply_threshold_classification_for_dataset_instance",
        {
          p_instance_id: instance_id,
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
        }
      );
      if (error) throw error;
    }

    await loadDatasets();
    alert("Applied to instance.");
  };

  const removeDataset = async (dataset: DatasetRow) => {
    if (
      !confirm(`Remove "${dataset.metric}" / "${dataset.source_note}" from catalog?`)
    )
      return;
    const { error } = await supabase
      .from("ssc_dataset_catalog")
      .delete()
      .eq("metric", dataset.metric)
      .eq("source_note", dataset.source_note);

    if (error) {
      alert(error.message);
      return;
    }
    await loadDatasets();
  };

  const grouped = {
    framework: {
      label: "SSC Framework",
      subsections: [
        { key: "ssc_p1", label: "P1 – The Shelter" },
        { key: "ssc_p2", label: "P2 – Living Conditions" },
        { key: "ssc_p3", label: "P3 – The Settlement" },
      ] as const,
    },
    hazard: { key: "ssc_hazard" as const, label: "Hazards / Risks" },
    vuln: { key: "ssc_vuln" as const, label: "Underlying Vulnerabilities" },
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="max-w-7xl mx-auto text-sm space-y-6">
        {/* SSC Framework */}
        <section className="border rounded-lg bg-white shadow-sm">
          <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
            <h2 className="font-semibold">{grouped.framework.label}</h2>
            <button
              onClick={loadDatasets}
              className="text-white hover:opacity-90 flex items-center gap-2"
              title="Reload datasets"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </header>

          {grouped.framework.subsections.map((sub) => (
            <div key={sub.key} className="border-t">
              <h3 className="px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                {sub.label}
              </h3>
              <DatasetTable
                loading={loading}
                datasets={datasets.filter((d) => d.pillar === sub.key)}
                onView={setShowPreview}
                onInterpret={setShowInterpret}
                onApply={applyToInstance}
                onRemove={removeDataset}
              />
            </div>
          ))}
        </section>

        {/* Hazards */}
        <section className="border rounded-lg bg-white shadow-sm">
          <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
            <h2 className="font-semibold">{grouped.hazard.label}</h2>
          </header>
          <DatasetTable
            loading={loading}
            datasets={datasets.filter((d) => d.pillar === grouped.hazard.key)}
            onView={setShowPreview}
            onInterpret={setShowInterpret}
            onApply={applyToInstance}
            onRemove={removeDataset}
          />
        </section>

        {/* Vulnerabilities */}
        <section className="border rounded-lg bg-white shadow-sm">
          <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
            <h2 className="font-semibold">{grouped.vuln.label}</h2>
          </header>
          <DatasetTable
            loading={loading}
            datasets={datasets.filter((d) => d.pillar === grouped.vuln.key)}
            onView={setShowPreview}
            onInterpret={setShowInterpret}
            onApply={applyToInstance}
            onRemove={removeDataset}
          />
        </section>
      </div>

      {/* Modals */}
      {showInterpret && (
        <InterpretationModal
          open={!!showInterpret}
          dataset={showInterpret}
          instanceId={instance_id}
          onClose={() => setShowInterpret(null)}
          onUpdated={loadDatasets}
        />
      )}

      {showPreview && (
        <DataPreviewModal
          open={!!showPreview}
          dataset={showPreview}
          instanceId={instance_id}
          onClose={() => setShowPreview(null)}
        />
      )}
    </SidebarLayout>
  );
}

function DatasetTable({
  loading,
  datasets,
  onInterpret,
  onView,
  onApply,
  onRemove,
}: {
  loading: boolean;
  datasets: DatasetRow[];
  onInterpret: (d: DatasetRow) => void;
  onView: (d: DatasetRow) => void;
  onApply: (d: DatasetRow) => void;
  onRemove: (d: DatasetRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[13px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Metric</th>
            <th className="p-2 text-left">Source</th>
            <th className="p-2 text-left">Admin Level</th>
            <th className="p-2 text-left">Method</th>
            <th className="p-2 text-left">Params</th>
            <th className="p-2 text-right w-64">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="text-center text-gray-400 py-3">
                Loading…
              </td>
            </tr>
          ) : datasets.length ? (
            datasets.map((d) => (
              <tr
                key={`${d.metric}::${d.source_note}`}
                className="border-t hover:bg-gray-50"
              >
                <td className="p-2 font-medium text-gray-700">{d.metric}</td>
                <td className="p-2 text-gray-600">{d.source_note}</td>
                <td className="p-2 text-gray-600">{d.admin_level || "—"}</td>
                <td className="p-2 text-gray-600">{d.norm_method || "—"}</td>
                <td className="p-2 text-gray-500 truncate max-w-[220px]">
                  {d.norm_params ? JSON.stringify(d.norm_params) : "—"}
                </td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => onView(d)}
                    className="text-xs text-gray-700 font-medium hover:underline mr-3"
                  >
                    <Eye className="inline h-3 w-3 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => onInterpret(d)}
                    className="text-xs text-[color:var(--gsc-green)] font-medium hover:underline mr-3"
                  >
                    <Settings2 className="inline h-3 w-3 mr-1" />
                    Interpret
                  </button>
                  <button
                    onClick={() => onApply(d)}
                    className="text-xs text-blue-600 font-medium hover:underline mr-3"
                  >
                    <Play className="inline h-3 w-3 mr-1" />
                    Apply
                  </button>
                  <button
                    onClick={() => onRemove(d)}
                    className="text-xs text-red-600 font-medium hover:underline"
                  >
                    <Trash2 className="inline h-3 w-3 mr-1" />
                    Remove
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center text-gray-400 py-3">
                No datasets
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
