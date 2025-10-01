"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import { Plus } from "lucide-react";

interface AdminUnit {
  id: string;
  name: string;
  pcode: string;
  level: string;
  parent_pcode?: string;
  population?: number;
}

export default function AdminUnitsPage({ params }: { params: { id: string } }) {
  const countryIso = params.id;
  const [units, setUnits] = useState<AdminUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [openUpload, setOpenUpload] = useState(false);

  const fetchUnits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_units")
      .select("*")
      .eq("country_iso", countryIso)
      .order("level", { ascending: true });

    if (!error && data) {
      setUnits(data as AdminUnit[]);
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUnits();
  }, [countryIso]);

  const headerProps = {
    title: "Admin Units",
    group: "country-config" as const,
    description: "View and manage administrative boundaries for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Admin Units" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Administrative Units</h2>
        <button
          onClick={() => setOpenUpload(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Upload Data
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : units.length === 0 ? (
        <p className="text-gray-500 italic">
          No admin units uploaded yet. Use the <strong>Upload Data</strong> button above.
        </p>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 border text-left">Name</th>
                <th className="px-3 py-2 border text-left">PCode</th>
                <th className="px-3 py-2 border text-left">Level</th>
                <th className="px-3 py-2 border text-left">Parent PCode</th>
                <th className="px-3 py-2 border text-left">Population</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border">{u.name}</td>
                  <td className="px-3 py-2 border">{u.pcode}</td>
                  <td className="px-3 py-2 border">{u.level}</td>
                  <td className="px-3 py-2 border">{u.parent_pcode || "—"}</td>
                  <td className="px-3 py-2 border">{u.population?.toLocaleString() || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      <UploadAdminUnitsModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchUnits}
      />
    </SidebarLayout>
  );
}
