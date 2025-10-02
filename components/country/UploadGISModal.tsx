"use client";

import { useState } from "react";
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

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
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
      setError("Please upload a CSV or XLSX file.");
      return;
    }

    rows = rows.map((r) => ({
      layer_name: r.layer_name?.toString().trim(),
      format: r.format?.toString().trim(),
      feature_count: Number(r.feature_count || 0),
      crs: r.crs?.toString().trim(),
    }));

    setFile(f);
    setPreview(rows.slice(0, 10));
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || preview.length === 0) return;
    setLoading(true);
    try {
      await supabase.from("gis_layers").delete().eq("country_iso", countryIso);

      const { error } = await supabase.from("gis_layers").insert(
        preview.map((r) => ({
          country_iso: countryIso,
          layer_name: r.layer_name,
          format: r.format,
          feature_count: r.feature_count,
          crs: r.crs,
          source: {},
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

  const downloadTemplate = () => {
    const sample = [
      {
        layer_name: "Admin Boundaries",
        format: "GeoJSON",
        feature_count: 120,
        crs: "EPSG:4326",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "gis_template.xlsx");
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold mb-2">Upload GIS Dataset</h2>
        <p className="text-sm text-gray-600">
          File must include: <code>layer_name, format, feature_count, crs</code>
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
