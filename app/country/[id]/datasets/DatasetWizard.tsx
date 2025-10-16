"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Plus,
  Search,
  Tag,
} from "lucide-react";
import TaxonomyPicker from "@/app/configuration/taxonomy/TaxonomyPicker";
import CreateIndicatorInlineModal from "@/components/country/CreateIndicatorInlineModal";

const FIELD =
  "w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]";
const LABEL =
  "block text-xs font-medium text-[color:var(--gsc-gray)] mb-1";
const BTN =
  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
const BTN_PRIMARY = `${BTN} bg-[color:var(--gsc-red)] text-white hover:opacity-90 disabled:opacity-50`;
const BTN_SECONDARY = `${BTN} border hover:bg-gray-50`;

type Props = {
  countryIso: string;
  onClose: () => void;
  onSaved: () => void;
};

type IndicatorLite = {
  id: string;
  name: string;
  data_type: "numeric" | "categorical" | null;
  description?: string | null;
};

export default function DatasetWizard({ countryIso, onClose, onSaved }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Metadata
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [adminLevel, setAdminLevel] = useState("ADM2");
  const [type, setType] = useState<"numeric" | "categorical">("numeric");

  // File & parsing
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [joinColumn, setJoinColumn] = useState<string>("pcode"); // admin pcode column
  const [valueColumn, setValueColumn] = useState<string>("value"); // numeric or category column

  // Category mapping (definition only — no scoring here)
  const [categoryColumn, setCategoryColumn] = useState<string>("value");
  const [categoryMap, setCategoryMap] = useState<{ code: string; label: string }[]>([]);

  // Indicator & taxonomy (semantic definition)
  const [taxonomyIds, setTaxonomyIds] = useState<string[]>([]);
  const [indicatorQuery, setIndicatorQuery] = useState("");
  const [indicatorList, setIndicatorList] = useState<IndicatorLite[]>([]);
  const [indicatorId, setIndicatorId] = useState<string | null>(null);
  const [createIndicatorOpen, setCreateIndicatorOpen] = useState(false);

  const next = () => setStep((s) => (s < 5 ? ((s + 1) as any) : s));
  const prev = () => setStep((s) => (s > 1 ? ((s - 1) as any) : s));

  // Parse CSV
  async function parseCSV(f: File) {
    return new Promise<{ headers: string[]; rows: any[] }>((resolve, reject) => {
      Papa.parse(f, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (res) => {
          const data = (res.data as any[]).filter(Boolean);
          const hdrs = res.meta.fields ?? (data[0] ? Object.keys(data[0]) : []);
          resolve({ headers: hdrs, rows: data.slice(0, 200) }); // preview subset
        },
        error: reject,
      });
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const parsed = await parseCSV(f);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    // Guess columns when possible
    const lower = parsed.headers.map((h) => h.toLowerCase());
    if (lower.includes("pcode")) setJoinColumn(parsed.headers[lower.indexOf("pcode")]);
    if (lower.includes("value")) {
      setValueColumn(parsed.headers[lower.indexOf("value")]);
      setCategoryColumn(parsed.headers[lower.indexOf("value")]);
    } else if (parsed.headers.length) {
      setValueColumn(parsed.headers[0]);
      setCategoryColumn(parsed.headers[0]);
    }
  }

  // Auto-detect unique categories from the chosen category column
  function detectCategories() {
    if (!rows.length || !categoryColumn) {
      setCategoryMap([]);
      return;
    }
    const uniq = Array.from(
      new Set(
        rows
          .map((r) => (r[categoryColumn] != null ? String(r[categoryColumn]).trim() : ""))
          .filter((v) => v.length > 0)
      )
    ).sort();
    setCategoryMap(uniq.map((code) => ({ code, label: code })));
  }

  // Fetch indicators (filtered by taxonomy client-side)
  async function searchIndicators() {
    const { data, error } = await supabase
      .from("indicator_catalogue")
      .select("id,name,data_type,description")
      .order("name", { ascending: true });
    if (error) return;
    let list: IndicatorLite[] = (data ?? []) as any;

    // simple text filter
    if (indicatorQuery.trim()) {
      const q = indicatorQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q)
      );
    }

    // Optional taxonomy awareness: highlight those that already have links to selected taxonomy.
    // We’ll just keep it simple here and present all; a future enhancement can score/rank by taxonomy overlap.

    setIndicatorList(list);
  }

  useEffect(() => {
    if (step === 4) searchIndicators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Save to Supabase
  async function saveAll() {
    setBusy(true);
    setError(null);
    try {
      // 1) dataset_metadata
      const { data: meta, error: metaErr } = await supabase
        .from("dataset_metadata")
        .insert({
          title,
          description: desc,
          year: year === "" ? null : Number(year),
          admin_level: adminLevel,
          data_type: type,
          country_iso: countryIso,
          indicator_id: indicatorId ?? null, // keep a direct reference if your table has this column
        })
        .select()
        .single();
      if (metaErr) throw metaErr;

      const datasetId = meta.id as string;

      // 2) Link dataset ↔ indicator via linker table (keeps compatibility with existing flows)
      if (indicatorId) {
        await supabase
          .from("catalogue_indicator_links")
          .insert({ dataset_id: datasetId, indicator_id: indicatorId });
      }

      // 3) Values
      if (type === "numeric") {
        const rowsToInsert = rows
          .filter((r) => r[joinColumn] != null && r[valueColumn] != null)
          .map((r) => ({
            dataset_id: datasetId,
            admin_pcode: String(r[joinColumn]).trim(),
            admin_level: adminLevel,
            value: Number(r[valueColumn]),
          }));
        if (rowsToInsert.length) {
          const { error: vErr } = await supabase.from("dataset_values").insert(rowsToInsert);
          if (vErr) throw vErr;
        }
      } else {
        // categorical definition only (no scoring)
        if (!categoryMap.length) {
          throw new Error("No categories defined. Click 'Detect' to infer from your data, then confirm.");
        }

        // 3a) Persist mapping: code → label
        const mappings = categoryMap.map((m) => ({
          dataset_id: datasetId,
          code: m.code,
          label: m.label,
          score: null, // scoring is instance-level; leave null here
        }));
        if (mappings.length) {
          const { error: mErr } = await supabase.from("dataset_category_maps").insert(mappings);
          if (mErr) throw mErr;
        }

        // 3b) Persist categorical values per admin row
        const catRows = rows
          .filter((r) => r[joinColumn] != null && r[categoryColumn] != null)
          .map((r) => {
            const code = String(r[categoryColumn]).trim();
            const mapRow = categoryMap.find((m) => m.code === code);
            return {
              dataset_id: datasetId,
              admin_pcode: String(r[joinColumn]).trim(),
              admin_level: adminLevel,
              time_value: null,
              category_code: code,
              category_label: mapRow?.label ?? code,
              category_score: null, // left null; instances may supply hazard-specific scoring later
            };
          });
        if (catRows.length) {
          const { error: cErr } = await supabase.from("dataset_values_cat").insert(catRows);
          if (cErr) throw cErr;
        }
      }

      setStep(5);
      onSaved();
    } catch (e: any) {
      setError(e?.message || "Failed to save dataset.");
    } finally {
      setBusy(false);
    }
  }

  const canNextFrom1 =
    !!title && !!adminLevel && (type === "numeric" || type === "categorical");
  const canNextFrom2 = !!file && rows.length > 0 && !!joinColumn && !!valueColumn;
  const canSave =
    (type === "numeric" && rows.length > 0) ||
    (type === "categorical" && rows.length > 0 && categoryMap.length > 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
            Add Dataset
          </h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Step indicator */}
          <div className="text-xs text-gray-500">Step {step} / 5</div>

          {/* STEP 1 — Metadata */}
          {step === 1 && (
            <section className="space-y-3">
              <div>
                <label className={LABEL}>Title *</label>
                <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Description</label>
                <textarea
                  className={FIELD}
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className={LABEL}>Year</label>
                  <input
                    type="number"
                    className={FIELD}
                    value={year}
                    onChange={(e) =>
                      setYear(e.target.value ? Number(e.target.value) : "")
                    }
                  />
                </div>
                <div>
                  <label className={LABEL}>Admin Level</label>
                  <select
                    className={FIELD}
                    value={adminLevel}
                    onChange={(e) => setAdminLevel(e.target.value)}
                  >
                    {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Dataset Type</label>
                  <select
                    className={FIELD}
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                  >
                    <option value="numeric">Numeric</option>
                    <option value="categorical">Categorical</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* STEP 2 — Upload & Preview */}
          {step === 2 && (
            <section className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>CSV File</label>
                  <input type="file" accept=".csv" className="text-sm" onChange={handleFile} />
                  <p className="text-xs text-gray-500 mt-1">
                    Expected columns typically include <code>pcode</code> and{" "}
                    <code>value</code>. You can adjust which columns are used below.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL}>Join Column (Admin Pcode)</label>
                    <select
                      className={FIELD}
                      value={joinColumn}
                      onChange={(e) => setJoinColumn(e.target.value)}
                    >
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>
                      {type === "numeric" ? "Value Column" : "Category Value Column"}
                    </label>
                    <select
                      className={FIELD}
                      value={valueColumn}
                      onChange={(e) => {
                        setValueColumn(e.target.value);
                        if (type === "categorical") setCategoryColumn(e.target.value);
                      }}
                    >
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {!!rows.length && (
                <div className="border rounded p-2 max-h-60 overflow-auto text-xs">
                  <div className="text-[11px] text-gray-500 mb-2">
                    Preview (first {Math.min(rows.length, 10)} rows)
                  </div>
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        {headers.map((k) => (
                          <th key={k} className="text-left px-2 py-1 border-b">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 10).map((r, i) => (
                        <tr key={i} className="odd:bg-gray-50">
                          {headers.map((k) => (
                            <td key={k} className="px-2 py-1 border-b">
                              {String(r[k] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* STEP 3 — Category Definition (only for categorical) */}
          {step === 3 && type === "categorical" && (
            <section className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className={LABEL}>Category Column</label>
                  <select
                    className={FIELD}
                    value={categoryColumn}
                    onChange={(e) => setCategoryColumn(e.target.value)}
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex items-end">
                  <button className={BTN_SECONDARY} onClick={detectCategories}>
                    Detect from data
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Info className="w-4 h-4" />
                The system will infer unique category codes from the selected column. Rename labels as needed.
              </div>

              <div className="space-y-2">
                {categoryMap.map((m, i) => (
                  <div key={i} className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <input className={FIELD} value={m.code} readOnly />
                    <input
                      className={FIELD}
                      placeholder="Label"
                      value={m.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        const cm = [...categoryMap];
                        cm[i] = { ...cm[i], label: v };
                        setCategoryMap(cm);
                      }}
                    />
                    <div className="hidden md:block" />
                  </div>
                ))}
                {!categoryMap.length && (
                  <div className="text-xs text-gray-500">No categories detected yet.</div>
                )}
              </div>
            </section>
          )}

          {/* STEP 4 — Indicator & Taxonomy Definition */}
          {step === 4 && (
            <section className="space-y-4">
              <div>
                <label className={LABEL}>Taxonomy Classification</label>
                <TaxonomyPicker selectedIds={taxonomyIds} onChange={setTaxonomyIds} />
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className={LABEL}>Link to existing Indicator</label>
                  <div className="flex items-center gap-2">
                    <input
                      className={FIELD}
                      placeholder="Search indicators…"
                      value={indicatorQuery}
                      onChange={(e) => setIndicatorQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchIndicators()}
                    />
                    <button className={BTN_SECONDARY} onClick={searchIndicators}>
                      <Search className="w-4 h-4" /> Search
                    </button>
                  </div>

                  <div className="mt-2 max-h-48 overflow-auto border rounded">
                    {indicatorList.map((it) => (
                      <div
                        key={it.id}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                          indicatorId === it.id ? "bg-gray-100" : ""
                        }`}
                        onClick={() => setIndicatorId(it.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{it.name}</div>
                          <span className="text-[11px] rounded bg-gray-100 px-2 py-[1px] text-gray-600">
                            {it.data_type ?? "—"}
                          </span>
                        </div>
                        {it.description && (
                          <div className="text-xs text-gray-500 mt-0.5">{it.description}</div>
                        )}
                      </div>
                    ))}
                    {!indicatorList.length && (
                      <div className="px-3 py-2 text-xs text-gray-500">No indicators to show.</div>
                    )}
                  </div>
                </div>

                <div className="flex items-end">
                  <button className={BTN_SECONDARY} onClick={() => setCreateIndicatorOpen(true)}>
                    <Plus className="w-4 h-4" /> Create new
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-gray-500 flex items-center gap-1">
                <Tag className="w-4 h-4" />
                If no indicator fits, create one with the same taxonomy so it’s discoverable later.
              </div>

              <CreateIndicatorInlineModal
                open={createIndicatorOpen}
                onClose={() => setCreateIndicatorOpen(false)}
                taxonomyDefault={taxonomyIds}
                onCreated={(newId) => {
                  setIndicatorId(newId);
                  setCreateIndicatorOpen(false);
                }}
              />
            </section>
          )}

          {/* STEP 5 — Done */}
          {step === 5 && (
            <section className="text-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4" /> Dataset saved successfully.
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-5 py-3 bg-gray-50">
          <button className={BTN_SECONDARY} onClick={step === 1 ? onClose : prev}>
            <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 && (
            <button className={BTN_PRIMARY} onClick={next} disabled={busy || (step === 1 && !canNextFrom1) || (step === 2 && !canNextFrom2)}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 4 && (
            <button className={BTN_PRIMARY} onClick={saveAll} disabled={busy || !canSave}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
