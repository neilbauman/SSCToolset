"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddIndicatorModal from "@/components/configuration/indicators/AddIndicatorModal";
import EditIndicatorModal from "@/components/configuration/indicators/EditIndicatorModal";
import { Plus, Edit2, Trash2, Loader2, ArrowUpDown } from "lucide-react";

type Indicator = {
  id: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  topic: string;
  taxonomy_terms?: string[]; // array of linked taxonomy UUIDs or names
  created_at?: string;
};

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof Indicator>("code");
  const [sortAsc, setSortAsc] = useState(true);

  const headerProps = {
    title: "Indicator Catalogue",
    group: "ssc-config" as const,
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
      .select("id, code, name, type, unit, topic, taxonomy_terms, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading indicators:", error);
    } else {
      setIndicators(data || []);
    }
    setLoading(false);
  }

  function toggleSort(field: keyof Indicator) {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  const sortedIndicators = [...indicators].sort((a, b) => {
    const aVal = (a[sortField] || "").toString().toLowerCase();
    const bVal = (b[sortField] || "").toString().toLowerCase();
    return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

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
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <h2
          className="text-xl font-semibold"
          style={{ color: "var(--gsc-blue)" }}
        >
          Indicators
        </h2>
        <button
          onClick={() => setOpenAdd(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-white"
          style={{ backgroundColor: "var(--gsc-blue)" }}
        >
          <Plus className="w-4 h-4" /> Add Indicator
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading indicators...
        </div>
      ) : indicators.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No indicators found.</p>
      ) : (
        <div
          className="border rounded-lg overflow-hidden"
          style={{ borderColor: "var(--gsc-light-gray)" }}
        >
          <table className="w-full text-sm">
            <thead
              className="text-gray-700"
              style={{
                backgroundColor: "var(--gsc-beige)",
                borderBottom: "2px solid var(--gsc-light-gray)",
              }}
            >
              <tr>
                {[
                  ["code", "Code"],
                  ["name", "Name"],
                  ["type", "Type"],
                  ["unit", "Unit"],
                  ["topic", "Topic"],
                  ["taxonomy_terms", "Taxonomy Terms"],
                ].map(([field, label]) => (
                  <th
                    key={field}
                    className="px-3 py-2 font-semibold text-left cursor-pointer select-none"
                    onClick={() => toggleSort(field as keyof Indicator)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <ArrowUpDown
                        className={`w-3 h-3 transition-transform ${
                          sortField === field
                            ? sortAsc
                              ? "text-[var(--gsc-blue)] rotate-180"
                              : "text-[var(--gsc-blue)]"
                            : "text-gray-400"
                        }`}
                      />
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedIndicators.map((ind) => (
                <tr
                  key={ind.id}
                  className="border-t hover:bg-[var(--gsc-beige)] transition-colors"
                  style={{ borderColor: "var(--gsc-light-gray)" }}
                >
                  <td className="px-3 py-2">{ind.code}</td>
                  <td className="px-3 py-2">{ind.name}</td>
                  <td className="px-3 py-2">{ind.type}</td>
                  <td className="px-3 py-2">{ind.unit}</td>
                  <td className="px-3 py-2">{ind.topic}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {Array.isArray(ind.taxonomy_terms) && ind.taxonomy_terms.length > 0
                      ? ind.taxonomy_terms.join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setEditingId(ind.id)}
                        className="p-1 rounded hover:bg-[var(--gsc-light-gray)]"
                        title="Edit"
                      >
                        <Edit2
                          className="w-4 h-4"
                          style={{ color: "var(--gsc-blue)" }}
                        />
                      </button>
                      <button
                        onClick={() => deleteIndicator(ind.id)}
                        className="p-1 rounded hover:bg-[var(--gsc-light-gray)]"
                        title="Delete"
                      >
                        <Trash2
                          className="w-4 h-4"
                          style={{ color: "var(--gsc-red)" }}
                        />
                      </button>
                    </div>
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
