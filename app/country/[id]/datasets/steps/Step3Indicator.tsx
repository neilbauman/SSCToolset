"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function Step3Indicator({ meta, setMeta, onBack, onNext }: any) {
  const [categories, setCategories] = useState<string[]>([]);
  const [terms, setTerms] = useState<{ id: string; name: string; category: string }[]>([]);
  const [indicators, setIndicators] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState("");

  // Load taxonomy terms
  useEffect(() => {
    supabase.from("taxonomy_terms").select("id,name,category").then(({ data }) => {
      if (!data) return;
      setTerms(data);
      setCategories(Array.from(new Set(data.map((t) => t.category).filter(Boolean))));
    });
  }, []);

  // Load indicators for selected term via indicator_taxonomy_links
  useEffect(() => {
    if (!selectedTerm) {
      setIndicators([]);
      return;
    }
    (async () => {
      const { data: links, error } = await supabase
        .from("indicator_taxonomy_links")
        .select("indicator_id")
        .eq("taxonomy_id", selectedTerm);
      if (error || !links?.length) {
        setIndicators([]);
        return;
      }
      const ids = links.map((l: any) => l.indicator_id);
      const { data: inds } = await supabase
        .from("indicator_catalogue")
        .select("id,name")
        .in("id", ids);
      setIndicators(inds || []);
    })();
  }, [selectedTerm]);

  const canContinue = !!selectedIndicator && !!selectedTerm;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--gsc-blue)]">
        Step 3 – Assign Indicator and Taxonomy
      </h3>
      <p className="text-sm text-[var(--gsc-gray)]">
        Choose a taxonomy category, term, and indicator to associate this dataset.
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm">
          Category
          <select
            className="border rounded p-2 w-full"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedTerm("");
              setSelectedIndicator("");
            }}
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Term
          <select
            className="border rounded p-2 w-full"
            value={selectedTerm}
            onChange={(e) => {
              setSelectedTerm(e.target.value);
              setSelectedIndicator("");
            }}
          >
            <option value="">Select term…</option>
            {terms
              .filter((t) => t.category === selectedCategory)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </label>

        <label className="text-sm md:col-span-2">
          Indicator
          <select
            className="border rounded p-2 w-full"
            value={selectedIndicator}
            onChange={(e) => setSelectedIndicator(e.target.value)}
          >
            <option value="">Select indicator…</option>
            {indicators.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex justify-between pt-5">
        <button onClick={onBack} className="px-3 py-2 rounded border">
          Back
        </button>
        <button
          disabled={!canContinue}
          onClick={() => {
            setMeta({
              ...meta,
              taxonomy_category: selectedCategory,
              taxonomy_term: selectedTerm,
              indicator_id: selectedIndicator,
            });
            onNext();
          }}
          className="px-4 py-2 rounded text-white"
          style={{
            background: canContinue
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
