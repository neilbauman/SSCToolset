"use client";

import { useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Pencil, Trash2 } from "lucide-react";
import AddCountryModal from "@/components/country/AddCountryModal";

export default function CountryPage() {
  const [editMode, setEditMode] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);

  // Mock dataset — replace later with Supabase query
  const countries = [
    { id: 1, name: "Philippines", iso: "PHL", population: 113900000, lastUpdated: "2024-01-01" },
    { id: 2, name: "Nepal", iso: "NPL", population: 30000000, lastUpdated: "2023-08-10" },
    { id: 3, name: "Honduras", iso: "HND", population: null, lastUpdated: "2023-11-15" },
  ];

  return (
    <SidebarLayout>
      <PageHeader
        title="Country Configuration"
        group="SSC Configuration"
        description="Manage baseline country data for SSC analysis."
        breadcrumbs={[{ name: "Dashboard", href: "/" }, { name: "Country Configuration", href: "/country" }]}
      />

      <div className="flex justify-between items-center mb-4">
        <Button onClick={() => setOpenAdd(true)}>+ Add Country</Button>
        <Button className="bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={() => setEditMode(!editMode)}>
          {editMode ? "Exit Edit Mode" : "Edit Mode"}
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">ISO Code</th>
              <th className="px-4 py-2">Population</th>
              <th className="px-4 py-2">Last Updated</th>
              {editMode && <th className="px-4 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{c.name}</td>
                <td className="px-4 py-2">{c.iso}</td>
                <td className="px-4 py-2">
                  {c.population ? c.population.toLocaleString() : <span className="italic text-gray-400">—</span>}
                </td>
                <td className="px-4 py-2">{c.lastUpdated}</td>
                {editMode && (
                  <td className="px-4 py-2 flex gap-2">
                    <Button className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-2 py-1">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button className="bg-red-600 text-white hover:bg-red-700 px-2 py-1">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Country Modal */}
      <AddCountryModal open={openAdd} onClose={() => setOpenAdd(false)} onSave={(country) => console.log("Saving:", country)} />
    </SidebarLayout>
  );
}
