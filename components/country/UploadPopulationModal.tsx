"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Download, Upload, X, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded?: () => void;
};

function excelDateToJSDate(serial: number): string {
  if (!serial || isNaN(serial)) return "";
  // Excel serial dates are offset from 1899-12-30
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split("T")[0]; // YYYY-MM-DD
}

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAdmins, setHasAdmins] = useState(false);

  useEffect(() => {
    const checkAdmins = async () => {
      const { data } = await supabase
        .from("admin_units")
        .select("pcode")
        .eq("country_iso", countryIso);
      setHasAdmins(!!data && data.length > 0);
    };
    checkAdmins();
  }, [countryIso]);

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

        // Required columns check
        const required = ["pcode", "name", "year", "population", "dataset_date", "source"];
        if (!required.every((col) => col in rows[0])) {
          setError("Missing required columns in file.");
          return;
        }

        // Check for admin_units mismatches
        const { data: admins } = await supabase
          .from("admin_units")
          .select("pcode")
          .eq("country_iso", countryIso);
        const adminSet = new Set(admins?.map((a) => a.pcode));

        const mismatches = rows.filter((r) => !adminSet.has(String(r.pcode).trim()));
        if (mismatches.length > 0) {
          setError(`⚠ Found ${mismatches.length} population rows with invalid PCodes.`);
          return;
        }

        // Replace old dataset
        await supabase.from("population_data").delete().eq("country_iso", countryIso);

        const popData = rows.map((r) => {
          let dsDate: string;
          if (typeof r.dataset_date === "number") {
            dsDate = excelDateToJSDate(r.dataset_date);
          } else {
            dsDate = String(r.dataset_date).slice(0, 10); // trim to YYYY-MM-DD
          }

          return {
            country_iso: countryIso,
            pcode: String(r.pcode).trim(),
            name: r.name,
            year: Number(r.year),
            population: Number(r.population),
            dataset_date: dsDate,
            source:
              typeof r.source === "string" ? { name: r.source } : r.source,
          };
        });

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

          {hasAdmins && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 p-2 rounded mb-4 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <p>
                Admin Units already exist. For consistency, consider uploading 
                population via the <strong>Admin Units modal</strong> with the 
                population column enabled.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              File must include: <code>pcode, name, year, population, dataset_date, source</code>
            </p>

            <div className="flex gap-2">
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
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

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
