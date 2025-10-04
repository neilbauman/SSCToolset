"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void; // refresh callback
};

export default function UploadPopulationModal({ open, onClose, countryIso, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<number | "">("");
  const [datasetDate, setDatasetDate] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [makeActive, setMakeActive] = useState<boolean>(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setYear("");
      setDatasetDate("");
      setSource("");
      setTitle("");
      setMakeActive(true);
      setBusy(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const parseCsv = async (f: File): Promise<Array<{ pcode: string; population: number }>> => {
    const text = await f.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const pIdx = header.indexOf("pcode");
    const popIdx = header.indexOf("population");
    if (pIdx === -1 || popIdx === -1) {
      throw new Error("CSV must include headers: pcode,population");
    }
    const out: Array<{ pcode: string; population: number }> = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",");
      const pcode = (cols[pIdx] || "").trim();
      const popStr = (cols[popIdx] || "").trim();
      if (!pcode) continue;
      if (!popStr) {
        out.push({ pcode, population: NaN as any }); // keep row with missing population
        continue;
      }
      const val = Number(popStr);
      if (Number.isNaN(val)) {
        // skip non-numeric for now
        continue;
      }
      out.push({ pcode, population: val });
    }
    return out;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!file) return setError("Please select a CSV file.");
    if (!year || typeof year !== "number") return setError("Year is required.");

    setBusy(true);
    try {
      // 1) Create version (inactive or active depending on toggle)
      const payload = {
        country_iso: countryIso,
        title: title?.trim() || null,
        year,
        dataset_date: datasetDate || null,
        source: source || null,
        is_active: false, // set after upload if makeActive
      };
      const { data: vdata, error: vErr } = await supabase
        .from("population_dataset_versions")
        .insert(payload)
        .select()
        .single();
      if (vErr) throw vErr;

      const versionId = vdata.id as string;

      // 2) Parse CSV
      const parsed = await parseCsv(file);

      // 3) Join to active Admin Units to derive levels
      let levelByPcode: Record<string, string> = {};
      const { data: av } = await supabase
        .from("admin_dataset_versions")
        .select("id")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .maybeSingle();
      const adminVid = av?.id as string | undefined;

      if (adminVid) {
        const { data: aus } = await supabase
          .from("admin_units")
          .select("pcode,level")
          .eq("country_iso", countryIso)
          .eq("dataset_version_id", adminVid);
        (aus || []).forEach((u: any) => {
          levelByPcode[u.pcode] = (u.level || "").toUpperCase();
        });
      }

      // 4) Insert rows in chunks
      const chunkSize = 1000;
      for (let i = 0; i < parsed.length; i += chunkSize) {
        const chunk = parsed.slice(i, i + chunkSize).map((r) => ({
          country_iso: countryIso,
          dataset_version_id: versionId,
          pcode: r.pcode,
          population: Number.isNaN(r.population) ? null : r.population,
          level: levelByPcode[r.pcode] || null,
        }));
        const { error: insErr } = await supabase.from("population_data").insert(chunk);
        if (insErr) throw insErr;
      }

      // 5) If "make active" toggle is on, flip versions
      if (makeActive) {
        await supabase
          .from("population_dataset_versions")
          .update({ is_active: false })
          .eq("country_iso", countryIso);
        await supabase
          .from("population_dataset_versions")
          .update({ is_active: true })
          .eq("id", versionId);
      }

      onUploaded();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Upload Population Dataset</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">CSV File</label>
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-gray-500 mt-1">Required headers: <code>pcode,population</code></p>
          </div>
          <div>
            <label className="block text-sm font-medium">Year <span className="text-red-600">*</span></label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value ? parseInt(e.target.value, 10) : "")}
              className="border rounded px-3 py-1 w-40"
              placeholder="e.g., 2023"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Dataset Date (optional)</label>
            <input
              type="date"
              value={datasetDate}
              onChange={(e) => setDatasetDate(e.target.value)}
              className="border rounded px-3 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Source (optional)</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="border rounded px-3 py-1 w-full"
              placeholder="e.g., Census 2020, NSO"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border rounded px-3 py-1 w-full"
              placeholder="Defaults to “Population {year}”"
            />
          </div>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={makeActive}
              onChange={(e) => setMakeActive(e.target.checked)}
            />
            <span className="text-sm">Set as Active after upload</span>
          </label>

          {error && <div className="text-red-700 text-sm">{error}</div>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded disabled:opacity-50" disabled={busy}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1 rounded text-white bg-[color:var(--gsc-red)] disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
