"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Table, Upload, FileDown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";

// Status badge reused
function StatusBadge({ status }: { status: "uploaded" | "partial" | "missing" }) {
  const colors: Record<string, string> = {
    uploaded: "bg-green-100 text-green-800",
    partial: "bg-yellow-100 text-yellow-800",
    missing: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-1 text-xs rounded font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}

// Core badge
function CoreBadge() {
  return (
    <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
      Core
    </span>
  );
}

// ✅ Page Component
export default function AdminUnitsPage({ params }: { params: { id: string } }) {
  const id = params?.id ?? "unknown";

  const [units, setUnits] = useState<any[]>([]);
  const [status, setStatus] = useState<"uploaded" | "partial" | "missing">(
    "missing"
  );
  const [openUpload, setOpenUpload] = useState(false);

  // fetch admin units
  const fetchUnits = async () => {
    const { data } = await supabase
      .from("admin_units")
      .select("*")
      .eq("country_iso", id);

    if (!data || data.length === 0) {
      setStatus("missing");
      setUnits([]);
      return;
    }

    setUnits(data);

    // heuristic: consider "uploaded" if >= 3 levels
    const levels = new Set(data.map((u) => u.level));
    if (levels.size >= 3) setStatus("uploaded");
    else setStatus("partial");
  };

  useEffect(() => {
    fetchUnits();
  }, [id]);

  const headerProps = {
    title: "Administrative Units",
    group: "country-config" as const,
    description: "Upload and manage administrative boundaries for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: id, href: `/country/${id}` },
          { label: "Admin Units" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Table className="w-6 h-6 text-green-600" />
          <h2 className="text-lg font-semibold">
            Admin Units <CoreBadge />
          </h2>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            window.location.href = `/api/templates/admin-units?country=${id}`;
          }}
          className="flex items-center gap-1 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          <FileDown className="w-4 h-4" /> Download Template
        </button>
        <button
          onClick={() => setOpenUpload(true)}
          className="flex items-center gap-1 px-3 py-2 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90"
        >
          <Upload className="w-4 h-4" /> Upload Data
        </button>
      </div>

      {/* Table */}
      {units.length > 0 ? (
        <div className="border rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                  PCode
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                  Level
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">
                  Population
                </th>
              </tr>
            </thead>
            <tbody>
              {units.map((u, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2 text-sm">{u.name}</td>
                  <td className="px-4 py-2 text-sm">{u.pcode}</td>
                  <td className="px-4 py-2 text-sm">{u.level}</td>
                  <td className="px-4 py-2 text-sm">
                    {u.population ? u.population.toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">No admin units uploaded yet.</p>
      )}

      {/* Upload modal */}
      {openUpload && (
        <UploadAdminUnitsModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={id}
          onUploaded={fetchUnits} // ✅ refresh after upload
        />
      )}
    </SidebarLayout>
  );
}
