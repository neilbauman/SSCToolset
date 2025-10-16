"use client";

import { useEffect, useState } from "react";
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

export default function DatasetWizard({ countryIso, onClose, onSaved }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Metadata ────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [datasetType, setDatasetType] = useState<"gradient" | "categorical">(
    "gradient"
  );
  const [dataFormat, setDataFormat] = useState<"numeric" | "percentage" | "text">(
    "numeric"
  );
  const [adminLevel, setAdminLevel] = useState("ADM0");
  const [nationalValue, setNationalValue] = useState<string>("");

  // ─── File & data parsing ─────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [joinColumn, setJoinColumn] = useState("pcode");
  const [valueColumn, setValueColumn] = useState("value");

  // ─── Category definitions (for categorical datasets) ─────
  const [categoryColumn, setCategoryColumn] = useState("value");
  const [categoryMap, setCategoryMap] = useState<{ code: string; label: string }[]>(
    []
  );

  // ─── Indicator & taxonomy ─────────────────────────────────
  const [taxonomyIds, setTaxonomyIds] = useState<string[]>([]);
  const [indicatorQuery, setIndicatorQuery] = useState("");
  const [indicatorList, setIndicatorList] = useState<any[]>([]);
  const [indicatorId, setIndicatorId] = useState<string | null>(null);
  const [createIndicatorOpen, setCreateIndicatorOpen] = useState(false);

  const next = () => setStep((s) => (s < 5 ? ((s + 1) as any) : s));
  const prev = () => setStep((s) => (s > 1 ? ((s - 1) as any) : s));

  // ─── CSV parsing ─────────────────────────────────────────
  async function parseCSV(f: File) {
    return new Promise<{ headers: string[]; rows: any[] }>((resolve, reject) => {
      Papa.parse(f, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (res) => {
          const data = res.data as any[];
          const hdrs = res.meta.fields ?? Object.keys(data[0] ?? {});
          resolve({ headers: hdrs, rows: data.slice(0, 200) });
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
  }

  // ─── Category detection ───────────────────────────────────
  function detectCategories() {
    if (!rows.length) return setCategoryMap([]);
    const uniq = Array.from(
      new Set(
        rows
          .map((r) => String(r[categoryColumn] ?? "").trim())
          .filter(Boolean)
      )
    ).sort();
    setCategoryMap(uniq.map((code) => ({ code, label: code })));
  }

  // ─── Indicator search ─────────────────────────────────────
  async function searchIndicators() {
    const { data } = await supabase
      .from("indicator_catalogue")
      .select("id,name,data_type,description")
      .order("name");
    const filtered =
      indicatorQuery.trim().length > 0
        ? (data ?? []).filter((i) =>
            i.name.toLowerCase().includes(indicatorQuery.toLowerCase())
          )
        : data ?? [];
    setIndicatorList(filtered);
  }

  useEffect(() => {
    if (step === 4) searchIndicators();
  }, [step]);

  // ─── Save logic ───────────────────────────────────────────
  async function saveAll() {
    setBusy(true);
    setError(null);
    try {
      const { data: meta, error: metaErr } = await supabase
        .from("dataset_metadata")
        .insert({
          title,
          description: desc,
          year: year === "" ? null : Number(year),
          admin_level: adminLevel,
          data_type: datasetType,
          data_format: dataFormat,
          country_iso: countryIso,
          indicator_id: indicatorId ?? null,
        })
        .select()
        .single();
      if (metaErr) throw metaErr;
      const datasetId = meta.id as string;

      // link dataset↔indicator
      if (indicatorId)
        await supabase
          .from("catalogue_indicator_links")
          .insert({ dataset_id: datasetId, indicator_id: indicatorId });

      // ── ADM0 national value path
      if (adminLevel === "ADM0" && nationalValue.trim() !== "") {
        await supabase.from("dataset_values").insert([
          {
            dataset_id: datasetId,
            admin_pcode: "ADM0",
            admin_level: "ADM0",
            value:
              dataFormat === "text"
                ? null
                : Number(nationalValue.replace("%", "")),
            text_value: dataFormat === "text" ? nationalValue : null,
          },
        ]);
        setStep(5);
        onSaved();
        return;
      }

      // ── CSV path
      if (datasetType === "gradient") {
        const rowsToInsert = rows
          .filter((r) => r[joinColumn] && r[valueColumn] != null)
          .map((r) => ({
            dataset_id: datasetId,
            admin_pcode: String(r[joinColumn]).trim(),
            admin_level: adminLevel,
            value:
              dataFormat === "text"
                ? null
                : Number(r[valueColumn]),
            text_value:
              dataFormat === "text" ? String(r[valueColumn]) : null,
          }));
        if (rowsToInsert.length)
          await supabase.from("dataset_values").insert(rowsToInsert);
      } else {
        if (!categoryMap.length) detectCategories();
        const mappings = categoryMap.map((m) => ({
          dataset_id: datasetId,
          code: m.code,
          label: m.label,
          score: null,
        }));
        if (mappings.length)
          await supabase.from("dataset_category_maps").insert(mappings);
        const catRows = rows.map((r) => {
          const code = String(r[valueColumn]).trim();
          const m = categoryMap.find((x) => x.code === code);
          return {
            dataset_id: datasetId,
            admin_pcode: String(r[joinColumn]).trim(),
            admin_level: adminLevel,
            category_code: code,
            category_label: m?.label ?? code,
          };
        });
        if (catRows.length)
          await supabase.from("dataset_values_cat").insert(catRows);
      }

      setStep(5);
      onSaved();
    } catch (e: any) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  // ─── Step logic helpers ───────────────────────────────────
  const canNextFrom1 = !!title && !!datasetType && !!dataFormat && !!adminLevel;
  const canSave = adminLevel === "ADM0" ? !!nationalValue : true;

  // ─── UI ───────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
            Add Dataset
          </h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
          <div className="text-xs text-gray-500">Step {step} / 5</div>

          {/* ─ Step 1 ─ */}
          {step === 1 && (
            <section className="space-y-3">
              <div>
                <label className={LABEL}>Title *</label>
                <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Description</label>
                <textarea className={FIELD} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <label className={LABEL}>Dataset Type</label>
                  <select className={FIELD} value={datasetType} onChange={(e) => setDatasetType(e.target.value as any)}>
                    <option value="gradient">Gradient (continuous / ratio / percentage)</option>
                    <option value="categorical">Categorical (discrete classes)</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Data Format</label>
                  <select className={FIELD} value={dataFormat} onChange={(e) => setDataFormat(e.target.value as any)}>
                    <option value="numeric">Numeric</option>
                    <option value="percentage">Percentage</option>
                    <option value="text">Text</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Admin Level</label>
                  <select className={FIELD} value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)}>
                    {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>

              {adminLevel === "ADM0" && (
                <div>
                  <label className={LABEL}>National Value ({dataFormat})</label>
                  <input
                    className={FIELD}
                    placeholder="Enter single national value"
                    value={nationalValue}
                    onChange={(e) => setNationalValue(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    For national-level datasets you may enter a single value and skip file upload.
                  </p>
                </div>
              )}

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
            </section>
          )}

          {/* Steps 2-5 remain unchanged; you can keep upload, category, and indicator logic here. */}
          {step === 5 && (
            <section className="text-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4" /> Dataset saved successfully.
            </section>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3 bg-gray-50">
          <button className={BTN_SECONDARY} onClick={step === 1 ? onClose : prev}>
            <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 && (
            <button className={BTN_PRIMARY} onClick={next} disabled={!canNextFrom1}>
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
