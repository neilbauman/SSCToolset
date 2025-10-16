"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type TaxonomyTerm = {
  id: string;
  category: string;
  name: string;
};

type Indicator = {
  id: string;
  title: string;
  code?: string;
};

export default function Step3Indicator({
  meta,
  setMeta,
  onBack,
  onNext,
}: {
  meta: any;
  setMeta: (m: any) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [terms, setTerms] = useState<TaxonomyTerm[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string>(meta.taxonomy_category || "");
  const [selectedTerm, setSelectedTerm] = useState<string>(meta.taxonomy_term || "");
  const [selectedIndicator, setSelectedIndicator] = useState<string>(meta.indicator_id || "");

  const [message, setMessage] = useState<string | null>(null);

  // Load all taxonomy terms
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("id,category,name")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      const terms = (data || []) as TaxonomyTerm[];
      setTerms(terms);
      setCategories(Array.from(new Set(terms.map((t) => t.category).filter(Boolean))));
      setLoading(false);
    })();
  }, []);

  // Load indicators when a term is selected
  useEffect(() => {
    if (!selectedTerm) {
      setIndicators([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("indicator_taxonomy_links")
        .select("indicator_id, taxonomy_id, indicators (id, title, code)")
        .eq("taxonomy_id", terms.find((t) => t.name === selectedTerm)?.id || "");
      if (error) {
        console.error(error);
        setMessage(error.message);
        return;
      }
      const found = (data || [])
        .map((row: any) => ({
          id: row.indicators?.id,
          title: row.indicators?.title,
          code: row.indicators?.code,
        }))
        .filter((x: any) => x.id);
      setIndicators(found);
    })();
  }, [selectedTerm, terms]);

  function handleNext() {
    if (!selectedIndicator) {
      setMessage("Please select an indicator before continuing.");
      return;
    }
    setMeta({
      ...meta,
      taxonomy_category: selectedCategory,
      taxonomy_term: selectedTerm,
      indicator_id: selectedIndicator,
    });
    onNext();
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 3 – Assign Indicator and Taxonomy
        </h2>
        <p className="text-sm mb-3">
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
            {/* Category */}
            <div className="grid md:grid-cols-2 gap-4">
              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Category</span>
                <select
                  className="border rounded p-2"
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedTerm("");
                    setIndicators([]);
                  }}
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-sm font-medium mb-1">Term</span>
                <select
                  className="border rounded p-2"
                  value={selectedTerm}
                  onChange={(e) => {
                    setSelectedTerm(e.target.value);
                    setSelectedIndicator("");
                  }}
                  disabled={!selectedCategory}
                >
                  <option value="">Select term…</option>
                  {terms
                    .filter((t) => t.category === selectedCategory)
                    .map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            {/* Indicator */}
            <label className="flex flex-col mt-4">
              <span className="text-sm font-medium mb-1">Indicator</span>
              <select
                className="border rounded p-2"
                value={selectedIndicator}
                onChange={(e) => setSelectedIndicator(e.target.value)}
                disabled={!selectedTerm}
              >
                <option value="">Select indicator…</option>
                {indicators.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.code ? `${i.code} – ` : ""}
                    {i.title}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {message && (
          <div className="mt-3 text-sm text-[var(--gsc-red)]">{message}</div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-3 py-2 rounded border">
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedIndicator}
          className="px-4 py-2 rounded text-white"
          style={{
            background: selectedIndicator
              ? "var(--gsc-blue)"
              : "var(--gsc-light-gray)",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
