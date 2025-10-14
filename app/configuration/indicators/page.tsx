"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddIndicatorModal from "@/components/configuration/indicators/AddIndicatorModal";
import EditIndicatorModal from "@/components/configuration/indicators/EditIndicatorModal";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";

type Indicator = {
  id: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  topic: string;
  created_at?: string;
};

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const headerProps = {
    title: "Indicator Catalogue",
    group: "configuration" as const,
    description: "Manage indicators used throughout the SSC Toolset.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Configuration", href: "/configuration" },
          { label: "Indicators" },
        ]}
      />
    ),
  };

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .select("id, code, name, type, unit, topic, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading indicators:", error);
    } else {
      setIndicators(data || []);
    }
    setLoading(false);
  }

  async function deleteIndicator(id: string) {
    if (!confirm("Delete this indicator?")) return;
    const { error } = await supabase.from("indicator_catalogue").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete indicator:", error);
      alert("Error deleting indicator.");
    } else {
      loadAll();
    }
  }

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Indicators</h2>
        <button
          onClick={() => setOpenAdd(true)}
          className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Indicator
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading indicators...
        </div>
      ) : indicators.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No indicators found.</p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Code</th>
                <th className="text-left px-3 py-2 font-medium">Name</th>
                <th className="text-left px-3 py-2 font-medium">Type</th>
                <th className="text-left px-3 py-2 font-medium">Unit</th>
                <th className="text-left px-3 py-2 font-medium">Topic</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((ind) => (
                <tr key={ind.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{ind.code}</td>
                  <td className="px-3 py-2">{ind.name}</td>
                  <td className="px-3 py-2">{ind.type}</td>
                  <td className="px-3 py-2">{ind.unit}</td>
                  <td className="px-3 py-2">{ind.topic}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setEditingId(ind.id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => deleteIndicator(ind.id)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {openAdd && (
        <AddIndicatorModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          onSaved={loadAll}
        />
      )}

      {editingId && (
        <EditIndicatorModal
          open={!!editingId}
          indicatorId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={loadAll}
        />
      )}
    </SidebarLayout>
  );
}
