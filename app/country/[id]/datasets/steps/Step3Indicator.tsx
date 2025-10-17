"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function Step3Indicator({ meta, setMeta, back, next }: any) {
  const [categories, setCategories] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase.from("indicator_categories").select("*").order("name");
      if (!error && data) setCategories(data);
    }
    loadCategories();
  }, []);

  async function handleCategoryChange(categoryId: string) {
    setMeta({ ...meta, taxonomy_category: categoryId, taxonomy_term_id: "", indicator_id: "" });
    setTerms([]);
    setIndicators([]);
    const { data } = await supabase
      .from("taxonomy_terms")
      .select("*")
      .eq("category", categoryId)
      .order("name");
    if (data) setTerms(data);
  }

  async function handleTermChange(termId: string) {
    setMeta({ ...meta, taxonomy_term_id: termId, indicator_id: "" });
    setIndicators([]);
    setLoading(true);
    // fetch indicators linked to this term
    const { data, error } = await supabase
      .from("indicator_taxonomy_links")
      .select("indicator_id, indicators(id,name)")
      .eq("taxonomy_id", termId)
      .order("indicator_id", { ascending: true });
    if (!error && data) {
      const flat = data.map((d: any) => d.indicators).filter(Boolean);
      setIndicators(flat);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)]">
        Step 3 – Assign Indicator and Taxonomy
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1">Category</label>
          <select
            className="border rounded p-2 w-full"
            value={meta.taxonomy_category || ""}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Term</label>
          <select
            className="border rounded p-2 w-full"
            value={meta.taxonomy_term_id || ""}
            onChange={(e) => handleTermChange(e.target.value)}
          >
            <option value="">Select term…</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block mb-1">Indicator</label>
          <select
            className="border rounded p-2 w-full"
            value={meta.indicator_id || ""}
            disabled={loading}
            onChange={(e) => setMeta({ ...meta, indicator_id: e.target.value })}
          >
            <option value="">
              {loading ? "Loading indicators…" : "Select indicator…"}
            </option>
            {indicators.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button onClick={back} className="px-4 py-2 rounded border">
          ← Back
        </button>
        <button
          onClick={next}
          disabled={!meta.indicator_id}
          className="px-4 py-2 rounded bg-[var(--gsc-blue)] text-white disabled:bg-gray-300"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
