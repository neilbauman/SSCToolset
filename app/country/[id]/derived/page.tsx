"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Eye, Zap } from "lucide-react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";

type DerivedDataset = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: string | null;
  formula: string | null;
  dynamic_resolution: boolean;
  created_at: string;
  updated_at: string | null;
  country_iso: string;
};

export default function DerivedDatasetsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [datasets, setDatasets] = useState<DerivedDataset[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  const showToast = (msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  async function fetchDerived() {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) console.error("❌ Error loading derived datasets:", error);
    else setDatasets(data || []);
  }

  useEffect(() => {
    fetchDerived();
  }, [countryIso]);

  async function refreshDerived(dataset: DerivedDataset) {
    try {
      setRefreshing(true);
      const { error } = await supabase.functions.invoke("auto-refresh-popdensity", {
        body: { country_iso: countryIso },
      });
      if (error) throw error;
      showToast(`✅ Triggered refresh for ${dataset.title}`);
      await fetchDerived();
    } catch (err: any) {
      console.error(err);
      showToast("❌ Refresh failed: " + err.message);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – Derived Datasets`,
        group: "country-config",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Country Configuration", href: "/country" },
              { label: countryIso, href: `/country/${countryIso}` },
              { label: "Derived", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Derived Datasets</h2>
          <Link
            href="#"
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
          >
            <Zap className="w-4 h-4" /> New Derived Dataset
          </Link>
        </div>

        <div className="bg-white border rounded-md overflow-hidden text-sm shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Admin Level</th>
                <th className="px-3 py-2 text-left">Method</th>
                <th className="px-3 py-2 text-left">Formula</th>
                <th className="px-3 py-2 text-left">Dynamic</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center italic text-gray-500 py-3">
                    No derived datasets yet.
                  </td>
                </tr>
              ) : (
                datasets.map((d) => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{d.title}</td>
                    <td className="px-3 py-2">{d.admin_level}</td>
                    <td className="px-3 py-2">{d.method ?? "—"}</td>
                    <td className="px-3 py-2">{d.formula ?? "—"}</td>
                    <td className="px-3 py-2">
                      {d.dynamic_resolution ? (
                        <span className="text-green-600 font-medium">Auto</span>
                      ) : (
                        <span className="text-gray-500">Manual</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        onClick={() => refreshDerived(d)}
                        disabled={refreshing}
                        className="text-[#640811] hover:underline disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4 inline" /> Refresh
                      </button>
                      <Link
                        href={`/country/${countryIso}/derived/${d.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        <Eye className="w-4 h-4 inline" /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 bg-[#640811] text-white px-4 py-2 rounded shadow-md"
            >
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}
