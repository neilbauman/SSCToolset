"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Dialog } from "@headlessui/react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
};

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState<number | "">("");
  const [datasetDate, setDatasetDate] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    setFile(f);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 10));
      },
    });
  };

  const handleUpload = async () => {
    if (!file || !year || !datasetDate || !source) {
      setError("Please select a file and fill in all metadata fields.");
      return;
    }

    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];

        // Insert dataset metadata
        const { data: dataset, error: dsError } = await supabase
          .from("population_datasets")
          .insert([
            {
              country_iso: countryIso,
              year,
              dataset_date: datasetDate,
              source,
            },
          ])
          .select()
          .single();

        if (dsError) {
          console.error(dsError);
          setError("Failed to save dataset metadata.");
          setLoading(false);
          return;
        }

        const datasetId = dataset.id;

        // Prepare row inserts
        const inserts = rows.map((r) => ({
          dataset_id: datasetId,
          country_iso: countryIso,
          pcode: r.pcode,
          name: r.name,
          population: parseInt(r.population, 10) || 0,
        }));

        const { error: rowError } = await supabase
          .from("population_data")
          .insert(inserts);

        if (rowError) {
          console.error(rowError);
          setError("Failed to upload rows.");
          setLoading(false);
          return;
        }

        setLoading(false);
        onUploaded();
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <Dialog.Panel className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
          <Dialog.Title className="text-lg font-semibold mb-4">
            Upload Population Dataset
          </Dialog.Title>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              File must include columns: <code>pcode, name, population</code>.
            </p>

            <input
              type="number"
              placeholder="Year (e.g. 2020)"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border px-3 py-2 rounded w-full text-sm"
            />

            <input
              type="date"
              placeholder="Dataset Date"
              value={datasetDate}
              onChange={(e) => setDatasetDate(e.target.value)}
              className="border px-3 py-2 rounded w-full text-sm"
            />

            <input
              type="text"
              placeholder="Source (e.g. PSA Census 2020)"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="border px-3 py-2 rounded w-full text-sm"
            />

            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              className="block w-full text-sm text-gray-600"
            />

            {preview.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium">Preview (first 10 rows):</p>
                <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(preview, null, 2)}
                </pre>
              </div>
            )}

            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="px-4 py-2 text-sm rounded bg-[color:var(--gsc-red)] text-white hover:opacity-90"
            >
              {loading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
