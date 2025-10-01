"use client";

import { useEffect, useState } from "react";
import Papa, { ParseResult } from "papaparse";
import { X } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface UploadGISModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void | Promise<void>;
}

type CSVRow = {
  layer_name: string;
  feature_count?: string | number;
  crs?: string;
};

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [geojsonText, setGeojsonText] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setGeojsonText("");
      setBusy(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleUploadCSV = async () => {
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }
    setBusy(true);
    setError(null);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: ParseResult<CSVRow>) => {
        try {
          const cleaned =
            (results.data || []).map((r) => ({
              country_iso: countryIso,
              layer_name: String(r.layer_name || "").trim(),
              format: "csv",
              feature_count:
                r.feature_count !== undefined &&
                r.feature_count !== null &&
                String(r.feature_count).trim() !== ""
                  ? Number(r.feature_count)
                  : null,
              crs: r.crs ? String(r.crs) : null,
              // geometry would be loaded via GeoJSON flow; CSV is metadata-only here
            })) || [];

          const { error: upErr } = await supabase.from("gis_layers").insert(cleaned);
          if (upErr) throw upErr;

          await onUploaded();
          onClose();
        } catch (e: any) {
          setError(e.message || "Failed to process CSV.");
        } finally {
          setBusy(false);
        }
      },
      error: (err) => {
        setBusy(false);
        setError(err.message);
      },
    });
  };

  const handleUploadGeoJSON = async () => {
    if (!geojsonText.trim()) {
      setError("Please paste valid GeoJSON.");
      return;
    }
    setBusy(true);
    setError(null);

    try {
      const parsed = JSON.parse(geojsonText);
      // Minimal validation
      if (!parsed || parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
        throw new Error("GeoJSON must be a FeatureCollection.");
      }

      const layerName = parsed.name || "geojson_layer";
      const featureCount = parsed.features?.length || 0;
      const crs =
        parsed.crs?.properties?.name ||
        parsed.crs?.name ||
        null;

      const payload = {
        country_iso: countryIso,
        layer_name: String(layerName),
        format: "geojson",
        feature_count: featureCount,
        crs,
        // You may store full geometry as jsonb in a separate column later (e.g., geometry_geojson)
      };

      const { error: upErr } = await supabase.from("gis_layers").insert([payload]);
      if (upErr) throw upErr;

      await onUploaded();
      onClose();
    } catch (e: any) {
      setError(e.message || "Invalid GeoJSON.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4">Upload GIS</h2>
        <p className="text-sm text-gray-600 mb-4">
          Currently supports <strong>CSV</strong> (layer metadata) and <strong>GeoJSON</strong> (direct paste).
          Support for Shapefile / GPKG / KML can be added later.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CSV */}
          <div>
            <h3 className="font-medium mb-2">CSV (layer metadata)</h3>
            <p className="text-xs text-gray-600 mb-2">
              Expected columns: <code>layer_name</code>, optional: <code>feature_count</code>, <code>crs</code>.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm mb-3"
            />
            <button
              onClick={handleUploadCSV}
              disabled={busy}
              className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Uploading…" : "Upload CSV"}
            </button>
          </div>

          {/* GeoJSON */}
          <div>
            <h3 className="font-medium mb-2">GeoJSON (paste)</h3>
            <textarea
              className="w-full h-40 border rounded p-2 text-sm"
              placeholder='{"type":"FeatureCollection","features":[...]}'
              value={geojsonText}
              onChange={(e) => setGeojsonText(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleUploadGeoJSON}
                disabled={busy}
                className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Uploading…" : "Upload GeoJSON"}
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
      </div>
    </div>
  );
}
