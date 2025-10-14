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
  category_order?: number | null;
  sort_order?: number | null;
};

type TermsByCategory = Record<string, Term[]>;

export default function TaxonomyPicker({
  selectedIds,
  onChange,
  allowMultiple = true,
  hidePrefix = false,
}: Props) {
  const [termsByCategory, setTermsByCategory] = useState<TermsByCategory>({});
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerms();
  }, []);

  async function loadTerms() {
    setLoading(true);
    const { data, error } = await supabase
      .from("taxonomy_terms")
      .select("id, name, category, code, description, category_order, sort_order")
      .order("category_order", { ascending: true, nullsFirst: true })
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load taxonomy terms:", error);
      setTermsByCategory({});
      setOrderedCategories([]);
      setLoading(false);
      return;
    }

    const grouped: TermsByCategory = {};
    (data || []).forEach((t) => {
      const category = t.category || "Uncategorized";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(t);
    });

    // Sort terms inside each category
    Object.keys(grouped).forEach((cat) => {
      grouped[cat].sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.name.localeCompare(b.name)
      );
    });

    // Determine category order
    const cats = Object.entries(grouped)
      .map(([cat, list]) => ({
        name: cat,
        order: list[0]?.category_order ?? 9999,
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((c) => c.name);

    setTermsByCategory(grouped);
    setOrderedCategories(cats);
    setLoading(false);
  }

  function toggleSelection(id: string) {
    if (allowMultiple) {
      onChange(
        selectedIds.includes(id)
          ? selectedIds.filter((sid) => sid !== id)
          : [...selectedIds, id]
      );
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
    }
  }

  if (loading)
    return (
      <div className="text-xs text-gray-500 italic px-2 py-1">
        Loading taxonomy terms…
      </div>
    );

  return (
    <div className="space-y-2 max-h-[280px] overflow-y-auto border rounded-md p-2 bg-[var(--gsc-beige)]/30">
      {orderedCategories.map((category) => (
        <div key={category}>
          <div
            className="text-[13px] font-semibold mb-1 border-b pb-[1px]"
            style={{ color: "var(--gsc-gray)" }}
          >
            {category}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-2 gap-y-1">
            {termsByCategory[category].map((term) => {
              const checked = selectedIds.includes(term.id);
              return (
                <label
                  key={term.id}
                  className="flex items-center gap-1 text-[11.5px] cursor-pointer hover:bg-[var(--gsc-beige)] rounded px-1 py-[1px]"
                >
                  <input
                    type={allowMultiple ? "checkbox" : "radio"}
                    checked={checked}
                    onChange={() => toggleSelection(term.id)}
                    className="w-3.5 h-3.5 accent-[var(--gsc-blue)]"
                  />
                  <span
                    className="truncate"
                    title={
                      term.description
                        ? `${term.name} • ${term.description}`
                        : term.name
                    }
                  >
                    {!hidePrefix && (
                      <span className="text-gray-400 text-[10.5px] mr-[2px]">
                        {term.code}:
                      </span>
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
