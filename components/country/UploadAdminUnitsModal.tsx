"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
};

export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file || !year || !title) {
      alert("Please provide Title, Year, and a file.");
      return;
    }

    setLoading(true);

    try {
      // 1. Parse CSV
      const text = await file.text();
      const rows = text
        .split("\n")
        .slice(1)
        .map((line) => {
          const [pcode, name, level, parent_pcode] = line.split(",");
          return {
            pcode: pcode?.trim(),
            name: name?.trim(),
            level: level?.trim(),
            parent_pcode: parent_pcode?.trim() || null,
            country_iso: countryIso,
          };
        })
        .filter((r) => r.pcode && r.name);

      // 2. Create a new dataset version entry
      const { data: version, error: versionError } = await supabase
        .from("admin_dataset_versions")
        .insert({
          id: crypto.randomUUID(),
          country_iso: countryIso,
          year: parseInt(year, 10),
          dataset_date: new Date().toISOString(),
          source: source ? { name: source } : {},
          is_active: true,
          title,
        })
        .select("*")
        .single();

      if (versionError) throw versionError;

      // 3. Insert rows with dataset_version_id
      const rowsWithVersion = rows.map((r) => ({
        ...r,
        dataset_version_id: version.id,
      }));

      const { error: insertError } = await supabase
        .from("admin_units")
        .insert(rowsWithVersion);

      if (insertError) throw insertError;

      alert("Upload successful!");
      onUploaded();
      onClose();
    } catch (err: any) {
      console.error("Error uploading admin units:", err);
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg p-6 max-w-lg w-full space-y-4 shadow">
          <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-[color:var(--gsc-red)]" />
            Upload Admin Units Dataset
          </Dialog.Title>

          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border px-3 py-1 rounded text-sm"
              placeholder="e.g. 2020 Baseline"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full border px-3 py-1 rounded text-sm"
              placeholder="2020"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full border px-3 py-1 rounded text-sm"
              placeholder="e.g. NSO, OCHA"
            />
          </div>

          <div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded border text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="px-3 py-1 rounded bg-[color:var(--gsc-red)] text-white text-sm hover:opacity-90"
            >
              {loading ? "Uploading..." : "Upload & Save"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
