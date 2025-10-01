"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";
import * as XLSX from "xlsx"; // make sure xlsx is installed
import Papa from "papaparse"; // for CSV

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
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      setError("Unsupported file format. Please upload CSV or XLSX.");
      return;
    }

    // Minimal validation
    const required = ["pcode", "name", "level"];
    for (const r of rows) {
      for (const col of required) {
        if (!r[col]) {
          setError(`Missing required column: ${col}`);
          return;
        }
      }
    }

    setFile(f);
    setPreview(rows.slice(0, 10)); // show first 10 rows
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || preview.length === 0) return;
    setLoading(true);
    try {
      // delete old records
      await supabase.from("admin_units").delete().eq("country_iso", countryIso);

      // prepare new rows
      const rows = preview.map((r) => ({
        country_iso: countryIso,
        pcode: r.pcode,
        name: r.name,
        level: r.level,
        parent_pcode: r.parent_pcode || null,
        metadata: {}, // optional
        source: {}, // optional
      }));

      // batch insert
      const { error } = await supabase.from("admin_units").insert(rows);
      if (error) throw error;

      onUploaded();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Admin Units Dataset">
      <div className="space-y-4">
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {preview.length > 0 && (
          <div>
            <p className="text-sm font-semibold mb-2">Preview (first 10 rows)</p>
            <table className="text-xs border w-full">
              <thead className="bg-gray-100">
                <tr>
                  {Object.keys(preview[0]).map((h) => (
                    <th key={h} className="border px-1 py-0.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="border px-1 py-0.5">{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
