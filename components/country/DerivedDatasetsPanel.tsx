"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import CreateDerivedDatasetWizard_JoinAware from "./CreateDerivedDatasetWizard_JoinAware";

type ViewRow = {
  derived_dataset_id: string;
  country_iso: string;
  derived_title: string;
  description: string | null;
  admin_level: string | null;
  method: string | null;
  record_count: number | null;
  data_health: string | null;
  created_at: string | null;
  updated_at: string | null;
  taxonomy_terms: string | null;
  formula: string | null;
  dataset_status: string | null;
};

export default function DerivedDatasetsPanel({ countryIso }: { countryIso: string }) {
  const sb = supabaseBrowser;
  const router = useRouter();
  const [rows, setRows] = useState<ViewRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await sb
      .from("view_derived_dataset_summary")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (!error && data) setRows(data as ViewRow[]);
  }

  useEffect(() => {
    load();
  }, [countryIso]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this derived dataset?")) return;
    await sb.rpc("delete_derived_dataset", { p_derived_id: id });
    await load();
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Derived Datasets</h3>
        <button
          className="px-3 py-1 rounded text-xs text-white bg-[#640811] hover:opacity-90"
          onClick={() => setOpen(true)}
        >
          + New
        </button>
      </div>

      <div className="border rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Method</th>
              <th className="p-2">Records</th>
              <th className="p-2">Taxonomy</th>
              <th className="p-2">Formula</th>
              <th className="p-2 w-16 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.derived_dataset_id} className="border-t">
                <td className="p-2">{r.derived_title}</td>
                <td className="p-2">{r.method ?? ""}</td>
                <td className="p-2">{r.record_count ?? 0}</td>
                <td className="p-2">{r.taxonomy_terms ?? ""}</td>
                <td className="p-2">{r.formula ?? ""}</td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => handleDelete(r.derived_dataset_id)}
                    title="Delete"
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td className="p-3 text-sm text-gray-500" colSpan={6}>
                  No derived datasets yet.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="p-3 text-sm text-gray-500" colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <CreateDerivedDatasetWizard_JoinAware
          open={open}
          onClose={async () => {
            setOpen(false);
            await load();
            router.refresh();
          }}
          countryIso={countryIso}
        />
      )}
    </div>
  );
}
