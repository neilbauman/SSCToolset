"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";
import * as XLSX from "xlsx";
import Papa from "papaparse";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
};

type AdminUnit = {
  pcode: string;
  name: string;
  level: string;
};

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidRows, setInvalidRows] = useState<any[]>([]);
  const [adminPcodes, setAdminPcodes] = useState<Set<string>>(new Set());

  // fetch valid admin unit PCodes for this country
  useEffect(() => {
    if (!open) return;
    const fetchAdminUnits = async () => {
      const { data, error } = await supabase
        .from("admin_units")
        .select("pcode")
        .eq("country_iso", countryIso);
      if (error) {
        console.error("Error fetching admin units:", error);
        return;
      }
      setAdminPcodes(new Set(data.map((u) => u.pcode)));
    };
    fetchAdminUnits();
  }, [open, countryIso]);

  // handle file
  const handleFile = async (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    let rows: any[] = [];

    if (ext === "xlsx" || ext === "xls") {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws);
    } else if (ext === "csv") {
      const text = await f.text();
      rows = Papa.parse(text, { header: true }).data as any[];
    } else {
      setError("Please upload a CSV or XLSX file.");
      return;
    }

    // normalize & clean
    rows = rows
      .map((r) => ({
        pcode: r.pcode?.toString().trim(),
        name: r.name?.toString().trim(),
        year: r.year ? Number(r.year) : null,
        population: r.population ? Number(r.population) : null,
        dataset_date: r.dataset_date || null,
        source: r.source || null,
      }))
      .filter((r) => r.pcode && r.year && r.population);

    // split valid vs invalid
    const valid: any[] = [];
    const invalid: any[] = [];

    for (const row of rows) {
      if (adminPcodes.has(row.pcode)) {
        valid.push(row);
      } else {
        invalid.push(row);
      }
    }

    setFile(f);
    setPreview(valid.slice(0, 10));
    setInvalidRows(invalid);
    setError(null);
  };

  // upload
  const handleUpload = async () => {
    if (!file || preview.length === 0) return;
    setLoading(true);
    try {
      // delete existing population dataset for this country
      await supabase.from("population_data").delete().eq("country_iso", countryIso);

      const { error } = await supabase.from("population_data").insert(
        preview.map((r) => ({
          country_iso: countryIso,
          pcode: r.pcode,
          name: r.name,
          population: r.population,
          year: r.year,
          dataset_date: r.dataset_date,
          source: r.source,
        }))
      );
      if (error) throw error;

      onUploaded();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // download template
  const downloadTemplate = () => {
    const sample = [
      {
        pcode: "PH175100000",
        name: "Occidental Mindoro",
        year: 2020,
        population: 525354,
        dataset_date: "2020-05-01",
        source: "Philippines 2020 Census",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "population_template.xlsx");
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold mb-2">
          Upload Population Dataset
        </h2>

        <p className="text-sm text-gray-600">
          File must include: <code>pcode, name, year, population, dataset_date, source</code>
          <br />
          Only rows matching Admin Unit PCodes will be accepted.
        </p>

        <button
          onClick={downloadTemplate}
          className="px-2 py-1 text-sm border rounded bg-gray-100 hover:bg-gray-200"
        >
          Download Template
        </button>

        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {preview.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">
              Preview (first {preview.length} valid rows)
            </p>
            <table className="text-xs border w-full">
              <thead className="bg-gray-100">
                <tr>
                  {Object.keys(preview[0]).map((h) => (
                    <th key={h} className="border px-1 py-0.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="border px-1 py-0.5">
                        {String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {invalidRows.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 p-2 rounded text-sm">
            ⚠ {invalidRows.length} row(s) were skipped because their PCodes do not exist in Admin Units.
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded text-sm"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-3 py-1 bg-[color:var(--gsc-red)] text-white rounded text-sm"
          >
            {loading ? "Uploading…" : "Replace Dataset"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
