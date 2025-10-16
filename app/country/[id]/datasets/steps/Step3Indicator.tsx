"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Filter, ArrowRight } from "lucide-react";

// Temporary stub for legacy type
type WizardMeta = any;

type Term = {
  id: string;
  category: string | null;
  name: string | null;
};

type Step3Props = {
  meta: WizardMeta;
  setMeta: (m: WizardMeta) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function Step3Indicator({
  meta,
  setMeta,
  onBack,
  onNext,
}: Step3Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("id,category,name");
      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const uniqueCats = Array.from(
        new Set((data || []).map((d) => d.category).filter(Boolean))
      ) as string[];

      setCategories(uniqueCats);
      setTerms((data as Term[]) || []);
      setLoading(false);
    })();
  }, []);

  const filteredTerms = terms.filter(
    (t) => !selectedCategory || t.category === selectedCategory
  );

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 3 – Assign Indicator and Taxonomy
        </h2>
        <p className="mb-3">
          Choose a taxonomy category and term to associate this dataset with an
          indicator in the SSC catalogue.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading taxonomy terms…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500">Category</label>
                <select
                  value={selectedCategory ?? ""}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500">Term</label>
                <select
                  value={selectedTerm ?? ""}
                  onChange={(e) => setSelectedTerm(e.target.value || null)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select term</option>
                  {filteredTerms.map((t) => (
                    <option key={t.id} value={t.name ?? ""}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-gray-600">
              <Filter className="h-3 w-3 inline mr-1" />
              Filtered {filteredTerms.length} taxonomy terms
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-3 py-2 rounded border text-sm"
          style={{ borderColor: "var(--gsc-light-gray)" }}
        >
          Back
        </button>
        <button
          onClick={() => {
            setMeta({
              ...meta,
              taxonomy_category: selectedCategory,
              taxonomy_term: selectedTerm,
            });
            onNext();
          }}
          disabled={!selectedCategory || !selectedTerm}
          className="px-4 py-2 rounded text-white flex items-center gap-1"
          style={{
            background:
              selectedCategory && selectedTerm
                ? "var(--gsc-blue)"
                : "var(--gsc-light-gray)",
          }}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
