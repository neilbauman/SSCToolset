"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { saveDataset, DatasetType, MetaInput, GradientRow, Adm0Row, CategoricalRow, CategoryMapItem } from "@/lib/datasets/saveDataset";
import { Upload, CheckCircle2, ArrowRight, ArrowLeft, FileSpreadsheet, ListChecks } from "lucide-react";

// NOTE: CSV parsing uses a tiny inline parser for robustness;
// XLSX is supported via dynamic import (optional dependency).
type ParsedTable = { headers: string[]; rows: Record<string, string>[] };

type AdminUnit = { level: string; pcode: string; name: string };

function parseCsv(text: string): ParsedTable {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(","); // simple CSV; enhance if needed
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = (parts[idx] ?? "").trim()));
    rows.push(obj);
  }
  return { headers, rows };
}

async function parseFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    return parseCsv(text);
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    try {
      const XLSX = await import("xlsx"); // optional dep; ensure installed if you need xlsx
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const first = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(first, { defval: "" });
      if (json.length === 0) return { headers: [], rows: [] };
      const headers = Object.keys(json[0] ?? {});
      const rows = json.map((r) => {
        const obj: Record<string, string> = {};
        headers.forEach((h) => (obj[h] = String(r[h] ?? "").trim()));
        return obj;
      });
      return { headers, rows };
    } catch (e) {
      throw new Error("XLSX parsing not available. Install 'xlsx' or upload CSV.");
    }
  }
  throw new Error("Unsupported file type. Upload CSV or XLSX.");
}

function StepShell({
  children,
  title,
  onBack,
  onNext,
  nextDisabled,
}: {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="rounded-2xl border p-4">{children}</div>
      <div className="flex items-center justify-between">
        <button
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-gray-50"
          onClick={onBack}
          disabled={!onBack}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
          onClick={onNext}
          disabled={!!nextDisabled}
          type="button"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function DatasetWizard({ params }: { params: { id: string } }) {
  const countryIso = params.id.toUpperCase();

  // shared meta
  const [datasetType, setDatasetType] = useState<DatasetType>("gradient");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [unit, setUnit] = useState<string>("");
  const [adminLevel, setAdminLevel] = useState<string>("ADM3");
  const [dataType, setDataType] = useState<string>("numeric");     // numeric | percentage | categorical
  const [dataFormat, setDataFormat] = useState<string>("numeric"); // numeric | text
  const [indicatorId, setIndicatorId] = useState<string>("");

  // admin units cache
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);

  // step control
  const [step, setStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // file/rows state
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedTable>({ headers: [], rows: [] });

  // mapping for gradient
  const [joinField, setJoinField] = useState<string>("");
  const [valueField, setValueField] = useState<string>("");

  // mapping for categorical
  const [categoryFields, setCategoryFields] = useState<string[]>([]);
  const [categoryMap, setCategoryMap] = useState<CategoryMapItem[]>([]);

  // adm0 value
  const [adm0Value, setAdm0Value] = useState<string>("");

  const steps = useMemo(() => {
    if (datasetType === "adm0") return ["Meta", "ADM0 Value", "Indicator", "Save"];
    if (datasetType === "categorical")
      return ["Meta", "Upload & Map", "Category Scores", "Indicator", "Save"];
    return ["Meta", "Upload & Map", "Indicator", "Save"]; // gradient
  }, [datasetType]);

  useEffect(() => {
    // load admin units for selected level (join validation & preview)
    (async () => {
      const { data, error } = await supabase
        .from("admin_units")
        .select("level,pcode,name")
        .eq("level", adminLevel)
        .order("pcode");
      if (!error && data) setAdminUnits(data as AdminUnit[]);
    })();
  }, [adminLevel]);

  const next = async () => {
    setErrorMsg("");
    try {
      // guard mandatory fields per step/type
      if (steps[step] === "Meta") {
        if (!title || !adminLevel) throw new Error("Title and admin level are required.");
        if (datasetType === "adm0") {
          if (adminLevel !== "ADM0") throw new Error("ADM0 dataset must use admin_level = ADM0.");
          if (!dataFormat) throw new Error("Choose data format (numeric/text).");
        }
      }

      if (steps[step] === "Upload & Map") {
        if (!file) throw new Error("Upload a CSV/XLSX file first.");
        if (!joinField) throw new Error("Select the join (admin_pcode) column.");
        if (datasetType === "gradient" && !valueField)
          throw new Error("Select the numeric value column.");
        if (datasetType === "categorical" && categoryFields.length === 0)
          throw new Error("Select at least one category column.");
      }

      if (steps[step] === "ADM0 Value") {
        if (!adm0Value || isNaN(Number(adm0Value))) {
          throw new Error("Enter a numeric ADM0 value.");
        }
      }

      if (steps[step] === "Category Scores") {
        if (categoryMap.length === 0)
          throw new Error("Define category scores (at least one).");
      }

      if (steps[step] === "Save") {
        setLoading(true);

        // Compose meta
        const meta: MetaInput = {
          title,
          country_iso: countryIso,
          admin_level: adminLevel,
          data_type: dataType,
          data_format: dataFormat,
          dataset_type: datasetType,
          year: year === "" ? null : Number(year),
          unit: unit || null,
          upload_type: file ? (file.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx") : "manual",
          join_field: joinField || null,
          indicator_id: indicatorId || null,
        };

        // Compose rows by datasetType
        if (datasetType === "adm0") {
          const rows: Adm0Row[] = [
            {
              admin_pcode: "ADM0",
              admin_level: "ADM0",
              value: Number(adm0Value),
              unit: unit || null,
            },
          ];
          const { dataset_id } = await saveDataset(meta, rows);
          window.location.href = `/country/${countryIso}/datasets?page=1&saved=${dataset_id}`;
          return;
        }

        if (datasetType === "gradient") {
          const auSet = new Set(adminUnits.map((u) => u.pcode));
          const rows: GradientRow[] = parsed.rows
            .map((r) => {
              const pcode = r[joinField]?.trim();
              const raw = r[valueField]?.replace(/,/g, "");
              const val = Number(raw);
              if (!pcode || !auSet.has(pcode)) return null;
              if (Number.isNaN(val)) return null;
              return {
                admin_pcode: pcode,
                admin_level: adminLevel,
                value: val,
                unit: unit || null,
              } as GradientRow;
            })
            .filter(Boolean) as GradientRow[];

          const { dataset_id } = await saveDataset(meta, rows);
          window.location.href = `/country/${countryIso}/datasets?page=1&saved=${dataset_id}`;
          return;
        }

        if (datasetType === "categorical") {
          // Turn each selected category column into (admin, category) rows
          const auSet = new Set(adminUnits.map((u) => u.pcode));
          const rows: CategoricalRow[] = [];
          for (const r of parsed.rows) {
            const pcode = r[joinField]?.trim();
            if (!pcode || !auSet.has(pcode)) continue;
            for (const c of categoryFields) {
              const label = c.trim();
              // Data cell may contain 0/1, Y/N, or numeric; not required for score mapping
              rows.push({
                admin_pcode: pcode,
                admin_level: adminLevel,
                category_code: label,
                category_label: label,
                category_score:
                  categoryMap.find((m) => m.label === label)?.score ?? null,
              });
            }
          }

          const { dataset_id } = await saveDataset(meta, rows, categoryMap);
          window.location.href = `/country/${countryIso}/datasets?page=1&saved=${dataset_id}`;
          return;
        }
      }

      setStep((s) => Math.min(s + 1, steps.length - 1));
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const onFile = async (f: File) => {
    setErrorMsg("");
    setFile(f);
    const table = await parseFile(f);
    setParsed(table);
  };

  // Build category map defaults from selected headers
  useEffect(() => {
    if (datasetType !== "categorical") return;
    const map = categoryFields.map<CategoryMapItem>((label) => ({
      code: label,
      label,
      score: null,
    }));
    setCategoryMap(map);
  }, [datasetType, categoryFields]);

  const headerOptions = parsed.headers;

  return (
    <SidebarLayout>
      <Breadcrumbs
        items={[
          { label: "Countries", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Datasets", href: `/country/${countryIso}/datasets` },
          { label: "Add Dataset" },
        ]}
      />
      <div className="space-y-6">
        <div className="rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5" />
            <div className="text-sm text-gray-600">
              Step {step + 1} of {steps.length}: <span className="font-medium">{steps[step]}</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* STEP: Meta */}
        {steps[step] === "Meta" && (
          <StepShell
            title="Dataset details"
            onNext={next}
            nextDisabled={!title || !adminLevel}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Dataset Type</label>
                <div className="mt-2 flex gap-3">
                  {(["adm0", "gradient", "categorical"] as DatasetType[]).map((t) => (
                    <label key={t} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="dtype"
                        value={t}
                        checked={datasetType === t}
                        onChange={() => setDatasetType(t)}
                      />
                      <span className="uppercase">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Title</label>
                <input
                  className="mt-2 w-full rounded-xl border p-2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Phil Poverty Rate - ADM3"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Admin Level</label>
                <select
                  className="mt-2 w-full rounded-xl border p-2"
                  value={adminLevel}
                  onChange={(e) => setAdminLevel(e.target.value)}
                >
                  {["ADM0", "ADM1", "ADM2", "ADM3"].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Year (optional)</label>
                <input
                  className="mt-2 w-full rounded-xl border p-2"
                  value={year}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^[0-9]{0,4}$/.test(v)) setYear(v as any);
                  }}
                  placeholder="2020"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Data Type</label>
                <select
                  className="mt-2 w-full rounded-xl border p-2"
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                >
                  <option value="numeric">numeric</option>
                  <option value="percentage">percentage</option>
                  <option value="categorical">categorical</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Data Format</label>
                <select
                  className="mt-2 w-full rounded-xl border p-2"
                  value={dataFormat}
                  onChange={(e) => setDataFormat(e.target.value)}
                >
                  <option value="numeric">numeric</option>
                  <option value="text">text</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Unit (optional)</label>
                <input
                  className="mt-2 w-full rounded-xl border p-2"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="%, pple/HH, etc."
                />
              </div>
            </div>
          </StepShell>
        )}

        {/* STEP: ADM0 Value */}
        {steps[step] === "ADM0 Value" && (
          <StepShell title="Enter ADM0 Value" onBack={back} onNext={next}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Value</label>
                <input
                  className="mt-2 w-full rounded-xl border p-2"
                  value={adm0Value}
                  onChange={(e) => setAdm0Value(e.target.value)}
                  placeholder="e.g., 5.1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Unit (optional)</label>
                <input
                  className="mt-2 w-full rounded-xl border p-2"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pple/HH or %"
                />
              </div>
            </div>
          </StepShell>
        )}

        {/* STEP: Upload & Map */}
        {steps[step] === "Upload & Map" && (
          <StepShell title="Upload and column mapping" onBack={back} onNext={next}>
            <div className="grid gap-4">
              <label className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload CSV/XLSX
              </label>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />

              {parsed.headers.length > 0 && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">
                        Join field (admin_pcode)
                      </label>
                      <select
                        className="mt-2 w-full rounded-xl border p-2"
                        value={joinField}
                        onChange={(e) => setJoinField(e.target.value)}
                      >
                        <option value="">Select column</option>
                        {headerOptions.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    {datasetType === "gradient" && (
                      <div>
                        <label className="text-sm font-medium">Value column</label>
                        <select
                          className="mt-2 w-full rounded-xl border p-2"
                          value={valueField}
                          onChange={(e) => setValueField(e.target.value)}
                        >
                          <option value="">Select numeric column</option>
                          {headerOptions.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {datasetType === "categorical" && (
                      <div>
                        <label className="text-sm font-medium">Category columns</label>
                        <div className="mt-2 grid max-h-48 grid-cols-1 gap-2 overflow-auto rounded-xl border p-2">
                          {headerOptions.map((h) => (
                            <label key={h} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={categoryFields.includes(h)}
                                onChange={(e) => {
                                  setCategoryFields((prev) =>
                                    e.target.checked
                                      ? [...prev, h]
                                      : prev.filter((x) => x !== h)
                                  );
                                }}
                              />
                              <span>{h}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border p-3 text-sm">
                    <div className="mb-2 font-medium">Preview (first 5 rows)</div>
                    <div className="overflow-auto">
                      <table className="min-w-full text-left text-xs">
                        <thead>
                          <tr>
                            {parsed.headers.slice(0, 10).map((h) => (
                              <th key={h} className="border-b px-2 py-1">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.rows.slice(0, 5).map((r, idx) => (
                            <tr key={idx}>
                              {parsed.headers.slice(0, 10).map((h) => (
                                <td key={h} className="border-b px-2 py-1">
                                  {r[h]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </StepShell>
        )}

        {/* STEP: Category Scores */}
        {steps[step] === "Category Scores" && (
          <StepShell title="Define category scores" onBack={back} onNext={next}>
            <div className="rounded-xl border p-3">
              <div className="mb-2 text-sm text-gray-700">
                Assign a score to each category label. Scores can be changed later.
              </div>
              <div className="grid gap-3">
                {categoryMap.map((m, i) => (
                  <div key={m.label} className="grid grid-cols-1 items-center gap-3 md:grid-cols-3">
                    <div className="text-sm">{m.label}</div>
                    <input
                      className="w-full rounded-xl border p-2"
                      type="text"
                      inputMode="decimal"
                      value={m.score ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        setCategoryMap((prev) => {
                          const cp = [...prev];
                          cp[i] = {
                            ...cp[i],
                            score: v === "" ? null : Number(v),
                          };
                          return cp;
                        });
                      }}
                      placeholder="e.g., 1, 2, 3..."
                    />
                    <div className="text-xs text-gray-500">
                      code: <span className="font-mono">{m.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </StepShell>
        )}

        {/* STEP: Indicator (optional minimal) */}
        {steps[step] === "Indicator" && (
          <StepShell title="Link indicator (optional)" onBack={back} onNext={next}>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Indicator ID (optional)</label>
                <input
                  className="mt-2 w-full rounded-xl border p-2"
                  value={indicatorId}
                  onChange={(e) => setIndicatorId(e.target.value)}
                  placeholder="UUID from indicator_catalogue (optional)"
                />
              </div>
              <div className="text-xs text-gray-600">
                You can create or refine indicator mapping later. For ADM0,
                this step can be skipped safely.
              </div>
            </div>
          </StepShell>
        )}

        {/* STEP: Save */}
        {steps[step] === "Save" && (
          <div className="rounded-2xl border p-6">
            <div className="mb-4 flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <div className="font-medium">Ready to save</div>
            </div>
            <div className="mb-4 text-sm">
              Click <b>Save</b> to write dataset rows to Supabase and return to the dataset list.
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
              onClick={next}
              disabled={loading}
            >
              <ListChecks className="h-4 w-4" />
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
