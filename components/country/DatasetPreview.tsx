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
};

type CatRow = {
  admin_pcode: string;
  admin_level: string | null;
  category_label: string;
  category_score: number | null;
};
type GradRow = {
  admin_pcode: string;
  admin_level: string | null;
  value: number | null;
  unit: string | null;
};

type AdminUnit = { pcode: string; name: string };

export default function DatasetPreview({
  dataset,
  countryIso,
}: {
  dataset: DatasetMeta;
  countryIso: string;
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [gradRows, setGradRows] = useState<GradRow[]>([]);
  const [catRows, setCatRows] = useState<CatRow[]>([]);
  const [catHeaders, setCatHeaders] = useState<string[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  const isCat =
    dataset.dataset_type === "categorical" ||
    (dataset as any).data_type === "categorical";
  const isAdm0 = dataset.dataset_type === "adm0";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) Load data rows
        if (isCat) {
          const [{ data: v, error: ve }, { data: m, error: me }] =
            await Promise.all([
              supabase
                .from("dataset_values_cat")
                .select("admin_pcode, admin_level, category_label, category_score")
                .eq("dataset_id", dataset.id)
                .limit(100000),
              supabase
                .from("dataset_category_maps")
                .select("label")
                .eq("dataset_id", dataset.id)
                .order("label"),
            ]);

          if (ve) throw ve;
          if (me) throw me;

          setCatRows((v as CatRow[]) || []);
          const fromData = Array.from(new Set((v || []).map((r: any) => r.category_label)));
          const fromMap = (m || []).map((x: any) => x.label);
          // prefer map order if present
          const headers =
            fromMap.length > 0
              ? fromMap
              : fromData.sort((a, b) => a.localeCompare(b));
          setCatHeaders(headers);
        } else if (isAdm0) {
          const { data, error } = await supabase
            .from("dataset_values")
            .select("admin_pcode, admin_level, value, unit")
            .eq("dataset_id", dataset.id)
            .limit(1);
          if (error) throw error;
          setGradRows((data as GradRow[]) || []);
        } else {
          const { data, error } = await supabase
            .from("dataset_values")
            .select("admin_pcode, admin_level, value, unit")
            .eq("dataset_id", dataset.id)
            .limit(100000);
          if (error) throw error;
          setGradRows((data as GradRow[]) || []);
        }

        // 2) Load admin names for nicer preview
        const pcodes = isCat
          ? Array.from(new Set(catRows.map((r) => r.admin_pcode)))
          : Array.from(new Set(gradRows.map((r) => r.admin_pcode)));
        const sample = pcodes.slice(0, 1000); // avoid overly large IN lists

        if (sample.length > 0) {
          const { data: admins, error: ae } = await supabase
            .from("admin_units")
            .select("pcode,name")
            .in("pcode", sample);
          if (ae) throw ae;
          const map: Record<string, string> = {};
          (admins || []).forEach((a: any) => (map[a.pcode] = a.name));
          setNameMap(map);
        }
      } catch (e: any) {
        setErr(e.message || "Failed to load preview.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset.id]);

  // Pivot categorical rows into a matrix: one row per admin, one column per category
  const catMatrix = useMemo(() => {
    if (!isCat) return [];
    const byAdmin = new Map<string, Record<string, number | string | null>>();
    for (const r of catRows) {
      const key = r.admin_pcode;
      if (!byAdmin.has(key)) byAdmin.set(key, {});
      const row = byAdmin.get(key)!;
      row[r.category_label] = r.category_score;
    }
    const out = Array.from(byAdmin.entries()).map(([pcode, obj]) => ({
      admin_pcode: pcode,
      admin_name: nameMap[pcode] ?? "",
      ...obj,
    }));
    return out;
  }, [catRows, catHeaders, nameMap, isCat]);

  if (loading) {
    return (
      <div className="text-sm text-gray-600 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
      </div>
    );
  }

  if (err) {
    return (
      <div
        className="rounded-lg p-3 text-sm"
        style={{ color: "var(--gsc-red)", border: "1px solid var(--gsc-light-gray)", background: "white" }}
      >
        {err}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--gsc-gray)]">
        <Database className="h-4 w-4" /> <span className="font-semibold">{dataset.title}</span>
        <span className="text-xs opacity-70">
          ({dataset.dataset_type?.toUpperCase()} • {dataset.admin_level})
        </span>
      </div>

      {/* ADM0: single value */}
      {isAdm0 && (
        <div
          className="rounded-lg p-4 text-sm"
          style={{ background: "white", border: "1px solid var(--gsc-light-gray)" }}
        >
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

      {/* Gradient: admin value table */}
      {!isCat && !isAdm0 && (
        <div className="overflow-auto rounded-lg" style={{ border: "1px solid var(--gsc-light-gray)", background: "white" }}>
          <table className="min-w-full text-xs">
            <thead className="bg-[var(--gsc-beige)] text-[var(--gsc-gray)]">
              <tr>
                <th className="px-2 py-1 text-left">admin_pcode</th>
                <th className="px-2 py-1 text-left">admin_name</th>
                <th className="px-2 py-1 text-left">value</th>
                <th className="px-2 py-1 text-left">unit</th>
              </tr>
            </thead>
            <tbody>
              {gradRows.slice(0, 200).map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--gsc-light-gray)" }}>
                  <td className="px-2 py-1">{r.admin_pcode}</td>
                  <td className="px-2 py-1">{nameMap[r.admin_pcode] ?? "—"}</td>
                  <td className="px-2 py-1">{r.value ?? "—"}</td>
                  <td className="px-2 py-1">{r.unit ?? dataset.unit ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Categorical: pivoted matrix with category columns */}
      {isCat && (
        <div className="overflow-auto rounded-lg" style={{ border: "1px solid var(--gsc-light-gray)", background: "white" }}>
          <table className="min-w-full text-xs">
            <thead className="bg-[var(--gsc-beige)] text-[var(--gsc-gray)]">
              <tr>
                <th className="px-2 py-1 text-left">admin_pcode</th>
                <th className="px-2 py-1 text-left">admin_name</th>
                {catHeaders.map((h) => (
                  <th key={h} className="px-2 py-1 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catMatrix.slice(0, 200).map((row, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--gsc-light-gray)" }}>
                  <td className="px-2 py-1">{(row as any).admin_pcode}</td>
                  <td className="px-2 py-1">{(row as any).admin_name || "—"}</td>
                  {catHeaders.map((h) => {
                    const v = (row as any)[h];
                    return <td key={h} className="px-2 py-1">{v ?? "—"}</td>;
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
