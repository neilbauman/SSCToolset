"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Tag } from "lucide-react";

type TaxonomyTerm = {
  id: string;
  name: string;
  code: string | null;
  category: string;
  description?: string | null;
};

interface TaxonomyPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  allowMultiple?: boolean;
  placeholder?: string;
}

export default function TaxonomyPicker({
  selectedIds,
  onChange,
  allowMultiple = true,
  placeholder = "Select taxonomy terms...",
}: TaxonomyPickerProps) {
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadTerms() {
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("id, name, code, category, description")
        .order("category", { ascending: true });
      if (!error && data) setTerms(data);
      setLoading(false);
    }
    loadTerms();
  }, []);

  const selectedTerms = terms.filter((t) => selectedIds.includes(t.id));

  const toggleSelection = (id: string) => {
    if (allowMultiple) {
      const newIds = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
      onChange(newIds);
    } else {
      onChange(selectedIds.includes(id) ? [] : [id]);
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <div
        className="border rounded-md p-2 min-h-[42px] flex flex-wrap items-center gap-2 cursor-pointer hover:border-gray-400"
        onClick={() => setOpen(!open)}
      >
        {selectedTerms.length > 0 ? (
          selectedTerms.map((t) => (
            <span
              key={t.id}
              className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full"
            >
              <Tag className="w-3 h-3" />
              {t.name}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelection(t.id);
                }}
              />
            </span>
          ))
        ) : (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        )}
      </div>

      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-64 overflow-auto">
          {loading && (
            <div className="p-3 text-gray-500 text-sm">Loading taxonomy terms…</div>
          )}
          {!loading &&
            terms.map((term) => (
              <div
                key={term.id}
                onClick={() => toggleSelection(term.id)}
                className={`p-2 cursor-pointer text-sm border-b last:border-b-0 hover:bg-gray-50 ${
                  selectedIds.includes(term.id)
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : ""
                }`}
              >
                <div className="flex justify-between">
                  <span>{term.name}</span>
                  <span className="text-xs text-gray-500">{term.category}</span>
                </div>
                {term.description && (
                  <div className="text-xs text-gray-400">{term.description}</div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
