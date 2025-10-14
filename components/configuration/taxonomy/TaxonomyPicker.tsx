"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type TaxonomyTerm = {
  id: string;
  category: string;
  code: string;
  name: string;
};

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  hidePrefix?: boolean;
};

export default function TaxonomyPicker({ selectedIds, onChange, hidePrefix = true }: Props) {
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerms();
  }, []);

  async function loadTerms() {
    setLoading(true);
    const { data, error } = await supabase.from("taxonomy_terms").select("*").order("category, code");
    if (error) console.error("Error loading taxonomy terms:", error);
    else setTerms(data || []);
    setLoading(false);
  }

  const grouped = terms.reduce((acc: Record<string, TaxonomyTerm[]>, term) => {
    if (!acc[term.category]) acc[term.category] = [];
    acc[term.category].push(term);
    return acc;
  }, {});

  function toggle(id: string) {
    const newIds = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    onChange(newIds);
  }

  if (loading) return <p className="text-sm text-gray-500 italic">Loading taxonomy terms...</p>;

  return (
    <div className="space-y-6 bg-[var(--gsc-beige)] p-3 rounded-md border border-[var(--gsc-light-gray)]">
      {Object.entries(grouped).map(([category, items]) => {
        const groupTerm = items.find((t) => t.code === category.toLowerCase());
        const groupSelected = groupTerm && selectedIds.includes(groupTerm.id);
        return (
          <div key={category}>
            <div className="font-semibold text-[var(--gsc-blue)] mb-1 flex items-center gap-2">
              {groupTerm && (
                <input
                  type="checkbox"
                  checked={groupSelected}
                  onChange={() => toggle(groupTerm.id)}
                />
              )}
              <span>{category}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 ml-2">
              {items
                .filter((t) => t.id !== groupTerm?.id)
                .map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-[var(--gsc-gray)]">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(t.id)}
                      onChange={() => toggle(t.id)}
                    />
                    {hidePrefix ? t.name : `${t.code} ${t.name}`}
                  </label>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
