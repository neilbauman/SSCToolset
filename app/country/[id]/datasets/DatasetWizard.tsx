"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Papa from "papaparse";
import { Upload, Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";

const FIELD = "w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]";
const LABEL = "block text-xs font-medium text-[color:var(--gsc-gray)] mb-1";
const BTN = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
const BTN_PRIMARY = `${BTN} bg-[color:var(--gsc-red)] text-white hover:opacity-90 disabled:opacity-50`;
const BTN_SECONDARY = `${BTN} border hover:bg-gray-50`;

export default function DatasetWizard() {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dataset state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"numeric" | "categorical">("numeric");
  const [adminLevel, setAdminLevel] = useState("ADM2");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [map, setMap] = useState<{ code: string; label: string; score?: number | null }[]>([]);

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
    setParsed(data.slice(0, 200)); // preview subset
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      // create dataset_metadata row
      const { data: meta, error: metaErr } = await supabase
        .from("dataset_metadata")
        .insert({
          title,
          admin_level: adminLevel,
          data_type: type,
        })
        .select()
        .single();
      if (metaErr) throw metaErr;
      const datasetId = meta.id;

      if (!parsed) throw new Error("No data parsed.");

      if (type === "numeric") {
        // write to dataset_values
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
        // categorical path
        // 1. upsert map
        const mappings = map.map((m) => ({
          dataset_id: datasetId,
          code: m.code,
          label: m.label,
          score: m.score ?? null,
        }));
        if (mappings.length)
          await supabase.from("dataset_category_maps").insert(mappings);

        // 2. insert values
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
    } catch (e: any) {
      setError(e.message || "Failed to save dataset.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border rounded-lg bg-white max-w-3xl mx-auto">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold text-lg">Add Dataset</h2>
        <span className="text-xs text-gray-500">Step {step}/4</span>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <section className="space-y-3">
            <div>
              <label className={LABEL}>Title</label>
              <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Type</label>
              <select className={FIELD} value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="numeric">Numeric</option>
                <option value="categorical">Categorical</option>
              </select>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-3">
            <div>
              <label className={LABEL}>Admin Level</label>
              <select className={FIELD} value={adminLevel} onChange={(e) => setAdminLevel(e.target.value)}>
                {["ADM0", "ADM1", "ADM2", "ADM3"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>CSV File</label>
              <input type="file" accept=".csv" className="text-sm" onChange={handleFile} />
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
                        <th key={k} className="text-left px-2 py-1 border-b">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 10).map((r, i) => (
                      <tr key={i} className="odd:bg-gray-50">
                        {Object.keys(parsed[0] || {}).map((k) => (
                          <td key={k} className="px-2 py-1 border-b">{String(r[k] ?? "")}</td>
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
              <label className="font-medium text-sm">Category Map</label>
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
                    const v = e.target.value;
                    const arr = [...map];
                    arr[i].code = v;
                    setMap(arr);
                  }}
                />
                <input
                  className={FIELD}
                  placeholder="Label"
                  value={m.label}
                  onChange={(e) => {
                    const v = e.target.value;
                    const arr = [...map];
                    arr[i].label = v;
                    setMap(arr);
                  }}
                />
                <input
                  type="number"
                  className={FIELD}
                  placeholder="Score (optional)"
                  value={m.score ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    const arr = [...map];
                    arr[i].score = v;
                    setMap(arr);
                  }}
                />
              </div>
            ))}
            {!map.length && <p className="text-xs text-gray-500">No mappings yet.</p>}
          </section>
        )}

        {step === 4 && (
          <section className="text-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center gap-2 justify-center">
            <CheckCircle2 className="w-4 h-4" /> Dataset saved successfully.
          </section>
        )}
      </div>

      <div className="px-4 py-3 border-t flex justify-between items-center bg-gray-50">
        <button className={BTN_SECONDARY} onClick={prev} disabled={step === 1 || busy}>
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step < 3 && (
          <button className={BTN_PRIMARY} onClick={next} disabled={busy || !title}>
            Next <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {step === 3 && (
          <button className={BTN_PRIMARY} onClick={save} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Save
          </button>
        )}
      </div>
    </div>
  );
}
