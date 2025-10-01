"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import AdminUnitsTree from "@/components/country/AdminUnitsTree";
import { Database, Pencil } from "lucide-react";

type AdminUnit = {
  id: string;
  name: string;
  pcode: string;
  level: string;
  parent_pcode?: string | null;
};

export default function AdminUnitsPage(props: any) {
  const countryIso = props.params?.id as string;

  const [country, setCountry] = useState<any>(null);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [source, setSource] = useState<{ name: string; url?: string } | null>(null);
  const [openSource, setOpenSource] = useState(false);
  const [view, setView] = useState<"table" | "tree">("table");

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso", countryIso).single();
      if (data) setCountry(data);
    };
    fetchCountry();
  }, [countryIso]);

  useEffect(() => {
    const fetchUnits = async () => {
      const { data } = await supabase.from("admin_units").select("*").eq("country_iso", countryIso);
      if (data) {
        setAdminUnits(data as AdminUnit[]);
        const grouped: Record<string, number> = {};
        data.forEach((u: AdminUnit) => {
          grouped[u.level] = (grouped[u.level] || 0) + 1;
        });
        setCounts(grouped);
      }
    };
    fetchUnits();
  }, [countryIso]);

  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase.from("admin_units").select("source").eq("country_iso", countryIso).limit(1).maybeSingle();
      if (data?.source) setSource(data.source as any);
    };
    fetchSource();
  }, [countryIso]);

  const headerProps = {
    title: `${country?.name ?? countryIso} – Admin Units`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded administrative boundaries.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Admin Units" },
        ]}
      />
    ),
  };

  const missingPcodes = adminUnits.filter((u) => !u.pcode).length;
  const allHavePcodes = adminUnits.length > 0 && missingPcodes === 0;
  const hasGISLink = false;

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary + Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Database className="w-5 h-5 text-blue-600" /> Admin Units Summary
          </h2>
          <p className="text-sm text-gray-700 mb-2"><strong>Total Units:</strong> {adminUnits.length}</p>
          <ul className="text-sm text-gray-700 mb-2">
            {Object.entries(counts).map(([lvl, cnt]) => (
              <li key={lvl}><strong>{lvl}:</strong> {cnt}</li>
            ))}
          </ul>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm">
              <strong>Dataset Source:</strong>{" "}
              {source ? (
                source.url ? (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {source.name}
                  </a>
                ) : source.name
              ) : <span className="italic text-gray-500">Empty</span>}
            </p>
            <button onClick={() => setOpenSource(true)} className="flex items-center text-sm text-gray-700 border px-2 py-1 rounded hover:bg-gray-50">
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </button>
          </div>
        </div>

        <DatasetHealth
          allHavePcodes={allHavePcodes}
          missingPcodes={missingPcodes}
          hasGISLink={hasGISLink}
          hasPopulation={false}
          totalUnits={adminUnits.length}
        />
      </div>

      {/* Toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView("table")} className={`px-3 py-1.5 text-sm rounded ${view === "table" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>Table View</button>
        <button onClick={() => setView("tree")} className={`px-3 py-1.5 text-sm rounded ${view === "tree" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>Tree View</button>
      </div>

      {view === "table" ? (
        <div className="border rounded-lg p-4 shadow-sm">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr><th className="border px-2 py-1">Name</th><th className="border px-2 py-1">PCode</th><th className="border px-2 py-1">Level</th><th className="border px-2 py-1">Parent</th></tr>
            </thead>
            <tbody>
              {adminUnits.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{u.name}</td>
                  <td className="border px-2 py-1">{u.pcode}</td>
                  <td className="border px-2 py-1">{u.level}</td>
                  <td className="border px-2 py-1">{u.parent_pcode ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <AdminUnitsTree units={adminUnits} />}

      <EditDatasetSourceModal open={openSource} onClose={() => setOpenSource(false)} source={source || undefined} onSave={async (newSource) => {
        await supabase.from("admin_units").update({ source: newSource }).eq("country_iso", countryIso);
        setSource(newSource);
      }} />
    </SidebarLayout>
  );
}
