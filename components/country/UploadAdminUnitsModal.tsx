"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void; // call to refresh versions list
};

type ParsedRow = {
  pcode: string;
  name: string;
  level: `ADM1` | `ADM2` | `ADM3` | `ADM4` | `ADM5`;
  parent_pcode: string | null;
};

const ADM_LEVELS = [1, 2, 3, 4, 5] as const;
const COLS = ADM_LEVELS.flatMap((n) => [`ADM${n} Name`, `ADM${n} PCode`]);

export default function UploadAdminUnitsModal({ open, onClose, countryIso, onUploaded }: Props) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [datasetDate, setDatasetDate] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [makeActive, setMakeActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setYear("");
      setDatasetDate("");
      setSource("");
      setMakeActive(true);
      setFile(null);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const disabled = useMemo(
    () => !title || !year || !file || busy,
    [title, year, file, busy]
  );

  async function handleSubmit() {
    try {
      setBusy(true);
      setError(null);
      if (!file || !title || !year) return;

      // 1) Read CSV
      const text = await file.text();

      // 2) Parse wide CSV -> normalized rows
      const { rows, lowestLevelFound } = parseWideAdminCsv(text);

      if (rows.length === 0) {
        throw new Error("No valid rows detected. Please verify the file matches the ADM1…ADM5 template.");
      }

      // 3) Create a dataset version row
      const { data: versionInsert, error: vErr } = await supabase
        .from("admin_dataset_versions")
        .insert({
          country_iso: countryIso,
          title,
          year: Number(year),
          dataset_date: datasetDate || null,
          source: source || null,
          is_active: false,
          notes: null,
        })
        .select("id")
        .single();

      if (vErr) throw vErr;
      const versionId = versionInsert.id as string;

      // 4) Prepare normalized rows with version IDs
      const payload = rows.map((r) => ({
        id: cryptoRandomUUID(),
        country_iso: countryIso,
        dataset_id: null,
        dataset_version_id: versionId,
        pcode: r.pcode,
        name: r.name,
        level: r.level,
        parent_pcode: r.parent_pcode,
        metadata: null,
        source: null,
      }));

      // 5) Insert normalized rows
      const chunkSize = 1000;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        const { error: insErr } = await supabase.from("admin_units").insert(chunk);
        if (insErr) throw insErr;
      }

      // 6) Optionally make this version active (and deactivate others)
      if (makeActive) {
        await supabase
          .from("admin_dataset_versions")
          .update({ is_active: false })
          .eq("country_iso", countryIso);
        await supabase
          .from("admin_dataset_versions")
          .update({ is_active: true })
          .eq("id", versionId);
      }

      // Done
      onUploaded();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Upload failed. Please check the CSV and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Upload Admin Units (ADM1–ADM5 template)</h3>
          <p className="text-xs text-gray-500 mt-1">
            Use a wide CSV with columns: {COLS.join(", ")}. Leave unused levels blank.
          </p>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block mb-1 font-medium">Title *</span>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="e.g., PSA Admin Names v2020"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="text-sm">
              <span className="block mb-1 font-medium">Year *</span>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                type="number"
                min={1900}
                max={2100}
                value={year}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
              />
            </label>

            <label className="text-sm">
              <span className="block mb-1 font-medium">Dataset Date (optional)</span>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                type="date"
                value={datasetDate}
                onChange={(e) => setDatasetDate(e.target.value)}
              />
            </label>

            <label className="text-sm">
              <span className="block mb-1 font-medium">Source (optional)</span>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="e.g., National Statistics Office"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </label>
          </div>

          <label className="text-sm block">
            <span className="block mb-1 font-medium">CSV File *</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={makeActive}
              onChange={(e) => setMakeActive(e.target.checked)}
            />
            Make this version active after import
          </label>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button className="border rounded px-3 py-1 text-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="bg-[color:var(--gsc-red)] text-white rounded px-3 py-1 text-sm disabled:opacity-60"
            onClick={handleSubmit}
            disabled={disabled}
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Parse wide ADM template into normalized rows */
function parseWideAdminCsv(text: string): { rows: ParsedRow[]; lowestLevelFound: number } {
  // Split lines, keep simple CSV rules (no quoted commas handling for now).
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], lowestLevelFound: 0 };
  }

  const header = lines[0].split(",").map((h) => h.trim());
  // Ensure required columns exist (at least ADM1 Name + PCode)
  const hasAdm1 = header.includes("ADM1 Name") && header.includes("ADM1 PCode");
  if (!hasAdm1) {
    throw new Error("Template must include at least 'ADM1 Name' and 'ADM1 PCode' columns.");
  }

  // Make an index lookup
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const rows: ParsedRow[] = [];
  let lowest = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());

    // Walk levels 1..5, emit normalized rows where PCode + Name exist
    let parentPcode: string | null = null;

    for (const n of ADM_LEVELS) {
      const nNameIdx = idx[`ADM${n} Name`];
      const nPcodeIdx = idx[`ADM${n} PCode`];
      const name = nNameIdx != null ? (cols[nNameIdx] || "").trim() : "";
      const pcode = nPcodeIdx != null ? (cols[nPcodeIdx] || "").trim() : "";

      const present = !!name && !!pcode;
      if (!present) {
        // if this level is empty, deeper levels (n+1…) are ignored for this row
        break;
      }

      rows.push({
        name,
        pcode,
        level: `ADM${n}`,
        parent_pcode: parentPcode,
      });

      lowest = Math.max(lowest, n);
      parentPcode = pcode; // next level’s parent
    }
  }

  // De-duplicate within the same file (same level + pcode)
  const seen = new Set<string>();
  const deduped = rows.filter((r) => {
    const key = `${r.level}::${r.pcode}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { rows: deduped, lowestLevelFound: lowest };
}

// Minimal UUID helper for browsers w/o crypto.randomUUID
function cryptoRandomUUID(): string {
  // @ts-ignore
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
