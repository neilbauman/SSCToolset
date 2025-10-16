// ==== START PART 1 ====
"use client";
import { useState, useEffect } from "react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  ChevronLeft, ChevronRight, Upload, Loader2,
  AlertTriangle, CheckCircle2, Search, Plus, Tag
} from "lucide-react";
import TaxonomyPicker from "@/app/configuration/taxonomy/TaxonomyPicker";
import CreateIndicatorInlineModal from "@/components/country/CreateIndicatorInlineModal";

type Props = { countryIso: string; onClose: () => void; onSaved: () => void };

const F =
  "w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]";
const L =
  "block text-xs font-medium text-[color:var(--gsc-gray)] mb-1";
const B = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
const P = `${B} bg-[color:var(--gsc-red)] text-white hover:opacity-90 disabled:opacity-50`;
const S = `${B} border hover:bg-gray-50`;

export default function DatasetWizard({ countryIso, onClose, onSaved }: Props) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [source, setSource] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [year, setYear] = useState<number | "">("");

  const [datasetType, setDatasetType] =
    useState<"gradient" | "categorical">("gradient");
  const [dataFormat, setDataFormat] =
    useState<"numeric" | "percentage" | "text">("numeric");
  const [adminLevel, setAdminLevel] = useState("ADM2");
  const [nationalValue, setNationalValue] = useState("");

  // File + structure
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [joinColumn, setJoinColumn] = useState("");
  const [nameColumn, setNameColumn] = useState("");
  const [categoryCols, setCategoryCols] = useState<string[]>([]);
  const [categoryMap, setCategoryMap] =
    useState<{ code: string; label: string }[]>([]);
  const [matchInfo, setMatchInfo] =
    useState<{ rate: number; missing: string[] } | null>(null);

  // taxonomy + indicator
  const [taxonomyIds, setTaxonomyIds] = useState<string[]>([]);
  const [indicatorQuery, setIndicatorQuery] = useState("");
  const [indicatorList, setIndicatorList] = useState<any[]>([]);
  const [indicatorId, setIndicatorId] = useState<string | null>(null);
  const [createIndicatorOpen, setCreateIndicatorOpen] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  async function parseCSV(f: File) {
    return new Promise<{ headers: string[]; rows: any[] }>((res, rej) =>
      Papa.parse(f, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (r) =>
          res({
            headers: r.meta.fields ?? Object.keys(r.data[0] ?? {}),
            rows: r.data.slice(0, 300),
          }),
        error: rej,
      })
    );
  }

  async function handleFile(e: any) {
    const f = e.target.files?.[0];
    if (!f) return;
    const { headers, rows } = await parseCSV(f);
    setFile(f);
    setHeaders(headers);
    setRows(rows);
    if (headers.find((h) => h.toLowerCase().includes("code")))
      setJoinColumn(headers.find((h) => h.toLowerCase().includes("code"))!);
    if (headers.find((h) => h.toLowerCase().includes("name") || h.toLowerCase().includes("muni")))
      setNameColumn(
        headers.find(
          (h) => h.toLowerCase().includes("name") || h.toLowerCase().includes("muni")
        )!
      );
  }

  function detectCategories() {
    if (!categoryCols.length) return;
    setCategoryMap(categoryCols.map((c) => ({ code: c, label: c })));
  }

  // --- New PCode validation
  async function checkPcodes() {
    if (!joinColumn || !rows.length) return;
    try {
      const { data: known } = await supabase
        .from("admin_units")
        .select("pcode")
        .eq("level", adminLevel);
      const knownSet = new Set((known ?? []).map((u: any) => String(u.pcode).trim()));
      const codes = rows
        .map((r) => String(r[joinColumn] ?? "").trim())
        .filter(Boolean);
      const found = codes.filter((c) => knownSet.has(c));
      const rate = codes.length ? Math.round((found.length / codes.length) * 100) : 0;
      const missing = codes.filter((c) => !knownSet.has(c)).slice(0, 10);
      setMatchInfo({ rate, missing });
    } catch (e) {
      console.error(e);
    }
  }

  // === UI ===
  const canNext =
    !!title && !!datasetType && !!dataFormat && !!adminLevel;
  const canSave =
    rows.length > 0 || (adminLevel === "ADM0" && !!nationalValue.trim());

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
            Add Dataset
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
          <div className="text-xs text-gray-500">Step {step}/5</div>

          {/* Step 1 */}
          {step === 1 && (
            <section className="space-y-3">
              <div>
                <label className={L}>Title *</label>
                <input className={F} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className={L}>Description</label>
                <textarea
                  className={F}
                  rows={3}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className={L}>Source</label>
                  <input className={F} value={source} onChange={(e) => setSource(e.target.value)} />
                </div>
                <div>
                  <label className={L}>Source URL</label>
                  <input
                    className={F}
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className={L}>Type</label>
                  <select
                    className={F}
                    value={datasetType}
                    onChange={(e) => setDatasetType(e.target.value as any)}
                  >
                    <option value="gradient">Gradient</option>
                    <option value="categorical">Categorical</option>
                  </select>
                </div>
                <div>
                  <label className={L}>Format</label>
                  <select
                    className={F}
                    value={dataFormat}
                    onChange={(e) => setDataFormat(e.target.value as any)}
                  >
                    <option value="numeric">Numeric</option>
                    <option value="percentage">Percentage</option>
                    <option value="text">Text</option>
                  </select>
                </div>
                <div>
                  <label className={L}>Admin Level</label>
                  <select
                    className={F}
                    value={adminLevel}
                    onChange={(e) => setAdminLevel(e.target.value)}
                  >
                    {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
              {adminLevel === "ADM0" && (
                <div>
                  <label className={L}>National Value</label>
                  <input
                    className={F}
                    value={nationalValue}
                    onChange={(e) => setNationalValue(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className={L}>Year</label>
                <input
                  type="number"
                  className={F}
                  value={year}
                  onChange={(e) =>
                    setYear(e.target.value ? Number(e.target.value) : "")
                  }
                />
              </div>
            </section>
          )}

          {/* Step 2 */}
          {step === 2 && adminLevel !== "ADM0" && (
            <section className="space-y-3">
              <div>
                <label className={L}>Upload CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  className="text-sm"
                  onChange={handleFile}
                />
              </div>
              {headers.length > 0 && (
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className={L}>Admin PCode Column</label>
                    <select
                      className={F}
                      value={joinColumn}
                      onChange={(e) => {
                        setJoinColumn(e.target.value);
                        setMatchInfo(null);
                      }}
                    >
                      {headers.map((h) => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={L}>Admin Name Column (optional)</label>
                    <select
                      className={F}
                      value={nameColumn}
                      onChange={(e) => setNameColumn(e.target.value)}
                    >
                      <option value="">None</option>
                      {headers.map((h) => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button className={S} onClick={checkPcodes}>
                Check PCode Matches
              </button>

              {matchInfo && (
                <div
                  className={`p-3 rounded text-sm border ${
                    matchInfo.rate > 90
                      ? "border-green-200 bg-green-50 text-green-700"
                      : matchInfo.rate > 40
                      ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {matchInfo.rate > 90
                    ? "✅"
                    : matchInfo.rate > 40
                    ? "⚠️"
                    : "❌"}{" "}
                  {matchInfo.rate}% of admin codes matched existing {adminLevel} units.
                  {matchInfo.missing.length > 0 && (
                    <div className="text-xs mt-1">
                      Missing examples: {matchInfo.missing.join(", ")}
                    </div>
                  )}
                </div>
              )}

              {rows.length > 0 && (
                <div className="border rounded p-2 max-h-60 overflow-auto text-xs">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        {headers.map((h) => (
                          <th
                            key={h}
                            className="text-left px-2 py-1 border-b"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 10).map((r, i) => (
                        <tr key={i} className="odd:bg-gray-50">
                          {headers.map((h) => (
                            <td key={h} className="px-2 py-1 border-b">
                              {String(r[h] ?? "")}
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
              // ==== START PART 2 ====
          {/* Step 3 */}
          {step === 3 && (
            <section className="space-y-3">
              <label className={L}>Select Category/Data Columns</label>
              <select
                multiple
                className={`${F} h-40`}
                value={categoryCols}
                onChange={(e) =>
                  setCategoryCols(
                    [...e.target.selectedOptions].map((o) => o.value)
                  )
                }
              >
                {headers
                  .filter((h) => h !== joinColumn && h !== nameColumn)
                  .map((h) => (
                    <option key={h}>{h}</option>
                  ))}
              </select>
              <button className={S} onClick={detectCategories}>
                Confirm Selection
              </button>

              {categoryMap.length > 0 && (
                <div className="border rounded p-2 text-xs">
                  <p className="font-medium mb-1">Categories:</p>
                  {categoryMap.map((c) => (
                    <div key={c.code}>{c.label}</div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <section className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className={L}>Filter by Group</label>
                  <select
                    className={F}
                    value={selectedGroup}
                    onChange={(e) => {
                      setSelectedGroup(e.target.value);
                      setSelectedTerm("");
                    }}
                  >
                    <option value="">All</option>
                    {groups.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={L}>Filter by Term</label>
                  <select
                    className={F}
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                  >
                    <option value="">All</option>
                    {terms
                      .filter(
                        (t) => !selectedGroup || t.category === selectedGroup
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={L}>Taxonomy Picker</label>
                <TaxonomyPicker
                  selectedIds={taxonomyIds}
                  onChange={setTaxonomyIds}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className={L}>Indicator</label>
                  <div className="flex items-center gap-2">
                    <input
                      className={F}
                      placeholder="Search..."
                      value={indicatorQuery}
                      onChange={(e) => setIndicatorQuery(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && searchIndicators()
                      }
                    />
                    <button className={S} onClick={searchIndicators}>
                      <Search className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-2 max-h-48 overflow-auto border rounded">
                    {indicatorList.map((it) => (
                      <div
                        key={it.id}
                        onClick={() => setIndicatorId(it.id)}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                          indicatorId === it.id ? "bg-gray-100" : ""
                        }`}
                      >
                        <div className="flex justify-between">
                          <div>{it.name}</div>
                          <span
                            className={`text-[11px] px-2 rounded ${
                              it.status === "proposed"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100"
                            }`}
                          >
                            {it.status}
                          </span>
                        </div>
                        {it.description && (
                          <div className="text-xs text-gray-500">
                            {it.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-end">
                  <button className={S} onClick={() => setCreateIndicatorOpen(true)}>
                    <Plus className="w-4 h-4" /> New
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                <Tag className="w-4 h-4" />
                Link or create an indicator (new ones are proposed for admin review).
              </p>

              <CreateIndicatorInlineModal
                open={createIndicatorOpen}
                onClose={() => setCreateIndicatorOpen(false)}
                taxonomyDefault={taxonomyIds}
                onCreated={async (id) => {
                  await supabase
                    .from("indicator_catalogue")
                    .update({ status: "proposed" })
                    .eq("id", id);
                  await Promise.all(
                    taxonomyIds.map((t) =>
                      supabase
                        .from("indicator_taxonomy_links")
                        .insert({ indicator_id: id, taxonomy_id: t })
                    )
                  );
                  setIndicatorId(id);
                  setCreateIndicatorOpen(false);
                }}
              />
            </section>
          )}
// ==== END PART 2 ====
// ==== START PART 3 ====
          {/* Step 5 */}
          {step === 5 && (
            <div className="text-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4" />
              Dataset saved.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-5 py-3 bg-gray-50">
          <button className={S} onClick={step === 1 ? onClose : prev}>
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 4 && (
            <button className={P} onClick={() => setStep(step + 1)} disabled={!canNext}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 4 && (
            <button
              className={P}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const { data: meta, error: mErr } = await supabase
                    .from("dataset_metadata")
                    .insert({
                      title,
                      description: desc,
                      source,
                      source_url: sourceUrl,
                      year: year === "" ? null : Number(year),
                      admin_level: adminLevel,
                      data_type: datasetType,
                      data_format: dataFormat,
                      country_iso: countryIso,
                      indicator_id: indicatorId ?? null,
                    })
                    .select()
                    .single();
                  if (mErr) throw mErr;
                  const id = meta.id;
                  if (indicatorId)
                    await supabase
                      .from("catalogue_indicator_links")
                      .insert({ dataset_id: id, indicator_id: indicatorId });
                  if (adminLevel === "ADM0" && nationalValue.trim()) {
                    await supabase.from("dataset_values").insert([
                      {
                        dataset_id: id,
                        admin_pcode: "ADM0",
                        admin_level: "ADM0",
                        value:
                          dataFormat === "text"
                            ? null
                            : Number(nationalValue.replace("%", "")),
                        text_value:
                          dataFormat === "text" ? nationalValue : null,
                      },
                    ]);
                    setStep(5);
                    onSaved();
                    return;
                  }
                  const d: any[] = [];
                  rows.forEach((r) => {
                    if (categoryCols.length)
                      categoryCols.forEach((c) =>
                        d.push({
                          dataset_id: id,
                          admin_pcode: String(r[joinColumn] ?? "").trim(),
                          admin_level: adminLevel,
                          category_label: c,
                          value: Number(r[c] ?? 0),
                        })
                      );
                    else {
                      const f = headers.find(
                        (h) => h !== joinColumn && h !== nameColumn
                      );
                      if (f)
                        d.push({
                          dataset_id: id,
                          admin_pcode: String(r[joinColumn] ?? "").trim(),
                          admin_level: adminLevel,
                          value: Number(r[f] ?? 0),
                        });
                    }
                  });
                  if (d.length)
                    await supabase.from("dataset_values").insert(d);
                  if (datasetType === "categorical") {
                    detectCategories();
                    const maps = categoryMap.map((m) => ({
                      dataset_id: id,
                      code: m.code,
                      label: m.label,
                      score: null,
                    }));
                    if (maps.length)
                      await supabase
                        .from("dataset_category_maps")
                        .insert(maps);
                  }
                  setStep(5);
                  onSaved();
                } catch (e: any) {
                  setError(e.message || "Save failed.");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy || !canSave}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
// ==== END PART 3 ====
