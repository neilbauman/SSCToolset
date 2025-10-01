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

export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // fetch available levels for this country
  useEffect(() => {
    if (!open) return;
    const fetchLevels = async () => {
      const { data } = await supabase
        .from("countries")
        .select(
          "adm0_label, adm1_label, adm2_label, adm3_label, adm4_label, adm5_label"
        )
        .eq("iso_code", countryIso)
        .single();
      if (data) {
        const lvls = Object.entries(data)
          .filter(([_, v]) => v) // only non-null
          .map(([k, v]) => k.replace("_label", "").toUpperCase());
        setLevels(lvls); // ["ADM0","ADM1","ADM2",…]
        setSelectedLevels(lvls.filter((l) => l !== "ADM0")); // default skip ADM0
      }
    };
    fetchLevels();
  }, [open, countryIso]);

  // handle file upload
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

    // validate levels
    const allowed = new Set(selectedLevels);
    for (const r of rows) {
      if (!allowed.has(r.level)) {
        setError(
          `Row with level=${r.level} not allowed. Allowed: ${Array.from(
            allowed
          ).join(", ")}`
        );
        return;
      }
    }

    setFile(f);
    setPreview(rows.slice(0, 10));
    setError(null);
  };

  // commit upload
  const handleUpload = async () => {
    if (!file || preview.length === 0) return;
    setLoading(true);
    try {
      // delete existing
      await supabase.from("admin_units").delete().eq("country_iso", countryIso);

      // insert new
      const { error } = await supabase.from("admin_units").insert(
        preview.map((r) => ({
          country_iso: countryIso,
          pcode: r.pcode,
          name: r.name,
          level: r.level,
          parent_pcode: r.parent_pcode || null,
          metadata: {},
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

  // download template
  const downloadTemplate = () => {
    const rows = selectedLevels.map((lvl) => ({
      pcode: `${countryIso}-${lvl}`,
      name: `Sample ${lvl}`,
      level: lvl,
      parent_pcode: lvl === "ADM1" ? "" : `PARENT-${lvl}`,
      population: "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "admin_units_template.xlsx");
  };

  return (
    <Modal open={open} onClose={onClose} title="Upload Admin Units Dataset">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select which admin levels you want to upload:
        </p>
        <div className="flex flex-wrap gap-3">
          {levels.map((lvl) => (
            <label key={lvl} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={selectedLevels.includes(lvl)}
                onChange={(e) =>
                  setSelectedLevels((prev) =>
                    e.target.checked
                      ? [...prev, lvl]
                      : prev.filter((p) => p !== lvl)
                  )
                }
              />
              {lvl}
            </label>
          ))}
        </div>

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
