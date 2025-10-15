"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Indicator = { id: string; code: string; name: string; topic: string };
type Entity = { id: string; type: "pillar" | "theme" | "subtheme"; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  entity: Entity;
  onSaved: () => Promise<void>;
};

export default function IndicatorLinkModal({ open, onClose, entity, onSaved }: Props) {
  const [allIndicators, setAllIndicators] = useState<Indicator[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [cats, setCats] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState("All");
  const [termFilter, setTermFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function load() {
    setLoading(true);

    // Load existing links for this entity
    const { data: l, error: linkErr } = await supabase
      .from("framework_catalogue_indicator_links")
      .select("id, indicator_id, indicator_catalogue (id, code, name, topic)")
      .eq(`${entity.type}_id`, entity.id);
    if (linkErr) console.error("Error loading links:", linkErr);

    // Load indicators with taxonomy references
    const { data: inds, error: indErr } = await supabase
      .from("indicator_catalogue")
      .select("id, code, name, topic");
    if (indErr) console.error("Error loading indicators:", indErr);

    // Load taxonomy categories that actually have indicators
    const { data: tax, error: taxErr } = await supabase
      .from("indicator_taxonomy_links")
      .select("taxonomy_terms (category, name)")
      .not("indicator_id", "is", null);
    if (taxErr) console.error("Error loading taxonomy categories:", taxErr);

    const categories = Array.from(new Set(tax?.map((t: any) => t.taxonomy_terms?.category).filter(Boolean)));
    const termsList = Array.from(new Set(tax?.map((t: any) => t.taxonomy_terms?.name).filter(Boolean)));

    setCats(categories);
    setTerms(termsList);
    setLinks(l || []);
    setAllIndicators(inds || []);
    setSelected("");
    setLoading(false);
  }

  async function addLink() {
    if (!selected) return;
    const { error } = await supabase.from("framework_catalogue_indicator_links").insert({
      indicator_id: selected,
      [`${entity.type}_id`]: entity.id,
    });
    if (error) {
      console.error("Failed to link indicator:", error);
      alert("Failed to link indicator.");
      return;
    }
    await load();
    await onSaved();
  }

  async function deleteLink(id: string) {
    const { error } = await supabase.from("framework_catalogue_indicator_links").delete().eq("id", id);
    if (error) {
      console.error("Failed to unlink:", error);
      alert("Failed to unlink indicator.");
      return;
    }
    await load();
  }

  const filteredIndicators = allIndicators.filter((ind) => {
    const s = search.toLowerCase();
    return ind.name.toLowerCase().includes(s) || ind.code.toLowerCase().includes(s);
  });

  return (
    <Modal open={open} onClose={onClose} title={`Indicators for ${entity.name}`}>
      {loading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-sm font-medium block">Category</label>
              <select
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option>All</option>
                {cats.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block">Term</label>
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option>All</option>
                {terms.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium block">Search</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or code..."
                className="border rounded px-2 py-1 w-full text-sm"
              />
            </div>
          </div>

          {/* Select */}
          <div>
            <label className="text-sm font-medium block">Select Indicator</label>
            <div className="flex items-center gap-2">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="border rounded px-2 py-1 flex-1 text-sm"
              >
                <option value="">Select an indicator</option>
                {filteredIndicators.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code} — {i.name}
                  </option>
                ))}
              </select>
              <button
                onClick={addLink}
                className="px-3 py-1 bg-[var(--gsc-blue)] text-white rounded text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Linked indicators */}
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--gsc-beige)] text-[var(--gsc-gray)]">
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
                  links.map((lnk: any) => {
                    const i = lnk.indicator_catalogue?.[0];
                    if (!i) return null;
                    return (
                      <tr key={lnk.id} className="border-t">
                        <td className="px-2 py-1">{i.code}</td>
                        <td className="px-2 py-1">{i.name}</td>
                        <td className="px-2 py-1">{i.topic}</td>
                        <td className="px-2 py-1 text-right">
                          <button
                            onClick={() => deleteLink(lnk.id)}
                            className="text-[var(--gsc-red)] hover:underline text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
