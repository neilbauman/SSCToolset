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

type Term = {
  id: string;
  code: string;
  name: string;
  category: string;
};

type IndicatorTerms = Record<string, Term[]>;

type SortKey = "code" | "name" | "type" | "unit" | "topic" | "created_at";

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [termsByIndicator, setTermsByIndicator] = useState<IndicatorTerms>({});
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

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

    // 1) Indicators
    const { data: inds, error } = await supabase
      .from("indicator_catalogue")
      .select("id, code, name, type, unit, topic, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading indicators:", error);
      setIndicators([]);
      setTermsByIndicator({});
      setLoading(false);
      return;
    }

    setIndicators(inds || []);

    // 2) Taxonomy (indicator_taxonomy -> taxonomy_terms)
    if (!inds || inds.length === 0) {
      setTermsByIndicator({});
      setLoading(false);
      return;
    }

    const ids = inds.map((i) => i.id);

    const { data: links, error: linkErr } = await supabase
      .from("indicator_taxonomy")
      .select("indicator_id, term_id")
      .in("indicator_id", ids);

    if (linkErr) {
      console.error("Error loading indicator_taxonomy:", linkErr);
      setTermsByIndicator({});
      setLoading(false);
      return;
    }

    const termIds = Array.from(new Set((links || []).map((l) => l.term_id)));
    if (termIds.length === 0) {
      setTermsByIndicator({});
      setLoading(false);
      return;
    }

    const { data: terms, error: termsErr } = await supabase
      .from("taxonomy_terms")
      .select("id, code, name, category")
      .in("id", termIds);

    if (termsErr) {
      console.error("Error loading taxonomy_terms:", termsErr);
      setTermsByIndicator({});
      setLoading(false);
      return;
    }

    const termMap = new Map(terms!.map((t) => [t.id, t]));
    const grouped: IndicatorTerms = {};
    (links || []).forEach((lnk) => {
      const t = termMap.get(lnk.term_id);
      if (!t) return;
      if (!grouped[lnk.indicator_id]) grouped[lnk.indicator_id] = [];
      grouped[lnk.indicator_id].push(t);
    });

    setTermsByIndicator(grouped);
    setLoading(false);
  }

  async function deleteIndicator(id: string) {
    if (!confirm("Delete this indicator?")) return;

    // Clean join rows first
    const { error: jtErr } = await supabase
      .from("indicator_taxonomy")
      .delete()
      .eq("indicator_id", id);
    if (jtErr) {
      console.error("Failed to delete taxonomy links:", jtErr);
      alert("Error deleting taxonomy links.");
      return;
    }

    const { error } = await supabase.from("indicator_catalogue").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete indicator:", error);
      alert("Error deleting indicator.");
    } else {
      loadAll();
    }
  }

  const sorted = useMemo(() => {
    const copy = [...indicators];
    copy.sort((a, b) => {
      const av = (a[sortKey] ?? "") as string;
      const bv = (b[sortKey] ?? "") as string;
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return copy;
  }, [indicators, sortKey, sortAsc]);

  function toggleSort(col: SortKey) {
    if (col === sortKey) {
      setSortAsc((s) => !s);
    } else {
      setSortKey(col);
      setSortAsc(true);
    }
  }

  function SortBtn({ label, col }: { label: string; col: SortKey }) {
    return (
      <button
        onClick={() => toggleSort(col)}
        className="inline-flex items-center gap-1 text-left"
        title="Sort"
      >
        <span>{label}</span>
        <ArrowUpDown className={`w-3.5 h-3.5 ${sortKey === col ? "text-[var(--gsc-blue)]" : "text-gray-400"}`} />
      </button>
    );
  }

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--gsc-blue)" }}>
          Indicators
        </h2>
        <button
          onClick={() => setOpenAdd(true)}
          className="flex items-center gap-1 px-3 py-2 text-sm rounded-md"
          style={{ background: "var(--gsc-blue)", color: "white" }}
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
        <div className="border rounded-md overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead style={{ background: "var(--gsc-beige)", color: "var(--gsc-gray)" }}>
              <tr>
                <th className="text-left px-3 py-2 font-medium"><SortBtn label="Code" col="code" /></th>
                <th className="text-left px-3 py-2 font-medium"><SortBtn label="Name" col="name" /></th>
                <th className="text-left px-3 py-2 font-medium"><SortBtn label="Type" col="type" /></th>
                <th className="text-left px-3 py-2 font-medium"><SortBtn label="Unit" col="unit" /></th>
                <th className="text-left px-3 py-2 font-medium"><SortBtn label="Topic" col="topic" /></th>
                <th className="text-left px-3 py-2 font-medium">Taxonomy</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ind) => {
                const t = termsByIndicator[ind.id] || [];
                return (
                  <tr key={ind.id} className="border-t hover:bg-[var(--gsc-beige)]/40">
                    <td className="px-3 py-2">{ind.code}</td>
                    <td className="px-3 py-2">{ind.name}</td>
                    <td className="px-3 py-2">{ind.type}</td>
                    <td className="px-3 py-2">{ind.unit}</td>
                    <td className="px-3 py-2">{ind.topic}</td>
                    <td className="px-3 py-2">
                      {t.length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {t
                            .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
                            .map((term) => (
                              <span
                                key={term.id}
                                className="text-[11px] px-2 py-[2px] rounded-full border"
                                style={{
                                  borderColor: "var(--gsc-light-gray)",
                                  background: "white",
                                  color: "var(--gsc-gray)",
                                }}
                                title={`${term.category} • ${term.code}`}
                              >
                                {term.name}
                              </span>
                            ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingId(ind.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" style={{ color: "var(--gsc-blue)" }} />
                        </button>
                        <button
                          onClick={() => deleteIndicator(ind.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
