"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { FeatureCollection, Geometry } from "geojson";
import type { CountryInstanceParams } from "@/app/country/types";

// Leaflet (client only)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer     = dynamic(() => import("react-leaflet").then(m => m.TileLayer),     { ssr: false });
const GeoJSON       = dynamic(() => import("react-leaflet").then(m => m.GeoJSON),       { ssr: false });

type MapDataset = {
  key: string;                       // unique key for select
  label: string;                     // human label
  result_table: string;              // table/view to fetch
  admin_level: "ADM3" | "ADM4";      // which backbone to join to
  hasScore: boolean;                 // whether 'score' exists
};

// ---------------------------------------------------------------
// helpers
// ---------------------------------------------------------------
const greenToRed = (s: number) => {
  // s in [1..5] → green→red
  const t = Math.min(1, Math.max(0, (s - 1) / 4));
  const r = Math.round(255 * t);
  const g = Math.round(170 * (1 - t) + 50 * (1 - t)); // keep a bit darker
  return `rgb(${r},${g},80)`;
};

const SAFE_GRADES = [1, 2, 3, 4, 5];

function safeArray<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : [];
}

// ---------------------------------------------------------------

export default function InstanceDashboard({ params }: { params: CountryInstanceParams }) {
  const countryIso = params.id;
  const instanceId = params.instance_id;

  const [datasets, setDatasets] = useState<MapDataset[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [fc, setFc] = useState<FeatureCollection<Geometry> | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // build list once
  useEffect(() => {
    // Keep human, readable names
    const ds: MapDataset[] = [
      {
        key: "p1_weighted",
        label: "P1 — Weighted Building Typologies",
        result_table: "derived_building_typology_ssc_adm3",
        admin_level: "ADM3",
        hasScore: true,
      },
      {
        key: "p1_20pct",
        label: "P1 — Building Typologies (20% Rule)",
        result_table: "derived_building_typology_20pct_adm3",
        admin_level: "ADM3",
        hasScore: true,
      },
      {
        key: "p3_density",
        label: "P3 — Population density (ADM4)",
        // this must exist as a materialized view or table with columns:
        // admin_pcode, admin_name, raw_value, score
        result_table: "derived_population_density_adm4",
        admin_level: "ADM4",
        hasScore: true, // we map 'score' if present; raw_value is used for tooltip
      },
      {
        key: "vuln_poverty",
        label: "Vulnerability — derived_poverty_vulnerability_adm3",
        result_table: "derived_poverty_vulnerability_adm3",
        admin_level: "ADM3",
        hasScore: true,
      },
    ];
    setDatasets(ds);
    setSelectedKey(ds[0]?.key ?? null);
  }, []);

  const selected = useMemo(
    () => datasets.find(d => d.key === selectedKey) || null,
    [datasets, selectedKey]
  );

  // fetch features
  const fetchGeo = async (rt: string, adm: "ADM3" | "ADM4") => {
    setLoading(true);
    setMsg(null);
    try {
      // server-side function must join to admin_features_* and return a valid GeoJSON FC
      const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
        p_country_iso: countryIso,
        p_result_table: rt,
        p_admin_level: adm,
        p_limit: 100000,
      });

      if (error) throw error;
      if (!data) {
        setFc(null);
        setMsg("No data returned for this dataset.");
        return;
      }

      // Safety checks
      const fc: FeatureCollection<Geometry> = typeof data === "string" ? JSON.parse(data) : data;
      const feats = safeArray(fc.features);
      if (feats.length === 0) {
        setFc(null);
        setMsg("No features or invalid geometry for this dataset.");
        return;
      }
      // make sure properties exist to avoid style crashes
      feats.forEach(f => {
        (f.properties as any) ||= {};
        const p = f.properties as any;
        // normalize props we use in styles / tooltips
        if (p.score == null && p.SCORE != null) p.score = Number(p.SCORE);
        if (p.raw_value == null && p.value != null) p.raw_value = Number(p.value);
      });

      setFc({ type: "FeatureCollection", features: feats });
    } catch (e: any) {
      console.error("Geo load failed:", e);
      setFc(null);
      setMsg("Failed to load map data. Please check if the dataset has valid geometry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selected) return;
    fetchGeo(selected.result_table, selected.admin_level);
  }, [selected?.key]); // eslint-disable-line

  // legend + style (always safe)
  const styleFn = (f: any) => {
    const s = Number(f?.properties?.score ?? 0);
    const color = SAFE_GRADES.includes(s) ? greenToRed(s) : "#cccccc";
    return {
      color: "#334155",
      weight: 0.8,
      fillColor: color,
      fillOpacity: 0.85,
    };
  };

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – SSC Dashboard`,
        group: "country-config",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Country", href: "/country" },
              { label: countryIso, href: `/country/${countryIso}` },
              { label: "Instance", href: `/country/${countryIso}/instances/${instanceId}` },
              { label: "Dashboard", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Select dataset</label>
            <select
              value={selectedKey ?? ""}
              onChange={(e) => setSelectedKey(e.currentTarget.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <optgroup label="P1">
                <option value="p1_weighted">P1 — Weighted Building Typologies</option>
                <option value="p1_20pct">P1 — Building Typologies (20% Rule)</option>
              </optgroup>
              <optgroup label="P3">
                <option value="p3_density">P3 — Population density (ADM4)</option>
              </optgroup>
              <optgroup label="Vulnerability">
                <option value="vuln_poverty">Vulnerability — derived_poverty_vulnerability_adm3</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div className="h-[640px] w-full border rounded relative overflow-hidden">
          <MapContainer center={[12.8797, 121.774]} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!!fc && safeArray(fc.features).length > 0 && (
              <GeoJSON key={selectedKey ?? "k"} data={fc as any} style={styleFn} />
            )}
          </MapContainer>

          {/* Overlay messages */}
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-sm">Loading…</div>
          )}
          {!loading && msg && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-sm px-4 text-center">
              {msg}
            </div>
          )}
        </div>

        {/* Simple legend 1..5 green→red */}
        <div className="flex items-center gap-2 text-xs">
          {SAFE_GRADES.map(g => (
            <div key={g} className="flex items-center gap-1">
              <div className="w-5 h-3 rounded" style={{ background: greenToRed(g) }} />
              <span>{g}</span>
            </div>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}
