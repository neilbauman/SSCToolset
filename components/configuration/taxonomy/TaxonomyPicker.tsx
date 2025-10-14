"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, ChevronUp, GripVertical, Plus, X } from "lucide-react";

export type TaxonomyTerm = {
  id: string;
  category: string;
  code: string;
  name: string;
  description?: string | null;
};

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allowMultiple?: boolean;
  showOrderControls?: boolean; // allow reordering of selected
};

export default function TaxonomyPicker({
  selectedIds,
  onChange,
  allowMultiple = true,
  showOrderControls = true,
}: Props) {
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("id, category, code, name, description")
        .order("category", { ascending: true })
        .order("code", { ascending: true });
      if (!error) {
        setTerms(data || []);
        const cats: Record<string, boolean> = {};
        (data || []).forEach((t) => { if (!(t.category in cats)) cats[t.category] = true; });
        setOpenGroups(cats);
      }
    })();
  }, []);

  const grouped = useMemo(() => {
    const list = q.trim()
      ? terms.filter(t =>
          t.name.toLowerCase().includes(q.toLowerCase()) ||
          t.code.toLowerCase().includes(q.toLowerCase()) ||
          (t.category || "").toLowerCase().includes(q.toLowerCase()))
      : terms;
    const map: Record<string, TaxonomyTerm[]> = {};
    for (const t of list) {
      map[t.category] = map[t.category] || [];
      map[t.category].push(t);
    }
    return map;
  }, [terms, q]);

  const toggle = (termId: string) => {
    if (allowMultiple) {
      if (selectedIds.includes(termId)) {
        onChange(selectedIds.filter((id) => id !== termId));
      } else {
        onChange([...selectedIds, termId]);
      }
    } else {
      onChange(selectedIds.includes(termId) ? [] : [termId]);
    }
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...selectedIds];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  };

  const removeAt = (idx: number) => {
    const next = [...selectedIds];
    next.splice(idx, 1);
    onChange(next);
  };

  const getDisplay = (id: string) => {
    const t = terms.find((x) => x.id === id);
    return t ? `${t.category}: ${t.code} — ${t.name}` : id;
    };

  return (
    <div className="border rounded-lg">
      {/* Selected pills with ordering */}
      <div className="p-3 border-b bg-[color:var(--gsc-beige)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[color:var(--gsc-gray)]">Selected terms</span>
          <div className="flex gap-2">
            <ArrowUpAZ className="w-4 h-4 text-[color:var(--gsc-blue)]" />
            <ArrowDownAZ className="w-4 h-4 text-[color:var(--gsc-blue)]" />
          </div>
        </div>

        {selectedIds.length === 0 ? (
          <p className="text-xs text-gray-500 italic">None selected.</p>
        ) : (
          <ul className="space-y-2">
            {selectedIds.map((id, idx) => (
              <li key={id} className="flex items-center justify-between bg-white border rounded-md px-2 py-1">
                <div className="flex items-center gap-2">
                  {showOrderControls && <GripVertical className="w-4 h-4 text-gray-400" />}
                  <span className="text-sm">{getDisplay(id)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {showOrderControls && (
                    <>
                      <button className="p-1 hover:bg-gray-100 rounded" onClick={() => move(idx, -1)} title="Move up">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded" onClick={() => move(idx, 1)} title="Move down">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button className="p-1 hover:bg-gray-100 rounded" onClick={() => removeAt(idx)} title="Remove">
                    <X className="w-4 h-4 text-[color:var(--gsc-red)]" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Search */}
      <div className="p-3 border-b bg-white">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search terms by name, code, or category…"
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
      </div>

      {/* Available terms grouped */}
      <div className="p-3 max-h-64 overflow-auto bg-white">
        {Object.entries(grouped).map(([category, list]) => (
          <div key={category} className="mb-3">
            <button
              type="button"
              className="flex w-full items-center justify-between px-2 py-1 rounded hover:bg-gray-50"
              onClick={() => setOpenGroups((g) => ({ ...g, [category]: !g[category] }))}
            >
              <span className="text-sm font-semibold text-[color:var(--gsc-blue)]">{category}</span>
              {openGroups[category] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openGroups[category] && (
              <ul className="mt-1 space-y-1">
                {list.map((t) => {
                  const selected = selectedIds.includes(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => toggle(t.id)}
                        className={`w-full text-left flex items-center justify-between px-2 py-1 rounded border ${
                          selected ? "bg-[color:var(--gsc-beige)] border-[color:var(--gsc-blue)]" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-sm">
                          <span className="font-mono mr-1">{t.code}</span>
                          {t.name}
                        </span>
                        <span className={`ml-2 text-xs inline-flex items-center gap-1 ${selected ? "text-[color:var(--gsc-green)]" : "text-gray-500"}`}>
                          {selected ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {selected ? "Selected" : "Add"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <p className="text-xs text-gray-500 italic">No terms found.</p>
        )}
      </div>
    </div>
  );
}
