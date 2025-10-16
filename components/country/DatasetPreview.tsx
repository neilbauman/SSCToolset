"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Database } from "lucide-react";

type DatasetMeta = {
  id: string;
  title: string;
  dataset_type: "adm0" | "gradient" | "categorical" | string | null;
  admin_level: string | null;
  unit: string | null;
  join_field: string | null;
};

type CatRow = { admin_pcode: string; admin_level: string | null; category_label: string; category_score: number | null };
type GradRow = { admin_pcode: string; admin_level: string | null; value: number | null; unit: string | null };

export default function DatasetPreview({ dataset }: { dataset: DatasetMeta }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [gradRows, setGradRows] = useState<GradRow[]>([]);
  const [catRows, setCatRows] = useState<CatRow[]>([]);
  const [catHeaders, setCatHeaders] = useState<string[]>([]);
  const [mapScores, setMapScores] = useState<Record<string, number | null>>({});

  const isCat = dataset.dataset_type === "categorical";
  const isAdm0 = dataset.dataset_type === "adm0";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        if (isCat) {
          const [vRes, mRes] = await Promise.all([
            supabase
              .from("dataset_values_cat")
              .select("admin_pcode,admin_level,category_label,category_score")
              .eq("dataset_id", dataset.id)
              .limit(100000),
            supabase.from("dataset_category_maps").select("label,score").eq("dataset_id", dataset.id).order("label"),
          ]);
          if (vRes.error) throw vRes.error;
          if (mRes.error) throw mRes.error;

          const v = (vRes.data || []) as CatRow[];
          const m = (mRes.data || []) as { label: string; score: number | null }[];
          setCatRows(v);
          setCatHeaders((m.length ? m.map((x) => x.label) : Array.from(new Set(v.map((r) => r.category_label))).sort((a, b) => a.localeCompare(b))));
          setMapScores(Object.fromEntries(m.map((x) => [x.label, x.score])));
        } else {
          const { data, error } = await supabase
            .from("dataset_values")
            .select("admin_pcode,admin_level,value,unit")
            .eq("dataset_id", dataset.id)
            .limit(100000);
          if (error) throw error;
          setGradRows((data || []) as GradRow[]);
        }
      } catch (e: any) {
        setErr(e.message || "Failed to load preview.");
      } finally {
        setLoading(false);
      }
    })();
  }, [dataset.id, isCat]);

  const catMatrix = useMemo(() => {
    if (!isCat) return [];
    const byAdmin = new Map<string, Record<string, number | string | null>>();
    for (const r of catRows) {
      if (!byAdmin.has(r.admin_pcode)) byAdmin.set(r.admin_pcode, {});
      const val = r.category_score ?? (mapScores[r.category_label] ?? null) ?? "✓";
      byAdmin.get(r.admin_pcode)![r.category_label] = val;
    }
    return Array.from(byAdmin.entries()).map(([pcode, obj]) => ({ admin_pcode: pcode, ...obj }));
  }, [catRows, mapScores, isCat]);

  if (loading)
    return (
      <div className="text-sm text-gray-600 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading preview…
      </div>
    );
  if (err)
    return (
      <div className="rounded-lg p-3 text-sm" style={{ color: "var(--gsc-red)", border: "1px solid var(--gsc-light-gray)", background: "white" }}>
        {err}
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--gsc-gray)]">
        <Database className="h-4 w-4" />
        <span className="font-semibold">{dataset.title}</span>
        <span className="text-xs opacity-70">({(dataset.dataset_type || "").toUpperCase()} • {dataset.admin_level})</span>
      </div>

      {/* Join field tag */}
      <div className="text-xs text-[var(--gsc-gray)]">
        Join Field:&nbsp;
        <span className="px-2 py-0.5 rounded" style={{ background: "rgba(0,75,135,0.08)", color: "var(--gsc-blue)" }}>
          {dataset.join_field || "admin_pcode"}
        </span>
      </div>

      {/* ADM0 */}
      {isAdm0 && (
        <div className="rounded-lg p-4 text-sm" style={{ background: "white", border: "1px solid var(--gsc-light-gray)" }}>
          {gradRows.length === 0 ? (
            <div className="text-gray-500">No value.</div>
          ) : (
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-semibold">{gradRows[0]?.value ?? "—"}</div>
              {dataset.unit && <div className="text-gray-500">{dataset.unit}</div>}
            </div>
          )}
        </div>
      )}

      {/* Gradient */}
      {!isCat && !isAdm0 && (
        <div className="overflow-auto rounded-lg" style={{ border: "1px solid var(--gsc-light-gray)", background: "white" }}>
          <table className="min-w-full text-xs">
            <thead className="bg-[var(--gsc-beige)] text-[var(--gsc-gray)]">
              <tr>
                <th className="px-2 py-1 text-left">{dataset.join_field || "admin_pcode"}</th>
                <th className="px-2 py-1 text-left">value</th>
                <th className="px-2 py-1 text-left">unit</th>
              </tr>
            </thead>
            <tbody>
              {gradRows.slice(0, 200).map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--gsc-light-gray)" }}>
                  <td className="px-2 py-1">{r.admin_pcode}</td>
                  <td className="px-2 py-1">{r.value ?? "—"}</td>
                  <td className="px-2 py-1">{r.unit ?? dataset.unit ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Categorical */}
      {isCat && (
        <div className="overflow-auto rounded-lg" style={{ border: "1px solid var(--gsc-light-gray)", background: "white" }}>
          <table className="min-w-full text-xs">
            <thead className="bg-[var(--gsc-beige)] text-[var(--gsc-gray)]">
              <tr>
                <th className="px-2 py-1 text-left">{dataset.join_field || "admin_pcode"}</th>
                {catHeaders.map((h) => (
                  <th key={h} className="px-2 py-1 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catMatrix.slice(0, 200).map((row: any, i: number) => (
                <tr key={i} style={{ borderTop: "1px solid var(--gsc-light-gray)" }}>
                  <td className="px-2 py-1">{row.admin_pcode}</td>
                  {catHeaders.map((h) => {
                    const v = row[h];
                    const isCheck = v === "✓";
                    return (
                      <td key={h} className="px-2 py-1" style={isCheck ? { color: "var(--gsc-green)" } : undefined}>
                        {v ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
