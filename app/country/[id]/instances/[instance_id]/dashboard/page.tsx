"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import type { FeatureCollection, Geometry } from "geojson";

// NOTE: our routing params type—works with /country/[id]/instances/[instance_id]
type PageParams = { id: string; instance_id: string };

// Leaflet client-only
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer     = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON       = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

type LayerRow = {
  id: string;
  instance_id: string;
  category: string | null;
  subcategory: string | null;
  result_table: string | null;
  dataset_id: string | null;
  admin_level?: string | null;   // if present
};

type Opt = {
  id: string;
  category: string;
  subcategory: string;
  result_table: string;
  admin_level: "ADM4" | "ADM3" | "ADM2" | "ADM1" | "ADM0" | null;
  label: string;
};

export default function DashboardPage({ params }: { params: PageParams }) {
  const countryIso = params.id;
  const instanceId = params.instance_id;

  const [options, setOptions] = useState<Opt[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [gj, setGj] = useState<FeatureCollection<Geometry> | null>(null);
  const [loading, setLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 1) Fetch dataset list safely (NO joins; avoid PGRST200)
  // ─────────────────────────────────────────────────────────────
  async function loadDatasets() {
    // Step A: get rows from instance_layers (this is the table you have)
    const { data: rows, error } = await supabase
      .from("instance_layers")
      .select("id,instance_id,category,subcategory,result_table,dataset_id,admin_level")
      .eq("instance_id", instanceId);

    if (error) {
      console.error("Failed to read instance_layers:", error);
      setOptions([]);
      return;
    }
    const base: LayerRow[] = (rows || []) as any[];

    if (!base.length) {
      setOptions([]);
      return;
    }

    // Optional Step B: try to fetch titles for nicer labels (no FK needed)
    const datasetIds = Array.from(
      new Set(
        base
          .map(r => r.dataset_id)
          .filter((x): x is string => typeof x === "string" && x.length > 0)
      )
    );

    let titleMap = new Map<string, { title?: string | null; source_note?: string | null }>();
    if (datasetIds.length) {
      const { data: cat, error: catErr } = await supabase
        .from("ssc_dataset_catalog")
        .select("id,title,source_note")
        .in("id", datasetIds);

      if (!catErr && cat?.length) {
        for (const c of cat) titleMap.set(c.id, { title: c.title, source_note: c.source_note });
      } else {
        console.warn("No catalog titles (that’s OK):", catErr);
      }
    }

    // Build UI options
    const opts: Opt[] = base
      .filter(r => r.result_table)
      .map(r => {
        const adminGuess =
          r.admin_level ??
          (r.result_table?.toLowerCase().includes("adm4")
            ? "ADM4"
            : r.result_table?.toLowerCase().includes("adm3")
            ? "ADM3"
            : r.result_table?.toLowerCase().includes("adm2")
            ? "ADM2"
            : r.result_table?.toLowerCase().includes("adm1")
            ? "ADM1"
            : r.result_table?.toLowerCase().includes("adm0")
            ? "ADM0"
            : null);

        const cat = (r.category || "").toUpperCase();
        const sub = r.subcategory || "";
        const t   = r.dataset_id ? titleMap.get(r.dataset_id) : undefined;

        const nice =
          t?.title
            ? `${t.title}${sub ? ` — ${sub}` : ""}`
            : `${cat || "Dataset"}${sub ? ` — ${sub}` : ""}`;

        return {
          id: r.id,
          category: cat || "OTHER",
          subcategory: sub,
          result_table: r.result_table!,
          admin_level: adminGuess as Opt["admin_level"],
          label: nice,
        };
      })
      // stable group order
      .sort((a, b) => (a.category + a.label).localeCompare(b.category + b.label));

    setOptions(opts);
  }

  // ─────────────────────────────────────────────────────────────
  // 2) Fetch GeoJSON via the installed RPC
  //    get_geojson_for_result_table(p_iso, p_result_table, p_admin_level, p_limit)
  // ─────────────────────────────────────────────────────────────
  async function fetchGeo(result_table: string, admin_level: Opt["admin_level"]) {
    setLoading(true);
    setGj(null);
    try {
      const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
        p_iso: countryIso,
        p_result_table: result_table,
        p_admin_level: admin_level, // can be null
        p_limit: 100000,            // generous
      });
      if (error) throw error;

      if (data && typeof data === "object" && data.type === "FeatureCollection") {
        setGj(data as FeatureCollection<Geometry>);
      } else {
        console.warn("RPC returned non-GeoJSON:", data);
        alert("No GeoJSON returned. Check that the result table has admin_pcode values that match gis_features.");
      }
    } catch (e: any) {
      console.error("Geo load failed:", e);
      alert(e?.message || "Failed to load map data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDatasets(); }, [instanceId]);

  const groups = useMemo(() => {
    const byCat = new Map<string, Opt[]>();
    for (const o of options) {
      const k = o.category || "OTHER";
      if (!byCat.has(k)) byCat.set(k, []);
      byCat.get(k)!.push(o);
    }
    return byCat;
  }, [options]);

  const selectedOpt = useMemo(() => options.find(o => o.result_table === selected), [options, selected]);

  // ─────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────
  return (
    <SidebarLayout
      headerProps={{
        title: "SSC Map Visualization",
        group: "country-config",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Country", href: `/country/${countryIso}` },
              { label: "Instance", href: `/country/${countryIso}/instances/${instanceId}` },
              { label: "Dashboard", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="block text-xs text-gray-600 mb-1">Select Dataset</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={selected}
              onChange={(e) => {
                const val = e.currentTarget.value;
                setSelected(val);
                const chosen = options.find(o => o.result_table === val);
                if (chosen) fetchGeo(chosen.result_table, chosen.admin_level);
              }}
            >
              <option value="">Select Dataset...</option>
              {Array.from(groups.entries()).map(([cat, rows]) => (
                <optgroup key={cat} label={cat.replaceAll("_", " ")}>
                  {rows.map(r => (
                    <option key={r.result_table} value={r.result_table}>
                      {r.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div className="h-[620px] w-full rounded-md overflow-hidden border relative">
          <MapContainer center={[12.8797, 121.774]} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {gj && <GeoJSON data={gj as any} style={(feat: any) => {
              // color ramp 1→5 = green→red; default gray
              const s = Number(feat?.properties?.score ?? 0);
              const pal = ["#2ECC71", "#A3E635", "#FACC15", "#FB923C", "#EF4444"]; // 1..5
              const color = s >= 1 && s <= 5 ? pal[s - 1] : "#9CA3AF";
              return { color, weight: 1, fillColor: color, fillOpacity: 0.6 };
            }} />}
          </MapContainer>

          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-sm">
              Loading map…
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
