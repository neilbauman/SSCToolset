"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

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
  const [categories, setCategories] = useState<string[]>([]);
  const [terms, setTerms] = useState<{ id: string; name: string; category: string }[]>([]);
  const [indicators, setIndicators] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(meta.taxonomy_category || "");
  const [selectedTerm, setSelectedTerm] = useState<string>(meta.taxonomy_term_id || "");
  const [selectedIndicator, setSelectedIndicator] = useState<string>(meta.indicator_id || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("taxonomy_terms").select("id, category, name").order("category", { ascending: true });
      if (error) {
        setErr(error.message);
        return;
      }
      setTerms(data || []);
      setCategories(Array.from(new Set((data || []).map((t) => t.category).filter(Boolean))) as string[]);
    })();
  }, []);

  useEffect(() => {
    if (!selectedTerm) {
      setIndicators([]);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const { data: links, error: linkErr } = await supabase
          .from("indicator_taxonomy_links")
          .select("indicator_id")
          .eq("taxonomy_id", selectedTerm);
        if (linkErr) throw linkErr;
        const ids = (links || []).map((l) => l.indicator_id).filter(Boolean);
        if (ids.length === 0) {
          setIndicators([]);
          return;
        }
        const { data: ind, error: indErr } = await supabase.from("indicators").select("id, name").in("id", ids);
        if (indErr) throw indErr;
        setIndicators(ind || []);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedTerm]);

  function continueNext() {
    if (!selectedIndicator) {
      setErr("Please select an indicator before continuing.");
      return;
    }
    setMeta({ ...meta, taxonomy_category: selectedCategory, taxonomy_term_id: selectedTerm, indicator_id: selectedIndicator });
    next();
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">Step 3 – Assign Indicator & Taxonomy</h2>

        {err && <div className="mb-3 text-[var(--gsc-red)]">{err}</div>}

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm">Category
            <select
              className="border rounded p-2 w-full mt-1 bg-white"
              value={selectedCategory}
              onChange={(e) => {
                const c = e.target.value;
                setSelectedCategory(c);
                setSelectedTerm("");
                setIndicators([]);
                setSelectedIndicator("");
              }}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">Term
            <select
              className="border rounded p-2 w-full mt-1 bg-white"
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
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="text-sm md:col-span-2">Indicator
            <select
              className="border rounded p-2 w-full mt-1 bg-white"
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value)}
              disabled={!selectedTerm || loading}
            >
              <option value="">Select indicator…</option>
              {indicators.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          {loading && <div className="text-xs text-gray-500 md:col-span-2">Loading indicators…</div>}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-3 py-2 rounded border">
          Back
        </button>
        <button
          onClick={continueNext}
          disabled={!selectedIndicator}
          className="px-4 py-2 rounded text-white"
          style={{ background: !selectedIndicator ? "var(--gsc-light-gray)" : "var(--gsc-blue)" }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
