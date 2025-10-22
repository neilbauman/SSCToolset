"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import CreateDerivedDatasetWizard_JoinAware from "./CreateDerivedDatasetWizard_JoinAware";

export default function DerivedDatasetsPanel({ countryIso }: { countryIso: string }) {
  const sb = supabaseBrowser;
  const [datasets, setDatasets] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadData(); }, [refreshKey]);

  async function loadData() {
    setLoading(true);
    const { data, error } = await sb
      .from("view_derived_dataset_summary")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (!error && data) setDatasets(data);
    setLoading(false);
  }

  async function deleteDerived(id: string, title: string) {
    if (!confirm(`Delete derived dataset "${title}"?\n\nThis will cascade remove all associated records.`)) return;
    const { error } = await sb.rpc("cascade_delete_derived_dataset", { p_derived_id: id });
    if (error) return alert("Delete failed: " + error.message);
    alert("Deleted successfully.");
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="mt-6 border rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f9f9f9]">
        <h3 className="text-[15px] font-semibold text-[#640811] flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-[#640811] inline-block"></span>
          Derived Datasets
        </h3>
        <button
          onClick={() => setOpen(true)}
          className="bg-[#640811] text-white px-3 py-1 rounded text-sm hover:bg-[#50060d]"
        >
          + Create Derived
        </button>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-gray-500">Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left p-2 font-medium">Title</th>
                <th className="text-left p-2 font-medium">Level</th>
                <th className="text-left p-2 font-medium">Year</th>
                <th className="text-left p-2 font-medium">Method</th>
                <th className="text-right p-2 font-medium">Records</th>
                <th className="text-left p-2 font-medium">Taxonomy</th>
                <th className="text-center p-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.derived_dataset_id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{d.derived_title}</td>
                  <td className="p-2">{d.admin_level}</td>
                  <td className="p-2">{d.year || "—"}</td>
                  <td className="p-2">{d.method || "—"}</td>
                  <td className="p-2 text-right">{d.record_count ?? "—"}</td>
                  <td className="p-2 text-xs text-gray-600 max-w-[220px] truncate" title={d.domains || ""}>
                    {d.domains || "—"}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => deleteDerived(d.derived_dataset_id, d.derived_title)}
                      className="text-gray-500 hover:text-red-600 text-lg"
                      title="Delete derived dataset"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {datasets.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-sm text-gray-500">
                    No derived datasets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <CreateDerivedDatasetWizard_JoinAware
          open={open}
          onClose={() => {
            setOpen(false);
            setRefreshKey(k => k + 1);
          }}
          countryIso={countryIso}
        />
      )}
    </div>
  );
}
