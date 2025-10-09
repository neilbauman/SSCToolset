"use client";
import { useState } from "react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Upload } from "lucide-react";

export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
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

  const handleUpload = async () => {
    try {
      if (!form.file || !form.title.trim()) return;
      setLoading(true);
      setProgress(10);

      const text = await form.file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = parsed.data as any[];

      const sourceJson =
        form.source_name || form.source_url
          ? JSON.stringify({
              name: form.source_name,
              url: form.source_url,
            })
          : null;

      // ✅ SAFE INSERT (no more 409 conflicts)
      const { data: inserted, error: insertError } = await supabase
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
        .select();

      if (insertError || !inserted?.length) {
        console.error("❌ Failed to insert dataset version:", insertError);
        alert("Failed to upload dataset. Check console or Supabase logs.");
        setLoading(false);
        return;
      }

      const version = inserted[0];

      // Deactivate any other versions
      const { error: deactivateError } = await supabase
        .from("admin_dataset_versions")
        .update({ is_active: false })
        .eq("country_iso", countryIso)
        .neq("id", version.id);

      if (deactivateError) {
        console.warn("⚠️ Failed to deactivate other versions:", deactivateError);
      }

      // Prepare admin rows for upload
      const adminRows: any[] = [];
      rows.forEach((r) => {
        for (let lvl = 1; lvl <= 5; lvl++) {
          const name = r[`ADM${lvl} Name`];
          const pcode = r[`ADM${lvl} PCode`];
          if (!name || !pcode) continue;
          const parent = lvl > 1 ? r[`ADM${lvl - 1} PCode`] || null : null;
          adminRows.push({
            country_iso: countryIso,
            dataset_version_id: version.id,
            name,
            pcode,
            level: `ADM${lvl}`,
            parent_pcode: parent,
          });
        }
      });

      // Chunked inserts for large files
      const batchSize = 1000;
      for (let i = 0; i < adminRows.length; i += batchSize) {
        const chunk = adminRows.slice(i, i + batchSize);
        const { error: insertChunkError } = await supabase
          .from("admin_units")
          .insert(chunk);

        if (insertChunkError) {
          console.error("❌ Error inserting admin_units chunk:", insertChunkError);
          alert("Failed to upload dataset. Check console or Supabase logs.");
          setLoading(false);
          return;
        }

        setProgress(Math.round(((i + batchSize) / adminRows.length) * 100));
      }

      setProgress(100);
      setLoading(false);
      onUploaded();
      onClose();
    } catch (err) {
      console.error("❌ Upload exception:", err);
      alert("Unexpected error during upload. Check console.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">
          Upload Administrative Units
        </h3>
        <div className="space-y-2 text-sm">
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
              Year
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
              Source Name
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
              Source URL
              <input
                type="text"
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
            />
          </label>
          <label className="block">
            Select CSV File (wide format)
            <input
              type="file"
              accept=".csv"
              onChange={(e) =>
                setForm({ ...form, file: e.target.files?.[0] || null })
              }
              className="mt-1 w-full text-sm"
            />
          </label>
        </div>

        {progress > 0 && (
          <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[color:var(--gsc-green)] h-2 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-red)] text-white rounded flex items-center gap-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
