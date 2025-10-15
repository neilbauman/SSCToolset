"use client";

import { useState, useEffect, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type EntityType = "pillar" | "theme" | "subtheme";
type Entity = { id: string; name: string; type: EntityType };

type Indicator = { id: string; code: string; name: string; topic: string | null };
type TaxonomyCategory = { id: string; name: string };
type TaxonomyTerm = { id: string; taxonomy_id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  entity: Entity;
  onSaved: () => Promise<void>;
};

export default function IndicatorLinkModal({ open, onClose, entity, onSaved }: Props) {
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [selectedIndicator, setSelectedIndicator] = useState<string>("");
  const [search, setSearch] = useState("");

  // ─────────────────────────────────────────────
  // Load taxonomy categories that have linked indicators
  // ─────────────────────────────────────────────
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("taxonomy")
        .select("id, name")
        .in("id",
          supabase
            .from("indicator_taxonomy_links")
            .select("taxonomy_id")
        );
      if (!error && data) setCategories(data);
    }
    loadCategories();
  }, []);

  // ─────────────────────────────────────────────
  // Load terms when category changes
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (selectedCategory === "all") {
      setTerms([]);
      setSelectedTerm("all");
      return;
    }
    async function loadTerms() {
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("id, name, taxonomy_id")
        .eq("taxonomy_id", selectedCategory)
        .order("name");
      if (!error && data) setTerms(data);
    }
    loadTerms();
  }, [selectedCategory]);

  // ─────────────────────────────────────────────
  // Load indicators based on term or category
  // ─────────────────────────────────────────────
  useEffect(() => {
    async function loadIndicators() {
      let query = supabase.from("indicator_catalogue").select("id, code, name, topic");

      if (selectedTerm !== "all") {
        query = query.in(
          "id",
          supabase.from("indicator_taxonomy_links").select("indicator_id").eq("taxonomy_id", selectedTerm)
        );
      } else if (selectedCategory !== "all") {
        const { data: termList } = await supabase
          .from("taxonomy_terms")
          .select("id")
          .eq("taxonomy_id", selectedCategory);
        const termIds = (termList || []).map((t) => t.id);
        query = query.in(
          "id",
          supabase
            .from("indicator_taxonomy_links")
            .select("indicator_id")
            .in("taxonomy_id", termIds)
        );
      }

      const { data, error } = await query.order("code");
      if (!error && data) setIndicators(data);
    }
    loadIndicators();
  }, [selectedCategory, selectedTerm]);

  // ─────────────────────────────────────────────
  // Load already-linked indicators
  // ─────────────────────────────────────────────
  useEffect(() => {
    async function loadLinks() {
      const { data, error } = await supabase
        .from("framework_indicator_links")
        .select("id, indicator_catalogue(id, code, name, topic)")
        .eq("framework_item_id", entity.id);
      if (!error && data) setLinks(data);
    }
    loadLinks();
  }, [entity.id]);

  // ─────────────────────────────────────────────
  // Filter indicators client-side by search term
  // ─────────────────────────────────────────────
  const filteredIndicators = useMemo(() => {
    if (!search) return indicators;
    return indicators.filter(
      (i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [indicators, search]);

  // ─────────────────────────────────────────────
  // Add indicator link
  // ─────────────────────────────────────────────
  async function handleAdd() {
    if (!selectedIndicator) return;
    const { error } = await supabase
      .from("framework_indicator_links")
      .insert({
        framework_item_id: entity.id,
        indicator_id: selectedIndicator,
      });
    if (error) {
      alert("Failed to link indicator.");
      console.error(error);
    } else {
      await onSaved();
      setSelectedIndicator("");
    }
  }

  // ─────────────────────────────────────────────
  // Delete indicator link
  // ─────────────────────────────────────────────
  async function handleDelete(id: string) {
    const { error } = await supabase.from("framework_indicator_links").delete().eq("id", id);
    if (error) alert("Delete failed.");
    else await onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Indicators for ${entity.name}`}>
      {/* Filters */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="block text-sm font-medium text-gray-600">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border rounded-md p-1 text-sm"
          >
            <option value="all">All</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600">Term</label>
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
          <label className="block text-sm font-medium text-gray-600">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or code..."
            className="w-full border rounded-md p-1 text-sm"
          />
        </div>
      </div>

      {/* Indicator selector */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-600 mb-1">Select Indicator</label>
        <div className="flex gap-2">
          <select
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
            className="flex-1 border rounded-md p-1 text-sm"
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
            className="bg-[var(--gsc-blue)] text-white text-sm px-3 py-1 rounded-md"
          >
            Add
          </button>
        </div>
      </div>

      {/* Linked indicators table */}
      <div className="border-t pt-2 mt-2">
        <table className="w-full text-sm">
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
      </div>
    </Modal>
  );
}
