"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allowMultiple?: boolean;
  hidePrefix?: boolean;
};

type Term = {
  id: string;
  name: string;
  category: string;
  code: string;
  description?: string;
};

type TermsByCategory = Record<string, Term[]>;

export default function TaxonomyPicker({
  selectedIds,
  onChange,
  allowMultiple = true,
  hidePrefix = false,
}: Props) {
  const [termsByCategory, setTermsByCategory] = useState<TermsByCategory>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerms();
  }, []);

  async function loadTerms() {
    setLoading(true);
    const { data, error } = await supabase
      .from("taxonomy_terms")
      .select("id, name, category, code, description")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load taxonomy terms:", error);
      setTermsByCategory({});
      setLoading(false);
      return;
    }

    const grouped: TermsByCategory = {};
    (data || []).forEach((t) => {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t);
    });
    setTermsByCategory(grouped);
    setLoading(false);
  }

  function toggleSelection(id: string) {
    if (allowMultiple) {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((sid) => sid !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
    }
  }

  if (loading)
    return <div className="text-sm text-gray-500 italic">Loading terms…</div>;

  return (
    <div className="space-y-3 max-h-[320px] overflow-y-auto border rounded-md p-3 bg-[var(--gsc-beige)]/30">
      {Object.entries(termsByCategory).map(([category, terms]) => (
        <div key={category}>
          <div
            className="text-sm font-semibold border-b pb-1 mb-2"
            style={{ color: "var(--gsc-gray)" }}
          >
            {category}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {terms.map((term) => {
              const checked = selectedIds.includes(term.id);
              return (
                <label
                  key={term.id}
                  className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-[var(--gsc-beige)] rounded px-1 py-0.5"
                >
                  <input
                    type={allowMultiple ? "checkbox" : "radio"}
                    checked={checked}
                    onChange={() => toggleSelection(term.id)}
                    className="accent-[var(--gsc-blue)]"
                  />
                  <span className="truncate">
                    {!hidePrefix && (
                      <span className="text-gray-400">{term.code}: </span>
                    )}
                    {term.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
