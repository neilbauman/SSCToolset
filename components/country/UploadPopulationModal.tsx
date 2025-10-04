"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
};

export default function UploadPopulationDatasetModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [datasetDate, setDatasetDate] = useState("");
  const [source, setSource] = useState("");
  const [setActive, setSetActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const rows = text.split("\n").map((r) => r.trim().split(","));
      const headers = rows[0].map((h) => h.toLowerCase());
      const pcodeIdx = headers.indexOf("pcode");
      const popIdx = headers.indexOf("population");
      const nameIdx = headers.indexOf("name");

      if (pcodeIdx === -1 || popIdx === -1) {
        throw new Error("Missing required headers: pcode, population");
      }

      // Create version
      const { data: version, error: vErr } = await supabase
        .from("population_dataset_versions")
        .insert({
          country_iso: countryIso,
          title,
          year,
          dataset_date: datasetDate || null,
          source,
          is_active: setActive,
        })
        .select()
        .single();

      if (vErr) throw vErr;

      // Insert records
      const records = rows.slice(1).filter((r) => r.length > 1).map((r) => ({
        dataset_version_id: version.id,
        country_iso: countryIso,
        pcode: r[pcodeIdx],
        name: nameIdx >= 0 ? r[nameIdx] : null,
        population: parseInt(r[popIdx] || "0", 10),
      }));

      if (records.length > 0) {
        const { error: dErr } = await supabase.from("population_data").insert(records);
        if (dErr) throw dErr;
      }

      onUploaded();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Upload Population Dataset</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          type="text"
          placeholder="Title"
          className="border rounded px-2 py-1 w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="number"
          placeholder="Year"
          className="border rounded px-2 py-1 w-full"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        />
        <input
          type="date"
          className="border rounded px-2 py-1 w-full"
          value={datasetDate}
          onChange={(e) => setDatasetDate(e.target.value)}
        />
        <input
          type="text"
          placeholder="Source (optional)"
          className="border rounded px-2 py-1 w-full"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={setActive}
            onChange={(e) => setSetActive(e.target.checked)}
          />
          Set as Active
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-3 py-1 bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
