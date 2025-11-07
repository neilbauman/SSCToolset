"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type DatasetMeta = {
  metric: string;
  source_note: string;
  admin_level?: string | null;
  norm_method?: string | null;
  norm_params?: any;
};

type Props = {
  open: boolean;
  dataset: DatasetMeta | null; // comes from the table row you clicked
  instanceId: string;
  onClose: () => void;
};

type Row = {
  admin_pcode: string;
  admin_name: string | null;
  raw_value: number | null; // IMPORTANT: this is what we’ll show
  score: number | null;
};

export default function DataPreviewModal({ open, dataset, instanceId, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<number>(200);
  const [total, setTotal] = useState<number | null>(null);

  const title = useMemo(() => {
    if (!dataset) return "Data Preview";
    const lvl = dataset.admin_level ? ` (${dataset.admin_level})` : "";
    return `Preview: ${dataset.metric} — ${dataset.source_note}${lvl}`;
  }, [dataset]);

  useEffect(() => {
    if (!open || !dataset) return;

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);

      // Many of our older builds used this exact signature.
      // If your RPC name differs, just adjust here — everything else will still work.
      const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
  p_admin_level: ds.admin_level ?? null,    // e.g. 'ADM2' for rainfall; 'ADM3' for others
  p_iso: countryIso,                        // 'PHL'
  p_schema: 'public',
  p_result_table: ds.source_note || result_table, // whichever field you use to store the table name
  p_limit: 100000
});

      if (error) {
        setError(error.message);
        setRows([]);
        setTotal(0);
      } else {
        // Expecting data like: [{ admin_pcode, admin_name, raw_value, score }, ...]
        setRows((data?.rows as Row[]) ?? data ?? []);
        // Support either shape: { rows, total } or just array
        setTotal(typeof data?.total === "number" ? data.total : (data?.length ?? 0));
      }

      setLoading(false);
    };

    fetchPreview();
  }, [open, dataset, instanceId, limit]);

  if (!open || !dataset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[min(1200px,95vw)] max-h-[85vh] overflow-hidden rounded-lg bg-white shadow-xl">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-[15px]">{title}</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {total !== null ? `Total rows: ${total.toLocaleString()}` : null}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-500">Rows to show:</label>
              <select
                className="border rounded px-2 py-1"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
            <button
              className="rounded px-3 py-1 text-sm border hover:bg-gray-50"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>

        {/* method summary (nice to keep) */}
        <div className="px-4 py-2 text-[12px] text-gray-600 border-b flex items-center gap-2 overflow-x-auto">
          {dataset.norm_method ? (
            <>
              <span className="font-medium">Method:</span>
              <span>{dataset.norm_method.replaceAll("_", " ")}</span>
            </>
          ) : null}
          {typeof dataset?.norm_params !== "undefined" ? (
            <>
              <span className="font-medium ml-4">Params:</span>
              <span className="truncate max-w-[65%]">
                {typeof dataset.norm_params === "string"
                  ? dataset.norm_params
                  : JSON.stringify(dataset.norm_params)}
              </span>
            </>
          ) : null}
        </div>

        <div className="p-0 overflow-auto" style={{ maxHeight: "65vh" }}>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-[1]">
              <tr>
                <Th>Admin (name)</Th>
                <Th>Admin Pcode</Th>
                <Th>Raw value</Th>
                <Th>Score</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    No rows
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.admin_pcode + ":" + i} className="border-b hover:bg-gray-50">
                    <Td>{r.admin_name ?? "—"}</Td>
                    <Td mono>{r.admin_pcode}</Td>

                    {/* 👇 THIS is the important part: use r.raw_value */}
                    <Td mono>
                      {r.raw_value !== null && r.raw_value !== undefined
                        ? Number(r.raw_value).toLocaleString()
                        : "—"}
                    </Td>

                    <Td mono>
                      {r.score !== null && r.score !== undefined
                        ? Number(r.score).toFixed(2)
                        : "—"}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-gray-600 font-medium px-3 py-2 border-b">
      {children}
    </th>
  );
}
function Td({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2 ${mono ? "font-mono tabular-nums" : ""}`}>{children}</td>
  );
}
