"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function Step3Indicator({ meta, setMeta, back, next }: any) {
  const [categories, setCategories] = useState<{ name: string }[]>([]);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [indicators, setIndicators] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("taxonomy_terms")
        .select("category")
        .not("category", "is", null);
      if (data) {
        const unique = [...new Set(data.map((d) => d.category))].sort();
        setCategories(unique.map((c) => ({ name: c })));
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function loadTerms() {
      if (!meta.taxonomy_category) return;
      const { data } = await supabase
        .from("taxonomy_terms")
        .select("id,name,category")
        .eq("category", meta.taxonomy_category)
        .order("name");
      if (data) setTerms(data);
    }
    loadTerms();
  }, [meta.taxonomy_category]);

  useEffect(() => {
    async function loadIndicators() {
      if (!meta.taxonomy_term_id) {
        const { data } = await supabase
          .from("indicator_catalogue")
          .select("id,name")
          .order("name");
        if (data) setIndicators(data);
        return;
      }
      const { data: links } = await supabase
        .from("indicator_taxonomy_links")
        .select("indicator_id")
        .eq("taxonomy_id", meta.taxonomy_term_id);
      const ids = links?.map((l) => l.indicator_id) || [];
      if (!ids.length) return setIndicators([]);
      const { data } = await supabase
        .from("indicator_catalogue")
        .select("id,name")
        .in("id", ids)
        .order("name");
      if (data) setIndicators(data);
    }
    loadIndicators();
  }, [meta.taxonomy_term_id]);

  return (
    <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
        Step 3 – Assign Indicator & Taxonomy
      </h2>
      <p className="text-sm mb-4">
        Choose a taxonomy category, term, and indicator to associate this dataset with.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm">
          Category
          <select
            className="border rounded p-2 w-full"
            value={meta.taxonomy_category}
            onChange={(e) =>
              setMeta({ ...meta, taxonomy_category: e.target.value, taxonomy_term_id: "" })
            }
          >
            <option value="">Select category...</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Term
          <select
            className="border rounded p-2 w-full"
            value={meta.taxonomy_term_id}
            onChange={(e) =>
              setMeta({ ...meta, taxonomy_term_id: e.target.value, indicator_id: "" })
            }
          >
            <option value="">Select term...</option>
            {terms.map((t) => (
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
            value={meta.indicator_id}
            onChange={(e) => setMeta({ ...meta, indicator_id: e.target.value })}
          >
            <option value="">Select indicator...</option>
            {indicators.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={back} className="px-3 py-2 rounded border border-gray-400">
          Back
        </button>
        <button
          onClick={next}
          disabled={!meta.indicator_id}
          className="px-4 py-2 rounded text-white"
          style={{
            background: meta.indicator_id
              ? "var(--gsc-blue)"
              : "var(--gsc-light-gray)",
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
