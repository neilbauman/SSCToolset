"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Indicator = { id: string; name: string };
type Term = { id: string; name: string; category_id: string };
type Category = { id: string; name: string };

export default function Step3Indicator({
  meta,
  setMeta,
  back,
  next,
}: {
  meta: any;
  setMeta: (m: any) => void;
  back: () => void;
  next: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(false);

  // 1️⃣ Fetch taxonomy categories
  useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from("indicator_categories")
        .select("id,name")
        .order("name");
      if (!error && data) setCategories(data);
    }
    loadCategories();
  }, []);

  // 2️⃣ Fetch terms for category
  useEffect(() => {
    async function loadTerms() {
      if (!meta.taxonomy_category) return;
      const { data, error } = await supabase
        .from("indicator_taxonomy_links")
        .select("taxonomy_id:id, taxonomy_name:name, category_id")
        .eq("category_id", meta.taxonomy_category)
        .order("taxonomy_name");
      if (!error && data)
        setTerms(
          data.map((d: any) => ({
            id: d.taxonomy_id,
            name: d.taxonomy_name,
            category_id: d.category_id,
          }))
        );
    }
    loadTerms();
  }, [meta.taxonomy_category]);

  // 3️⃣ Fetch indicators filtered by taxonomy
  useEffect(() => {
    async function loadIndicators() {
      setLoading(true);
      let q = supabase.from("indicator_catalogue").select("id,name");
      if (meta.taxonomy_term_id) {
        q = q.eq("id", meta.taxonomy_term_id);
      } else if (meta.taxonomy_category) {
        const { data: linkData, error: linkErr } = await supabase
          .from("indicator_taxonomy_links")
          .select("indicator_id")
          .eq("category_id", meta.taxonomy_category);
        if (linkErr || !linkData) {
          setLoading(false);
          return;
        }
        const ids = linkData.map((r) => r.indicator_id);
        q = q.in("id", ids);
      }
      const { data, error } = await q.order("name");
      if (!error && data) setIndicators(data);
      setLoading(false);
    }
    loadIndicators();
  }, [meta.taxonomy_category, meta.taxonomy_term_id]);

  // 4️⃣ Handlers
  const handleCategoryChange = (e: any) => {
    const val = e.target.value;
    setMeta((m: any) => ({
      ...m,
      taxonomy_category: val,
      taxonomy_term_id: "",
      indicator_id: "",
    }));
  };

  const handleTermChange = (e: any) => {
    const val = e.target.value;
    setMeta((m: any) => ({
      ...m,
      taxonomy_term_id: val,
      indicator_id: "",
    }));
  };

  const handleIndicatorChange = (e: any) => {
    const val = e.target.value;
    setMeta((m: any) => ({
      ...m,
      indicator_id: val,
    }));
  };

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
            onChange={handleCategoryChange}
          >
            <option value="">Select category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
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
            onChange={handleTermChange}
            disabled={!meta.taxonomy_category}
          >
            <option value="">Select term…</option>
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
            onChange={handleIndicatorChange}
            disabled={loading}
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

      <div className="flex justify-end gap-2 pt-5">
        <button
          onClick={back}
          className="px-3 py-2 rounded border border-gray-400"
        >
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
