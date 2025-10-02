"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Download, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded?: () => void;
};

function excelDateToJSDate(serial: number): string {
  if (!serial || isNaN(serial)) return "";
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split("T")[0];
}

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = (format: "csv" | "xlsx") => {
    const headers = ["pcode", "name", "year", "population", "dataset_date", "source"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Population");

    if (format === "csv") {
      XLSX.writeFile(wb, "population_template.csv");
    } else {
      XLSX.writeFile(wb, "population_template.xlsx");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (!rows || rows.length === 0) {
          setError("No rows found in file.");
          return;
        }

        // Parse dataset-level metadata
        const first = rows[0];
        const year = Number(first.year);
        const dataset_date =
          typeof first.dataset_date === "number"
            ? excelDateToJSDate(first.dataset_date)
            : String(first.dataset_date).slice(0, 10);
        const source =
          typeof first.source === "string"
            ? { name: first.source }
            : first.source || { name: "Unknown" };

        // Insert new dataset record
        const { data: dataset, error: dsError } = await supabase
          .from("population_datasets")
          .insert({
            country_iso: countryIso,
            year,
            dataset_date,
            source,
            is_active: true,
          })
          .select()
          .single();

        if (dsError || !dataset) {
          setError("Could not create dataset version.");
          return;
        }

        // Deactivate other datasets
        await supabase
          .from("population_datasets")
          .update({ is_active: false })
          .eq("country_iso", countryIso)
          .neq("id", dataset.id);

        // Prepare population rows
        const popData = rows.map((r) => {
          const dsDate =
            typeof r.dataset_date === "number"
              ? excelDateToJSDate(r.dataset_date)
              : String(r.dataset_date).slice(0, 10);

          return {
            dataset_id: dataset.id,
            country_iso: countryIso,
            pcode: String(r.pcode).trim(),
            name: r.name,
            population: Number(r.population),
          };
        });

        // Insert rows
        const { error: insertErr } = await supabase
          .from("population_data")
          .insert(popData);

        if (insertErr) {
          setError(insertErr.message);
          return;
        }

        if (onUploaded) onUploaded();
        setFile(null);
        setError(null);
        onClose();
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center">
        <Dialog.Panel className="bg-white rounded-lg shadow-lg p-6 w-[500px]">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Upload Population Dataset
            </Dialog.Title>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            File must include: <code>pcode, name, year, population, dataset_date, source</code>
          </p>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => handleDownloadTemplate("csv")}
              className="flex items-center gap-2 px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Download CSV Template
            </button>
            <button
              onClick={() => handleDownloadTemplate("xlsx")}
              className="flex items-center gap-2 px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              <Download className="w-4 h-4" /> Download Excel Template
            </button>
          </div>

          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file}
              className="px-3 py-1 text-sm rounded bg-[color:var(--gsc-red)] text-white hover:opacity-90 disabled:opacity-50"
            >
              <Upload className="w-4 h-4 inline mr-1" />
              Replace Dataset
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
