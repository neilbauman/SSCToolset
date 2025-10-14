"use client";

import { useEffect, useMemo, useState } from "react";
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
  created_at?: string;
};

type TermRow = {
  id: string;
  category: string;
  code: string;
  name: string;
};

type SortKey = "code" | "name" | "type" | "unit" | "topic" | "taxonomy";

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [taxonomyByIndicator, setTaxonomyByIndicator] = useState<Record<string, TermRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("created_at" as any);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    // 1) indicators
    const { data: inds, error: errInd } = await supabase
      .from("indicator_catalogue")
      .select("id, code, name, type, unit, topic, created_at")
      .order("created_at", { ascending: false });
    if (errInd) console.error(errInd);

    // 2) taxonomy links (ordered) + terms
    const { data: links, error: errLinks } = await supabase
      .from("indicator_taxonomy_links")
      .select("indicator_id, sort_order, taxonomy_terms(id, category, code, name)")
      .order("sort_order", { ascending: true });
    if (errLinks) console.error(errLinks);

    const map: Record<string, TermRow[]> = {};
    (links || []).forEach((row: any) => {
      const t = row.taxonomy_terms as TermRow | null;
      if (!t) return;
      if (!map[row.indicator_id]) map[row.indicator_id] = [];
      map[row.indicator_id].push(t);
    });

    setIndicators(inds || []);
    setTaxonomyByIndicator(map);
    setLoading(false);
  }

  function header(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <button
        className={`inline-flex items-center gap-1 ${active ? "text-[color:var(--gsc-blue)]" : ""}`}
        onClick={() => {
          if (active) setSortDir(sortDir === "asc" ? "desc" : "asc");
          else { setSortKey(key); setSortDir("asc"); }
        }}
        title="Sort"
      >
        {label} <ArrowUpDown className="w-3.5 h-3.5" />
      </button>
    );
  }

  const rows = useMemo(() => {
    const enriched = indicators.map((i) => {
      const terms = taxonomyByIndicator[i.id] || [];
      const display = terms.map(t => `${t.code}`).join(", ");
      return { ...i, taxonomy: display };
    });
    const k = sortKey;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...enriched].sort((a: any, b: any) => {
      const av = (a[k] ?? "").toString().toLowerCase();
      const bv = (b[k] ?? "").toString().toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [indicators, taxonomyByIndicator, sortKey, sortDir]);

  async function deleteIndicator(id: string) {
    if (!confirm("Delete this indicator?")) return;
    // clean links first (FK may cascade, but be explicit)
    await supabase.from("indicator_taxonomy_links").delete().eq("indicator_id", id);
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
        <h2 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Indicators</h2>
        <button
          onClick={() => setOpenAdd(true)}
          className="flex items-center gap-1 px-3 py-2 text-sm bg-[color:var(--gsc-blue)] text-white rounded-md hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Add Indicator
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading indicators...
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No indicators found.</p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--gsc-beige)] text-[color:var(--gsc-gray)]">
              <tr>
                <th className="text-left px-3 py-2 font-medium">{header("Code", "code")}</th>
                <th className="text-left px-3 py-2 font-medium">{header("Name", "name")}</th>
                <th className="text-left px-3 py-2 font-medium">{header("Type", "type")}</th>
                <th className="text-left px-3 py-2 font-medium">{header("Unit", "unit")}</th>
                <th className="text-left px-3 py-2 font-medium">{header("Topic", "topic")}</th>
                <th className="text-left px-3 py-2 font-medium">{header("Taxonomy", "taxonomy")}</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((ind) => (
                <tr key={ind.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{ind.code}</td>
                  <td className="px-3 py-2">{ind.name}</td>
                  <td className="px-3 py-2">{ind.type}</td>
                  <td className="px-3 py-2">{ind.unit}</td>
                  <td className="px-3 py-2">{ind.topic}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(taxonomyByIndicator[ind.id] || []).map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 rounded-full text-xs border bg-white"
                          style={{ borderColor: "var(--gsc-light-gray)" }}
                          title={`${t.category}: ${t.name}`}
                        >
                          {t.code}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setEditingId(ind.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4 text-[color:var(--gsc-blue)]" />
                      </button>
                      <button
                        onClick={() => deleteIndicator(ind.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-[color:var(--gsc-red)]" />
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
