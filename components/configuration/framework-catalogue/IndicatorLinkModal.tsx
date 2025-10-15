"use client";

import { useEffect, useState, useMemo } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";
import { Loader2, XCircle } from "lucide-react";

type Indicator = {
  id: string;
  code: string;
  name: string;
  topic: string;
};

type TaxonomyCategory = { category: string };
type TaxonomyTerm = { id: string; name: string; category: string };

type LinkRow = {
  id: string;
  indicator_id: string;
  indicator_catalogue: Indicator;
};

type Props = {
  open: boolean;
  onClose: () => void;
  entity: { type: "pillar" | "theme" | "subtheme"; id: string; name: string };
  onSaved: () => Promise<void>;
};

export default function IndicatorLinkModal({ open, onClose, entity, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [allIndicators, setAllIndicators] = useState<Indicator[]>([]);
  const [categories, setCategories] = useState<TaxonomyCategory[]>([]);
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState("");

  useEffect(() => {
    if (open) loadAll();
  }, [open]);

  async function loadAll() {
    setLoading(true);
    const { data: l, error: linkErr } = await supabase
      .from("framework_indicator_links")
      .select("id, indicator_id, indicator_catalogue(id, code, name, topic)")
      .eq(`${entity.type}_id`, entity.id);

    if (linkErr) console.error(linkErr);

    // flatten nested select
    const flatLinks =
      (l || []).map((row: any) => ({
        id: row.id,
        indicator_id: row.indicator_id,
        indicator_catalogue: row.indicator_catalogue?.[0] || row.indicator_catalogue,
      })) as LinkRow[];

    setLinks(flatLinks);

    // taxonomy categories that have linked indicators
    const { data: cats } = await supabase.rpc("distinct_taxonomy_categories_with_links");
    if (cats) setCategories(cats.map((c: any) => ({ category: c.category })));

    setLoading(false);
  }

  async function loadTermsForCategory(cat: string) {
    setSelectedCategory(cat);
    setSelectedTerm("");
    const { data, error } = await supabase
      .from("taxonomy_terms")
      .select("id, name, category")
      .eq("category", cat)
      .order("name");
    if (!error && data) setTerms(data);
  }

  async function loadIndicatorsForTerm(termId?: string, searchQuery?: string) {
    setLoading(true);
    let query = supabase.from("indicator_catalogue").select("id, code, name, topic").order("code");
    if (searchQuery) query = query.ilike("name", `%${searchQuery}%`);
    if (termId) {
      const { data: links } = await supabase
        .from("indicator_taxonomy_links")
        .select("indicator_id")
        .eq("taxonomy_id", termId);
      const ids = links?.map((r) => r.indicator_id) || [];
      if (ids.length > 0) query = query.in("id", ids);
      else query = query.limit(0);
    }
    const { data } = await query;
    setAllIndicators(data || []);
    setLoading(false);
  }

  async function handleAdd() {
    if (!selectedIndicator) return alert("Select an indicator first.");
    const { error } = await supabase.from("framework_indicator_links").insert({
      indicator_id: selectedIndicator,
      [`${entity.type}_id`]: entity.id,
    });
    if (error) alert("Failed to link indicator.");
    else {
      await loadAll();
      await onSaved();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this linked indicator?")) return;
    const { error } = await supabase.from("framework_indicator_links").delete().eq("id", id);
    if (error) alert("Delete failed.");
    else {
      await loadAll();
      await onSaved();
    }
  }

  const filteredIndicators = useMemo(() => {
    if (!search && !selectedTerm) return allIndicators;
    return allIndicators.filter((i) =>
      i.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [allIndicators, search, selectedTerm]);

  return (
    <Modal open={open} onClose={onClose} title={`Indicators for ${entity.name}`} width="max-w-3xl">
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => loadTermsForCategory(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.category} value={c.category}>
                    {c.category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedTerm(id);
                  loadIndicatorsForTerm(id, search);
                }}
                disabled={!selectedCategory}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">All</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (selectedTerm) loadIndicatorsForTerm(selectedTerm, e.target.value);
                }}
                placeholder="Search name or code..."
                className="border rounded px-2 py-1 text-sm w-full"
              />
            </div>
          </div>

          {/* Add Indicator */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Select Indicator</label>
              <select
                value={selectedIndicator}
                onChange={(e) => setSelectedIndicator(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="">Select an indicator</option>
                {filteredIndicators.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAdd}
              className="px-3 py-2 text-sm rounded-md"
              style={{ background: "var(--gsc-blue)", color: "white" }}
            >
              Add
            </button>
          </div>

          {/* Linked Indicators */}
          <div className="border rounded-md">
            <table className="w-full text-sm">
              <thead style={{ background: "var(--gsc-beige)", color: "var(--gsc-gray)" }}>
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Code</th>
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Topic</th>
                  <th className="text-right px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-gray-400 italic text-center">
                      No indicators linked.
                    </td>
                  </tr>
                ) : (
                  links.map((l) => (
                    <tr key={l.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{l.indicator_catalogue?.code}</td>
                      <td className="px-3 py-2">{l.indicator_catalogue?.name}</td>
                      <td className="px-3 py-2">{l.indicator_catalogue?.topic}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                          title="Remove link"
                        >
                          <XCircle className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
