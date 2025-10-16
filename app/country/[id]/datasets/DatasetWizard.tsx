"use client";

import { useState } from "react";
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
  Tag,
} from "lucide-react";

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

export default function DatasetWizard({
  countryIso,
  onClose,
  onSaved,
}: Props) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dataset metadata
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [adminLevel, setAdminLevel] = useState("ADM2");
  const [type, setType] = useState<"numeric" | "categorical">("numeric");

  // file + data
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any[] | null>(null);

  // category mappings (for categorical)
  const [map, setMap] = useState<
    { code: string; label: string; score?: number | null }[]
  >([]);

  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  async function parseCSV(f: File) {
    return new Promise<any[]>((resolve, reject) => {
      Papa.parse(f, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data as any[]),
        error: reject,
      });
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const data = await parseCSV(f);
    setParsed(data.slice(0, 200));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      // 1️⃣ create dataset_metadata row
      const { data: meta, error: metaErr } = await supabase
        .from("dataset_metadata")
        .insert({
          title,
          description: desc,
          year: year === "" ? null : Number(year),
          admin_level: adminLevel,
          data_type: type,
          country_iso: countryIso,
        })
        .select()
        .single();
      if (metaErr) throw metaErr;
      const datasetId = meta.id;

      if (!parsed) throw new Error("No data parsed.");

      // 2️⃣ insert data
      if (type === "numeric") {
        const rows = parsed
          .filter((r) => r.pcode && r.value != null)
          .map((r) => ({
            dataset_id: datasetId,
            admin_pcode: String(r.pcode).trim(),
            admin_level: adminLevel,
            value: Number(r.value),
          }));
        if (rows.length) await supabase.from("dataset_values").insert(rows);
      } else {
        // categorical
        if (map.length === 0)
          throw new Error("Define at least one category mapping.");
        // mappings
        const mappings = map.map((m) => ({
          dataset_id: datasetId,
          code: m.code,
          label: m.label,
          score: m.score ?? null,
        }));
        await supabase.from("dataset_category_maps").insert(mappings);

        // values
        const rows = parsed
          .filter((r) => r.pcode && r.value)
          .map((r) => {
            const code = String(r.value).trim();
            const m = map.find((x) => x.code === code);
            return {
              dataset_id: datasetId,
              admin_pcode: String(r.pcode).trim(),
              admin_level: adminLevel,
              category_code: code,
              category_label: m?.label ?? code,
              category_score: m?.score ?? null,
            };
          });
        if (rows.length)
          await supabase.from("dataset_values_cat").insert(rows);
      }

      setStep(4);
      onSaved(); // refresh parent list
    } catch (e: any) {
      setError(e.message || "Failed to save dataset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
            Add Dataset
          </h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <section className="space-y-3">
              <div>
                <label className={LABEL}>Title *</label>
                <input
                  className={FIELD}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
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
                    {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((a) => (
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

          {step === 2 && (
            <section className="space-y-3">
              <div>
                <label className={LABEL}>Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  className="text-sm"
                  onChange={handleFile}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Expected columns: <code>pcode,value</code>
                </p>
              </div>
              {parsed && (
                <div className="border rounded p-2 max-h-48 overflow-auto text-xs">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        {Object.keys(parsed[0] || {}).map((k) => (
                          <th
                            key={k}
                            className="text-left px-2 py-1 border-b"
                          >
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.slice(0, 10).map((r, i) => (
                        <tr key={i} className="odd:bg-gray-50">
                          {Object.keys(parsed[0] || {}).map((k) => (
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

          {step === 3 && type === "categorical" && (
            <section className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-medium text-sm">
                  Category Mapping
                </label>
                <button
                  className={BTN_SECONDARY}
                  onClick={() => setMap([...map, { code: "", label: "" }])}
                >
                  + Add
                </button>
              </div>
              {map.map((m, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input
                    className={FIELD}
                    placeholder="Code"
                    value={m.code}
                    onChange={(e) => {
                      const arr = [...map];
                      arr[i].code = e.target.value;
                      setMap(arr);
                    }}
                  />
                  <input
                    className={FIELD}
                    placeholder="Label"
                    value={m.label}
                    onChange={(e) => {
                      const arr = [...map];
                      arr[i].label = e.target.value;
                      setMap(arr);
                    }}
                  />
                  <input
                    type="number"
                    className={FIELD}
                    placeholder="Score (optional)"
                    value={m.score ?? ""}
                    onChange={(e) => {
                      const arr = [...map];
                      arr[i].score = e.target.value
                        ? Number(e.target.value)
                        : null;
                      setMap(arr);
                    }}
                  />
                </div>
              ))}
              {!map.length && (
                <p className="text-xs text-gray-500">
                  Define code → label (and optional score) for this dataset.
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <Info className="w-4 h-4" /> Each row in your CSV will
                reference one of these category codes.
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="text-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center gap-2 justify-center">
              <CheckCircle2 className="w-4 h-4" /> Dataset saved successfully.
            </section>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t px-5 py-3 bg-gray-50">
          <button className={BTN_SECONDARY} onClick={step === 1 ? onClose : prev}>
            <ChevronLeft className="w-4 h-4" />{" "}
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 3 && (
            <button
              className={BTN_PRIMARY}
              onClick={next}
              disabled={busy || !title}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 3 && (
            <button
              className={BTN_PRIMARY}
              onClick={save}
              disabled={busy || !title}
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
