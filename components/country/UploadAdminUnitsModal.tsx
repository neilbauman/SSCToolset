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

export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includePopulation, setIncludePopulation] = useState(false);

  const allowedLevels = ["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];

  const handleDownloadTemplate = (format: "csv" | "xlsx") => {
    const headers = ["pcode", "name", "level", "parent_pcode"];
    if (includePopulation) headers.push("population");

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AdminUnits");

    if (format === "csv") {
      XLSX.writeFile(wb, "admin_units_template.csv");
    } else {
      XLSX.writeFile(wb, "admin_units_template.xlsx");
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

        const validRows = rows.filter((row) => allowedLevels.includes(row.level));
        if (validRows.length === 0) {
          setError(`No valid rows found. Allowed levels: ${allowedLevels.join(", ")}`);
          return;
        }

        // Insert into admin_units
        const adminData = validRows.map((row) => ({
          country_iso: countryIso,
          pcode: String(row.pcode).trim(),
          name: row.name,
          level: row.level,
          parent_pcode: row.parent_pcode || null,
        }));

        const { error: adminErr } = await supabase
          .from("admin_units")
          .delete()
          .eq("country_iso", countryIso);
        if (adminErr) console.error(adminErr);

        const { error: insertErr } = await supabase
          .from("admin_units")
          .insert(adminData);

        if (insertErr) {
          setError(insertErr.message);
          return;
        }

        // Optionally insert into population_data
        if (includePopulation && rows.some((r) => r.population)) {
          const popData = validRows
            .filter((r) => r.population && Number(r.population) > 0)
            .map((r) => ({
              country_iso: countryIso,
              pcode: String(r.pcode).trim(),
              name: r.name,
              population: Number(r.population),
              year: 2020, // default
              dataset_date: "2020-05-01",
              source: { name: "Uploaded with Admin Units" },
            }));

          if (popData.length > 0) {
            await supabase.from("population_data").delete().eq("country_iso", countryIso);
            await supabase.from("population_data").insert(popData);
          }
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
              Upload Admin Units Dataset
            </Dialog.Title>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              File must include: <code>pcode, name, level, parent_pcode</code>
              {includePopulation && ", population"}
            </p>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includePopulation}
                onChange={(e) => setIncludePopulation(e.target.checked)}
              />
              Include population column
            </label>

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
