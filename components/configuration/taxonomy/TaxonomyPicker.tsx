"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

interface TaxonomyTerm {
  id: string;
  name: string;
  category?: string | null;
}

interface TaxonomyPickerProps {
  selectedIds: string[];
  onChange: (value: string[]) => void;
  allowMultiple?: boolean;
}

/**
 * TaxonomyPicker — allows selecting taxonomy terms (categories, SSC links, etc.)
 */
export default function TaxonomyPicker({
  selectedIds,
  onChange,
  allowMultiple = false,
}: TaxonomyPickerProps) {
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTerms() {
      setLoading(true);
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("id, name, category")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) console.error("Failed to load taxonomy terms:", error);
      else setTerms(data || []);
      setLoading(false);
    }
    loadTerms();
  }, []);

  function toggleTerm(id: string) {
    if (allowMultiple) {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((x) => x !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    } else {
      onChange([id]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading taxonomy…
      </div>
    );
  }

  if (!terms.length) {
    return <p className="text-sm text-gray-500">No taxonomy terms found.</p>;
  }

  // Group terms by category (SSC, Vulnerability, etc.)
  const grouped = terms.reduce((acc, t) => {
    const cat = t.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, TaxonomyTerm[]>);

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([cat, catTerms]) => (
        <div key={cat}>
          <h4 className="text-xs uppercase tracking-wide font-semibold text-gray-500 mb-1">
            {cat}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {catTerms.map((term) => (
              <label
                key={term.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.includes(term.id)}
                  onCheckedChange={() => toggleTerm(term.id)}
                />
                <span className="text-sm">{term.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
