"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

/** Grouped dataset option */
type DsOpt = { src: "core" | "other" | "derived"; title: string; key: string };

/** Props unchanged from before */
export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
}) {
  // ── UI state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [showTax, setShowTax] = useState(true);

  // ── datasets
  const [options, setOptions] = useState<DsOpt[]>([]);
  const [aKey, setAKey] = useState("");
  const [bKey, setBKey] = useState("");
  const [useScalar, setUseScalar] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);

  // ── preview rows
  const [peekA, setPeekA] = useState<any[]>([]);
  const [peekB, setPeekB] = useState<any[]>([]);

  // ── math
  const [method, setMethod] = useState<"multiply" | "ratio" | "sum" | "difference">("ratio");
  const [decimals, setDecimals] = useState<number>(0);

  // ── taxonomy (category->terms), selections
  const [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [selCats, setSelCats] = useState<string[]>([]);
  const [selTerms, setSelTerms] = useState<string[]>([]);

  // ────────────────────────────────────────────────────────────────────────────
  // Load dataset lists + taxonomy, grouped as CORE / OTHER / DERIVED
  useEffect(() => {
    if (!open) return;
    (async () => {
      const next: DsOpt[] = [];

      // CORE (always present)
      next.push({ src: "core", title: "Administrative Boundaries", key: "admin_units" });
      next.push({ src: "core", title: "Population Data", key: "population_data" });
      next.push({ src: "core", title: "GIS Features", key: "gis_features" });

      // OTHER (metadata table; be forgiving about 'source' values)
      const { data: meta } = await supabase
        .from("dataset_metadata")
        .select("title,table_name,source,country_iso")
        .or(`country_iso.is.null,country_iso.eq.${countryIso}`);

      meta?.forEach((m) => {
        // exclude things already classed as core/derived
        const src = (m.source || "").toLowerCase();
        if (["core", "derived"].includes(src)) return;
        if (!m.table_name) return;
        next.push({ src: "other", title: m.title || m.table_name, key: m.table_name });
      });

      // DERIVED (in your unified table)
      const { data: derived } = await supabase
        .from("derived_datasets")
        .select("id,title,country_iso")
        .eq("country_iso", countryIso);

      derived?.forEach((d) => next.push({ src: "derived", title: d.title, key: d.id }));

      setOptions(next);

      // taxonomy list
      const { data: tax } = await supabase.from("taxonomy_terms").select("category,name");
      const grouped = (tax || []).reduce((acc: Record<string, string[]>, t: any) => {
        acc[t.category] = acc[t.category] || [];
        acc[t.category].push(t.name);
        return acc;
      }, {});
      setTaxonomy(grouped);
    })();
  }, [open, countryIso]);

  // reset when dialog re-opens
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDescription("");
    setAKey("");
    setBKey("");
    setUseScalar(false);
    setScalarB(1);
    setMethod("ratio");
    setDecimals(0);
    setSelCats([]);
    setSelTerms([]);
    setPeekA([]);
    setPeekB([]);
  }, [open]);

  // Group for dropdown headings
  const grouped = useMemo(
    () => ({
      core: options.filter((o) => o.src === "core"),
      other: options.filter((o) => o.src === "other"),
      derived: options.filter((o) => o.src === "derived"),
    }),
    [options]
  );

  // ────────────────────────────────────────────────────────────────────────────
  // Peek helpers
  async function peek(which: "A" | "B") {
    const k = which === "A" ? aKey : bKey;
    if (!k) return;
    // For derived rows you’d normally RPC; for now the same 3 columns work on your core/other tables.
    const { data, error } = await supabase.from(k).select("pcode,name,population").limit(10);
    if (error) return alert(error.message);
    which === "A" ? setPeekA(data || []) : setPeekB(data || []);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Save
  async function save() {
    if (!title.trim()) return alert("Please enter a title.");
    if (!aKey) return alert("Select Dataset A.");
    if (!useScalar && !bKey) return alert("Select Dataset B or toggle scalar.");

    const { error } = await supabase.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: title.trim(),
      p_description: description || null,
      p_admin_level: "ADM4",
      p_table_a: aKey,
      p_table_b: useScalar ? null : bKey || null,
      p_col_a: "population",
      p_col_b: useScalar ? null : "population",
      p_use_scalar_b: useScalar,
      p_scalar_b_val: useScalar ? Number(scalarB) : null,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: selCats,
      p_taxonomy_terms: selTerms,
      p_formula: useScalar
        ? `A ${opLabel(method)} scalar(${scalarB})`
        : `A ${opLabel(method)} B`,
    });

    if (error) return alert("Save failed: " + error.message);
    alert("Saved!");
    onClose();
  }

  function opLabel(m: typeof method) {
    return m === "ratio" ? "÷" : m === "multiply" ? "×" : m === "sum" ? "+" : "−";
  }

  // ────────────────────────────────────────────────────────────────────────────
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-5xl rounded-lg shadow-lg p-4 max-h-[90vh] overflow-y-auto text-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Create Derived Dataset</h2>
          <button className="underline text-gray-600 text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Title + Description */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <input
            className="col-span-1 border rounded p-2 text-sm"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="col-span-2 border rounded p-2 text-sm"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Toggles */}
        <div className="flex gap-2 mb-3">
          <button className="border rounded px-2 py-1" onClick={() => setShowPreview((s) => !s)}>
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          <button className="border rounded px-2 py-1" onClick={() => setShowTax((s) => !s)}>
            {showTax ? "Hide Taxonomy" : "Show Taxonomy"}
          </button>
        </div>

        {/* A / B selectors */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* A */}
          <div className="border rounded p-2">
            <div className="text-xs font-medium mb-1">Dataset A</div>
            <select
              className="w-full border rounded p-1 text-xs"
              value={aKey}
              onChange={(e) => setAKey(e.target.value)}
            >
              <option value="">Select dataset...</option>
              <optgroup label="CORE">
                {grouped.core.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.title}
                  </option>
                ))}
              </optgroup>
              <optgroup label="OTHER">
                {grouped.other.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.title}
                  </option>
                ))}
              </optgroup>
              <optgroup label="DERIVED">
                {grouped.derived.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.title}
                  </option>
                ))}
              </optgroup>
            </select>
            <button className="text-blue-600 underline mt-1 text-xs" onClick={() => peek("A")}>
              Peek
            </button>
            {showPreview && peekA.length > 0 && (
              <div className="border mt-1 max-h-24 overflow-y-auto text-[11px]">
                {peekA.map((r, i) => (
                  <div key={i} className="grid grid-cols-3 px-2 py-0.5 border-b">
                    <span>{r.pcode}</span>
                    <span>{r.name}</span>
                    <span>{r.population}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B */}
          <div className="border rounded p-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Dataset B</span>
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={useScalar}
                  onChange={(e) => setUseScalar(e.target.checked)}
                />
                Use scalar
              </label>
            </div>

            {!useScalar ? (
              <>
                <select
                  className="w-full border rounded p-1 text-xs"
                  value={bKey}
                  onChange={(e) => setBKey(e.target.value)}
                >
                  <option value="">Select dataset...</option>
                  <optgroup label="CORE">
                    {grouped.core.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="OTHER">
                    {grouped.other.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.title}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="DERIVED">
                    {grouped.derived.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.title}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <button className="text-blue-600 underline mt-1 text-xs" onClick={() => peek("B")}>
                  Peek
                </button>
                {showPreview && peekB.length > 0 && (
                  <div className="border mt-1 max-h-24 overflow-y-auto text-[11px]">
                    {peekB.map((r, i) => (
                      <div key={i} className="grid grid-cols-3 px-2 py-0.5 border-b">
                        <span>{r.pcode}</span>
                        <span>{r.name}</span>
                        <span>{r.population}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Scalar B:</span>
                <input
                  type="number"
                  className="border rounded p-1 text-xs w-24"
                  value={scalarB}
                  onChange={(e) => setScalarB(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        </div>

        {/* Math row */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs">Math:</label>
          <select className="border rounded p-1 text-xs" value={method} onChange={(e) => setMethod(e.target.value as any)}>
            <option value="multiply">multiply</option>
            <option value="ratio">ratio</option>
            <option value="sum">sum</option>
            <option value="difference">difference</option>
          </select>
          <label className="text-xs ml-2">Decimals:</label>
          <input
            type="number"
            className="border rounded p-1 text-xs w-16"
            value={decimals}
            onChange={(e) => setDecimals(parseInt(e.target.value || "0", 10))}
            min={0}
            max={6}
          />
          <span className="text-xs text-gray-500">
            Derived = A {opLabel(method)} {useScalar ? `scalar(${scalarB})` : "B"}
          </span>
        </div>

        {/* Taxonomy (collapsible; terms only when category is selected) */}
        {showTax && (
          <div className="border rounded p-2 mb-3 max-h-48 overflow-y-auto">
            {Object.entries(taxonomy).map(([cat, terms]) => (
              <div key={cat} className="mb-2">
                <label className="font-semibold text-xs flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selCats.includes(cat)}
                    onChange={() =>
                      setSelCats((p) => (p.includes(cat) ? p.filter((x) => x !== cat) : [...p, cat]))
                    }
                  />
                  {cat}
                </label>
                {selCats.includes(cat) && (
                  <div className="ml-4 mt-1 grid grid-cols-2 gap-1">
                    {terms.map((t) => (
                      <label key={t} className="text-xs flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={selTerms.includes(t)}
                          onChange={() =>
                            setSelTerms((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
                          }
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onClose}>
            Cancel
          </button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
