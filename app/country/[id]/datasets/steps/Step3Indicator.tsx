"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Indicator = {
  id: string;
  name: string;
  code: string;
  unit: string | null;
  data_type: string | null;
};

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
  const [loading, setLoading] = useState(true);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [terms, setTerms] = useState<{ id: string; name: string; category: string | null }[]>([]);
  const [links, setLinks] = useState<{ indicator_id: string; taxonomy_id: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: termsData } = await supabase
        .from("taxonomy_terms")
        .select("id,name,category")
        .order("category", { ascending: true });

      const cats = Array.from(
        new Set((termsData ?? []).map((t) => t.category || "").filter(Boolean))
      ) as string[];
      setCategories(cats);
      setTerms((termsData ?? []) as any[]);

      const { data: ind } = await supabase
        .from("indicators")
        .select("id,name,code,unit,data_type")
        .order("name", { ascending: true });
      setIndicators((ind ?? []) as Indicator[]);

      const { data: linkData } = await supabase
        .from("indicator_taxonomy_links")
        .select("indicator_id,taxonomy_id");
      setLinks(linkData ?? []);

      setLoading(false);
    })();
  }, []);

  const filteredIndicators = useMemo(() => {
    let list = indicators;

    if (selectedTermId) {
      const allowed = new Set(
        links
          .filter((l) => l.taxonomy_id === selectedTermId)
          .map((l) => l.indicator_id)
      );
      list = list.filter((it) => allowed.has(it.id));
    } else if (selectedCategory) {
      const catTermIds = terms
        .filter((t) => t.category === selectedCategory)
        .map((t) => t.id);
      const allowed = new Set(
        links
          .filter((l) => catTermIds.includes(l.taxonomy_id))
          .map((l) => l.indicator_id)
      );
      list = list.filter((it) => allowed.has(it.id));
    }

    if (q.trim()) {
      list = list.filter((it) =>
        it.name.toLowerCase().includes(q.toLowerCase())
      );
    }

    return list;
  }, [indicators, links, terms, selectedCategory, selectedTermId, q]);

  const canContinue = !!meta.indicator_id;

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-3">
          Step 3 – Choose Indicator
        </h2>

        <div className="grid md:grid-cols-3 gap-3 mb-3">
          <label className="text-sm">
            Taxonomy Category
            <select
              className="border rounded p-2 w-full"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedTermId("");
              }}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Taxonomy Term
            <select
              className="border rounded p-2 w-full"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
            >
              <option value="">All</option>
              {terms
                .filter((t) => !selectedCategory || t.category === selectedCategory)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </label>

          <label className="text-sm">
            Search indicators
            <input
              className="border rounded p-2 w-full"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by name…"
            />
          </label>
        </div>

        <div className="rounded-xl border bg-white max-h-64 overflow-auto">
          {loading ? (
            <div className="p-3 text-gray-500">Loading…</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--gsc-light-gray)]/50 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Name</th>
                  <th className="px-2 py-1 text-left">Code</th>
                  <th className="px-2 py-1 text-left">Unit</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {filteredIndicators.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="px-2 py-1">{it.name}</td>
                    <td className="px-2 py-1">{it.code}</td>
                    <td className="px-2 py-1">{it.unit ?? "—"}</td>
                    <td className="px-2 py-1">
                      <button
                        className="px-2 py-1 rounded text-white"
                        style={{
                          background:
                            meta.indicator_id === it.id
                              ? "var(--gsc-green)"
                              : "var(--gsc-blue)",
                        }}
                        onClick={() => setMeta({ ...meta, indicator_id: it.id })}
                      >
                        {meta.indicator_id === it.id ? "Selected" : "Select"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredIndicators.length === 0 && (
                  <tr>
                    <td
                      className="px-2 py-2 text-gray-500"
                      colSpan={4}
                    >
                      No indicators match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-3 py-2 rounded border">
          Back
        </button>
        <button
          onClick={next}
          disabled={!canContinue}
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
