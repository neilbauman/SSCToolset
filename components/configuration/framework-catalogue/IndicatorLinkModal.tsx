"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type EntityType = "pillar" | "theme" | "subtheme";
type Entity = { id: string; name: string; type: EntityType };
type Indicator = { id: string; code: string; name: string; topic: string | null };
type TaxonomyTerm = { id: string; name: string; category: string };

type Props = {
  open: boolean;
  onClose: () => void;
  entity: Entity;
  onSaved: () => Promise<void>;
};

export default function IndicatorLinkModal({ open, onClose, entity, onSaved }: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [selectedIndicator, setSelectedIndicator] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // ─────────────────────────────────────────────
  // Load taxonomy categories that have linked indicators
  useEffect(() => {
    (async () => {
      const { data: linkRows } = await supabase.from("indicator_taxonomy_links").select("taxonomy_id");
      const linkedIds = (linkRows || []).map((r) => r.taxonomy_id);
      if (!linkedIds.length) return;
      const { data: termsData } = await supabase
        .from("taxonomy_terms")
        .select("id, category, name")
        .in("id", linkedIds);
      const uniqueCats = Array.from(new Set((termsData || []).map((t) => t.category))).sort();
      setCategories(uniqueCats);
    })();
  }, []);

  // Load terms for selected category
  useEffect(() => {
    if (selectedCategory === "all") return setTerms([]);
    (async () => {
      const { data } = await supabase
        .from("taxonomy_terms")
        .select("id, name, category")
        .eq("category", selectedCategory)
        .order("name");
      setTerms(data || []);
    })();
  }, [selectedCategory]);

  // Load indicators for selected taxonomy term
  useEffect(() => {
    (async () => {
      setLoading(true);
      let ids: string[] = [];
      if (selectedTerm !== "all") {
        const { data } = await supabase
          .from("indicator_taxonomy_links")
          .select("indicator_id")
          .eq("taxonomy_id", selectedTerm);
        ids = (data || []).map((x) => x.indicator_id);
      } else if (selectedCategory !== "all") {
        const { data: termIds } = await supabase
          .from("taxonomy_terms")
          .select("id")
          .eq("category", selectedCategory);
        const { data } = await supabase
          .from("indicator_taxonomy_links")
          .select("indicator_id")
          .in("taxonomy_id", (termIds || []).map((t) => t.id));
        ids = (data || []).map((x) => x.indicator_id);
      }
      const { data } = await supabase
        .from("indicator_catalogue")
        .select("id, code, name, topic")
        .in("id", ids)
        .order("code");
      setIndicators(data || []);
      setLoading(false);
    })();
  }, [selectedCategory, selectedTerm]);

  // Load existing links for this entity
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("catalogue_indicator_links")
        .select("id, indicator_catalogue(id, code, name, topic)")
        .eq(`${entity.type}_id`, entity.id);
      setLinks(data || []);
    })();
  }, [entity]);

  // ─────────────────────────────────────────────
  const filteredIndicators = useMemo(
    () =>
      search
        ? indicators.filter(
            (i) =>
              i.name.toLowerCase().includes(search.toLowerCase()) ||
              i.code.toLowerCase().includes(search.toLowerCase())
          )
        : indicators,
    [indicators, search]
  );

  // ─────────────────────────────────────────────
  async function handleAdd() {
    if (!selectedIndicator) return;
    setLoading(true);

    const insertObj: any = {
      indicator_id: selectedIndicator,
      catalogue_type: entity.type,
    };
    if (entity.type === "pillar") insertObj.pillar_id = entity.id;
    if (entity.type === "theme") insertObj.theme_id = entity.id;
    if (entity.type === "subtheme") insertObj.subtheme_id = entity.id;

    const { error } = await supabase.from("catalogue_indicator_links").insert([insertObj]);
    setLoading(false);
    if (error) {
      console.error("Insert failed:", error);
      alert("Failed to link indicator.");
    } else {
      await onSaved();
      setSelectedIndicator("");
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("catalogue_indicator_links").delete().eq("id", id);
    if (error) alert("Delete failed."); else await onSaved();
  }

  // ─────────────────────────────────────────────
  return (
    <Modal open={open} onClose={onClose} title={`Indicators for ${entity.name}`}>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="text-sm text-gray-600">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border rounded-md p-1 text-sm"
          >
            <option value="all">All</option>
            {categories.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600">Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full border rounded-md p-1 text-sm"
            disabled={selectedCategory === "all"}
          >
            <option value="all">All</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600">Search</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full border rounded-md p-1 text-sm"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-sm text-gray-600 mb-1">Select Indicator</label>
        <div className="flex items-center gap-2">
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
            className="border rounded-md p-1 text-sm flex-1 max-w-[80%]"
          >
            <option value="">Select an indicator</option>
            {filteredIndicators.map((ind) => (
              <option key={ind.id} value={ind.id}>
                {ind.code} — {ind.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedIndicator || loading}
            className={`text-sm px-3 py-1 rounded-md min-w-[3.5rem] transition-colors ${
              loading
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-[var(--gsc-blue)] text-white hover:bg-blue-700"
            }`}
          >
            {loading ? "..." : "Add"}
          </button>
        </div>
      </div>

      <table className="w-full text-sm border-t">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left px-2 py-1">Code</th>
            <th className="text-left px-2 py-1">Name</th>
            <th className="text-left px-2 py-1">Topic</th>
            <th className="text-right px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {links.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center text-gray-400 py-2 italic">
                No indicators linked.
              </td>
            </tr>
          ) : (
            links.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-2 py-1">{l.indicator_catalogue?.code}</td>
                <td className="px-2 py-1">{l.indicator_catalogue?.name}</td>
                <td className="px-2 py-1">{l.indicator_catalogue?.topic}</td>
                <td className="px-2 py-1 text-right">
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="text-red-600 hover:underline text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </Modal>
  );
}
