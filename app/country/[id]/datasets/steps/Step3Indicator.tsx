"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function Step3Indicator({ meta, setMeta, back, next }: any) {
  const [categories, setCategories] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [indicators, setIndicators] = useState<any[]>([]);

  useEffect(() => {
    async function loadTaxonomies() {
      const { data } = await supabase.from("indicator_categories").select("*");
      if (data) setCategories(data);
    }
    loadTaxonomies();
  }, []);

  async function handleCategoryChange(id: string) {
    setMeta({ ...meta, taxonomy_category: id });
    const { data } = await supabase
      .from("taxonomy_terms")
      .select("*")
      .eq("category", id);
    if (data) setTerms(data);
  }

  async function handleTermChange(id: string) {
    setMeta({ ...meta, taxonomy_term_id: id });
    const { data } = await supabase
      .from("indicators")
      .select("id, name, code")
      .order("name");
    if (data) setIndicators(data);
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)]">
        Step 3 – Assign Indicator & Taxonomy
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1">Category</label>
          <select
            className="border rounded p-2 w-full"
            value={meta.taxonomy_category || ""}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">Select category...</option>
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
            <option value="">Select term...</option>
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
            onChange={(e) => setMeta({ ...meta, indicator_id: e.target.value })}
          >
            <option value="">Select indicator...</option>
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
        <button onClick={next} className="px-4 py-2 rounded bg-[var(--gsc-blue)] text-white">
          Continue →
        </button>
      </div>
    </div>
  );
}
