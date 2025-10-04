"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Upload, FileDown } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded?: () => void;
};

type Country = {
  iso_code: string;
  name: string;
  adm0_label?: string;
  adm1_label?: string;
  adm2_label?: string;
  adm3_label?: string;
  adm4_label?: string;
  adm5_label?: string;
};

const CHUNK_SIZE = 1000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// very basic CSV -> rows with headers; assumes no embedded commas/newlines in fields
function simpleParseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    return row;
  });
  return { headers, rows };
}

export default function UploadAdminUnitsModal({ open, onClose, countryIso, onUploaded }: Props) {
  const [country, setCountry] = useState<Country | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso_code", countryIso).single();
      if (data) setCountry(data as Country);
    })();
  }, [open, countryIso]);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [datasetDate, setDatasetDate] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template content based on known ADM labels
  const templateCSV = useMemo(() => {
    const headers = ["pcode", "name", "level", "parent_pcode"];
    const levelHints = [
      country?.adm0_label,
      country?.adm1_label,
      country?.adm2_label,
      country?.adm3_label,
      country?.adm4_label,
      country?.adm5_label,
    ].filter(Boolean) as string[];

    let csv = headers.join(",") + "\n";
    if (levelHints.length > 0) {
      // add a few hint lines users can delete
      levelHints.forEach((lbl, i) => {
        // level should be ADM0..ADM5 text — we just hint
        csv += `,,ADM${i},,\n`;
      });
    }
    return csv;
  }, [country]);

  const handleDownloadTemplate = () => {
    const blob = new Blob([templateCSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${countryIso}_admin_units_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setTitle("");
    setYear("");
    setDatasetDate("");
    setSource("");
    setNotes("");
    setFile(null);
    setError(null);
    setInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeAndReset = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!file) {
      setError("Please choose a CSV file.");
      return;
    }
    if (!title || year === "" || year === undefined || year === null) {
      setError("Title and Year are required.");
      return;
    }

    // read file
    setBusy(true);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setBusy(false);
      setError("Could not read the CSV file.");
      return;
    }

    // parse
    const { headers, rows } = simpleParseCSV(text);
    const required = ["pcode", "name", "level", "parent_pcode"];
    const missing = required.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      setBusy(false);
      setError(`CSV missing required columns: ${missing.join(", ")}`);
      return;
    }
    if (rows.length === 0) {
      setBusy(false);
      setError("CSV appears to have no data rows.");
      return;
    }

    // create version
    const versionPayload = {
      id: crypto.randomUUID(),
      country_iso: countryIso,
      title,
      year: Number(year),
      dataset_date: datasetDate || null,
      source: source || null,
      notes: notes || null,
      is_active: false,
    };

    let createdVersionId = versionPayload.id;

    try {
      const { error: vErr } = await supabase.from("admin_dataset_versions").insert(versionPayload);
      if (vErr) {
        throw vErr;
      }
    } catch (err: any) {
      setBusy(false);
      setError(`Failed to create dataset version: ${err?.message ?? err}`);
      return;
    }

    // build admin_units rows
    const now = new Date().toISOString();
    // optional: you can map level to ADM0..ADM5 only
    const sanitized = rows.map((r) => ({
      id: crypto.randomUUID(),
      country_iso: countryIso,
      pcode: r.pcode || null,
      name: r.name || null,
      level: r.level || null, // expect ADM0..ADM5 (text)
      parent_pcode: r.parent_pcode || null,
      metadata: {}, // empty object by default
      source: null, // we store source at version level; keep row-level null
      created_at: now,
      updated_at: now,
      dataset_id: null, // not used for admins; using version id instead
      dataset_version_id: createdVersionId,
    }));

    // insert in chunks
    try {
      for (const group of chunk(sanitized, CHUNK_SIZE)) {
        const { error: iuErr } = await supabase.from("admin_units").insert(group);
        if (iuErr) throw iuErr;
      }
    } catch (err: any) {
      // rollback version if rows failed
      await supabase.from("admin_dataset_versions").delete().eq("id", createdVersionId);
      setBusy(false);
      setError(`Failed to insert admin units: ${err?.message ?? err}`);
      return;
    }

    setBusy(false);
    setInfo(`Uploaded ${sanitized.length} rows into version "${title}".`);
    onUploaded?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={closeAndReset} />

      {/* modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-lg shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-[color:var(--gsc-red)]" />
            Upload Admin Units
          </h2>
          <button onClick={closeAndReset} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., 2023 National Admin Units"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Year *</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., 2023"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dataset Date</label>
              <input
                type="date"
                value={datasetDate}
                onChange={(e) => setDatasetDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Source (text or URL)</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="e.g., National Statistics Office"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={2}
              />
            </div>
          </div>

          <div className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium mb-1">CSV File *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required headers: <code>pcode</code>, <code>name</code>, <code>level</code>, <code>parent_pcode</code>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center text-sm border px-2 py-1 rounded hover:bg-gray-50 h-9"
                title="Download CSV template"
              >
                <FileDown className="w-4 h-4 mr-1" />
                Template
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-green-700">{info}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeAndReset}
              className="border px-3 py-2 text-sm rounded hover:bg-gray-50"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[color:var(--gsc-red)] text-white px-4 py-2 text-sm rounded hover:opacity-90 disabled:opacity-60"
              disabled={busy}
            >
              {busy ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
