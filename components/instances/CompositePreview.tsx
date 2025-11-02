// components/instances/CompositePreview.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Row = { admin_pcode: string; value: number };

interface Props {
  instanceId: string;
  category: string; // e.g., 'underlying_vulnerability', 'hazard', 'ssc_p1', etc.
}

export default function CompositePreview({ instanceId, category }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 100; // no 1000 hard-cap; simple paging

  const fetchComposite = async () => {
    setLoading(true);
    setErr(null);

    // Ask DB for the exact composite table name (you already created this)
    const { data: tbl, error: terr } = await supabase.rpc("get_composite_table_name", {
      p_instance_id: instanceId,
      p_category: category,
    });

    if (terr) {
      setErr(terr.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const tableName = tbl?.result_table_name as string | null;

    if (!tableName) {
      setRows([]);
      setLoading(false);
      return;
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(`derived.${tableName}`)
      .select("admin_pcode,value")
      .order("admin_pcode", { ascending: true })
      .range(from, to);

    if (error) setErr(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    setPage(0);
  }, [instanceId, category]);

  useEffect(() => {
    fetchComposite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, category, page]);

  const range = useMemo(() => {
    if (!rows.length) return null;
    const vals = rows.map((r) => Number(r.value)).filter((v) => !Number.isNaN(v));
    return {
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }, [rows]);

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="font-semibold">
          Composite preview — {category.replaceAll("_", " ")}
        </div>
        {range && (
          <div className="text-sm text-gray-600">
            Range: <span className="font-medium">{range.min.toFixed(2)} – {range.max.toFixed(2)}</span>
          </div>
        )}
      </div>

      {err && <div className="px-4 py-3 text-sm text-red-600">Error: {err}</div>}
      {!err && (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 w-56">Admin pcode</th>
                <th className="text-right px-4 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-gray-500" colSpan={2}>Loading…</td></tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr key={r.admin_pcode} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{r.admin_pcode}</td>
                    <td className="px-4 py-2 text-right">{Number(r.value).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr><td className="px-4 py-8 text-gray-500" colSpan={2}>No data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
        <div className="text-xs text-gray-600">Page {page + 1}</div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border px-2 py-1 text-sm disabled:opacity-50"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </button>
          <button
            className="rounded-md border px-2 py-1 text-sm"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
