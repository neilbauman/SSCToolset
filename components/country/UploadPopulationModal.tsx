"use client";

import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function UploadPopulationModal({
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
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<number | "">("");
  const [datasetDate, setDatasetDate] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [title, setTitle] = useState<string>("");

  const handleUpload = async () => {
    if (!file || !year) return;

    // deactivate previous active datasets
    await supabase
      .from("population_datasets")
      .update({ is_active: false })
      .eq("country_iso", countryIso);

    // create new dataset version
    const { data: dataset, error: dsError } = await supabase
      .from("population_datasets")
      .insert([
        {
          country_iso: countryIso,
          year,
          dataset_date: datasetDate || null,
          source: source || null,
          title: title || `Dataset ${year}`,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (dsError || !dataset) {
      console.error("Error inserting dataset:", dsError);
      return;
    }

    // parse CSV
    const text = await file.text();
    const rows = text
      .split("\n")
      .slice(1) // skip header
      .map((line) => {
        const [pcode, name, populationStr] = line.split(",");
        return {
          dataset_id: dataset.id,
          country_iso: countryIso,
          pcode: pcode?.trim(),
          name: name?.trim(),
          population: parseInt(populationStr || "0", 10),
          year,
        };
      })
      .filter((r) => r.pcode && r.name);

    if (rows.length > 0) {
      const { error: insertErr } = await supabase.from("population_data").insert(rows);
      if (insertErr) {
        console.error("Error inserting rows:", insertErr);
      }
    }

    onUploaded();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg p-6 max-w-lg w-full space-y-4 shadow">
          <Dialog.Title className="text-lg font-semibold">
            Upload Population Dataset
          </Dialog.Title>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
              placeholder="e.g. 2020 Census – PSA"
            />

            <label className="block text-sm font-medium">Year *</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border rounded w-full px-2 py-1 text-sm"
            />

            <label className="block text-sm font-medium">Dataset Date</label>
            <input
              type="date"
              value={datasetDate}
              onChange={(e) => setDatasetDate(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
            />

            <label className="block text-sm font-medium">Source</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="border rounded w-full px-2 py-1 text-sm"
            />

            <label className="block text-sm font-medium">Upload CSV File</label>
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="px-3 py-1 rounded bg-[color:var(--gsc-red)] text-white hover:opacity-90 text-sm"
            >
              Upload
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
