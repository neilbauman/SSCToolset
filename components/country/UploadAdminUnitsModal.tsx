"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
}

/**
 * Upload modal for Administrative Units (wide format CSV)
 * Safe deduplication and hierarchy enforcement.
 */
export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    year: "",
    dataset_date: "",
    source_name: "",
    source_url: "",
    notes: "",
    file: null as File | null,
  });

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm({ ...form, file });
  };

  const handleUpload = async () => {
    setError(null);

    if (!form.file) return setError("Please select a CSV file to upload.");
    if (!form.title.trim()) return setError("Dataset title is required.");

    setLoading(true);
    setProgress(5);

    try {
      // --- Parse CSV ---
      const text = await form.file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows: any[] = parsed.data;

      if (!rows || rows.length === 0) throw new Error("No valid rows found in CSV.");

      // --- Create new dataset version ---
      const sourceJson =
        form.source_name || form.source_url
          ? JSON.stringify({ name: form.source_name, url: form.source_url })
          : null;

      const { data: version, error: vErr } = await supabase
        .from("admin_dataset_versions")
        .insert({
          country_iso: countryIso,
          title: form.title.trim(),
          year: form.year ? parseInt(form.year) : null,
          dataset_date: form.dataset_date || null,
          source: sourceJson,
          notes: form.notes || null,
          is_active: false,
        })
        .select()
        .single();

      if (vErr || !version) throw vErr || new Error("Failed to create dataset version.");
      setProgress(15);

      // --- Flatten wide CSV to normalized admin_units structure ---
      const seen = new Set<string>();
      const adminRows: any[] = [];

      for (const row of rows) {
        for (let level = 1; level <= 5; level++) {
          const name = row[`ADM${level} Name`]?.trim();
          const pcode = row[`ADM${level} PCode`]?.trim();
          if (!name || !pcode) continue;

          const parentLevel = level - 1;
          const parentPcode =
            parentLevel > 0 ? row[`ADM${parentLevel} PCode`]?.trim() || null : null;

          const key = `${version.id}_${pcode}`;
          if (seen.has(key)) continue; // deduplicate
          seen.add(key);

          adminRows.push({
            country_iso: countryIso,
            dataset_version_id: version.id,
            pcode,
            name,
            level: `ADM${level}`,
            parent_pcode: parentPcode,
            metadata: {},
          });
        }
      }

      if (adminRows.length === 0) throw new Error("No valid admin rows generated.");

      // --- Batch insert ---
      const batchSize = 1000;
      for (let i = 0; i < adminRows.length; i += batchSize) {
        const chunk = adminRows.slice(i, i + batchSize);
        const { error: insertErr } = await supabase.from("admin_units").insert(chunk);
        if (insertErr) throw insertErr;
        setProgress(Math.min(100, 15 + (i / adminRows.length) * 85));
      }

      setProgress(100);
      onUploaded();
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md relative">
        <h3 className="text-lg font-semibold mb-3">Upload Administrative Units</h3>

        <div className="space-y-3 text-sm">
          <label className="block">
            Dataset Title *
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border rounded w-full px-2 py-1 mt-1"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              Year (optional)
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className="border rounded w-full px-2 py-1 mt-1"
              />
            </label>
            <label className="block">
              Dataset Date *
              <input
                type="date"
                value={form.dataset_date}
                onChange={(e) =>
                  setForm({ ...form, dataset_date: e.target.value })
                }
                className="border rounded w-full px-2 py-1 mt-1"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              Source Name (optional)
              <input
                type="text"
                value={form.source_name}
                onChange={(e) =>
                  setForm({ ...form, source_name: e.target.value })
                }
                className="border rounded w-full px-2 py-1 mt-1"
              />
            </label>
            <label className="block">
              Source URL (optional)
              <input
                type="url"
                value={form.source_url}
                onChange={(e) =>
                  setForm({ ...form, source_url: e.target.value })
                }
                className="border rounded w-full px-2 py-1 mt-1"
              />
            </label>
          </div>

          <label className="block">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="border rounded w-full px-2 py-1 mt-1"
              rows={2}
            />
          </label>

          <label className="block">
            Select CSV File (wide format)
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1 w-full text-sm"
            />
          </label>
        </div>

        {progress > 0 && (
          <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[color:var(--gsc-green)] h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90 flex items-center gap-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload CSV
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
