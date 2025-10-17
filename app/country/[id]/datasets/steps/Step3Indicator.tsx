"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function Step3Indicator({ meta, setMeta, back, next }: {
  meta: any;
  setMeta: (m: any) => void;
  back: () => void;
  next: () => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [terms, setTerms] = useState<{ id: string; name: string; category: string }[]>([]);
  const [indicators, setIndicators] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // fetch taxonomy
      const { data: termsData, error: taxErr } = await supabase
        .from("taxonomy_terms")
        .select("id, category, name")
        .order("category");
      if (taxErr) console.error(taxErr);
      else setTerms(termsData || []);

      // fetch indicators from catalogue
      let { data: indData, error: indErr } = await supabase
        .from("indicator_catalogue")
        .select("id, name")
        .order("name");
      if (indErr || !indData?.length) {
        const fallback = await supabase.from("indicators").select("id, name").order("name");
        indData = fallback.data;
      }
      setIndicators(indData || []);
      setLoading(false);
    })();
  }, []);

  const filteredTerms = selectedCategory
    ? terms.filter((t) => t.category === selectedCategory)
    : terms;

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 3 – Link Dataset to Indicator
        </h2>
        <p className="text-sm mb-4">
          Choose a taxonomy category and indicator that best describes this dataset.
        </p>

        {loading ? (
          <div className="text-gray-500">Loading taxonomy and indicators…</div>
        ) : (
          <>
            <label className="text-sm">Taxonomy Category</label>
            <select
              className="border rounded p-2 w-full mb-3"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {Array.from(new Set(terms.map((t) => t.category))).map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>

            <label className="text-sm">Taxonomy Term</label>
            <select
              className="border rounded p-2 w-full mb-3"
              value={meta.taxonomy_id || ""}
              onChange={(e) => setMeta({ ...meta, taxonomy_id: e.target.value })}
            >
              <option value="">Select term…</option>
              {filteredTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <label className="text-sm">Indicator</label>
            <select
              className="border rounded p-2 w-full"
              value={meta.indicator_id || ""}
              onChange={(e) => setMeta({ ...meta, indicator_id: e.target.value })}
            >
              <option value="">Select indicator…</option>
              {indicators.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={back} className="px-3 py-2 rounded border">Back</button>
        <button
          onClick={next}
          disabled={!meta.indicator_id}
          className="px-4 py-2 rounded text-white"
          style={{ background: meta.indicator_id ? "var(--gsc-blue)" : "var(--gsc-light-gray)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
