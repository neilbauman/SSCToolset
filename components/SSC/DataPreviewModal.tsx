"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

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

export default function DataPreviewModal({
  open,
  dataset,
  instanceId,
  onClose,
}: {
  open: boolean;
  dataset: DatasetRow | null;
  instanceId: string;
  onClose: () => void;
}) {
  const params = useParams<{ id: string; instance_id: string }>();
  const countryIso = useMemo(() => (params?.id || "").toUpperCase(), [params?.id]);

  const [loading, setLoading] = useState(false);
  const [geojson, setGeojson] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !dataset) return;

    const fetchPreview = async () => {
      setLoading(true);
      setErrorMsg(null);
      setGeojson(null);

      try {
        // Strip optional "public." prefix if present
        const table = (dataset.source_note ?? "").replace(/^public\./, "");

        const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
          p_admin_level: dataset.admin_level ?? null, // e.g. ADM2 for rainfall
          p_iso: countryIso,                           // e.g. PHL
          p_schema: "public",
          p_result_table: table,
          p_limit: 5000,
        });

        if (error) throw error;
        setGeojson(data);
      } catch (err: any) {
        setErrorMsg(err?.message || "Failed to load preview.");
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [open, dataset, countryIso]);

  if (!open || !dataset) return null;

  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  const sampleProps =
    features.length > 0 ? Object.keys(features[0]?.properties || {}) : [];

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            Preview • {dataset.metric} — {dataset.source_note}
          </h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">✕</button>
        </header>

        <div className="p-4 space-y-3">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {errorMsg && (
            <p className="text-sm text-red-600">
              {errorMsg}
            </p>
          )}

          {!loading && !errorMsg && (
            <>
              <div className="text-sm text-gray-700">
                <div>Admin level: <span className="font-mono">{dataset.admin_level || "—"}</span></div>
                <div>Country: <span className="font-mono">{countryIso || "—"}</span></div>
                <div>Features: <span className="font-mono">{features.length}</span></div>
              </div>

              {features.length > 0 ? (
                <div className="border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">admin_pcode</th>
                        <th className="p-2 text-left">admin_name</th>
                        <th className="p-2 text-left">raw_value</th>
                        <th className="p-2 text-left">score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {features.slice(0, 12).map((f: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{f?.properties?.admin_pcode ?? "—"}</td>
                          <td className="p-2">{f?.properties?.admin_name ?? "—"}</td>
                          <td className="p-2">{f?.properties?.raw_value ?? "—"}</td>
                          <td className="p-2">{f?.properties?.score ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No features returned.</p>
              )}

              {sampleProps.length > 0 && (
                <p className="text-[11px] text-gray-500">
                  Properties: {sampleProps.join(", ")}
                </p>
              )}
            </>
          )}
        </div>

        <footer className="px-4 py-3 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
