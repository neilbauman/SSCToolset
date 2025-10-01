"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function UploadAdminUnits({
  countryIso,
  onSaved,
}: {
  countryIso: string;
  onSaved?: (resetPage?: boolean) => void;
}) {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const binaryStr = e.target?.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        // Try to enrich parent_pcode -> parent_name from DB (if present)
        const parentCodes = parsed.map((row: any) => row.parent_pcode).filter(Boolean);
        let parents: Record<string, string> = {};

        if (parentCodes.length > 0) {
          const { data: parentRows } = await supabase
            .from("admin_units")
            .select("pcode, name")
            .in("pcode", parentCodes);

          if (parentRows) {
            parents = parentRows.reduce(
              (acc, row) => ({ ...acc, [row.pcode]: row.name }),
              {}
            );
          }
        }

        const enriched = parsed.map((row: any) => ({
          ...row,
          parent_name: row.parent_pcode ? parents[row.parent_pcode] || "" : "",
        }));

        setData(enriched);
        setError(null);
        setSaved(false);
      } catch (err: any) {
        console.error(err);
        setError("Failed to parse file. Please ensure it matches the template.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);

    // 1. Delete existing rows for this country
    const { error: deleteError } = await supabase
      .from("admin_units")
      .delete()
      .eq("country_iso", countryIso);

    if (deleteError) {
      console.error(deleteError);
      setError("Failed to clear old data.");
      setLoading(false);
      return;
    }

    // 2. Transform rows into DB format
    const rows = data.map((row) => ({
      country_iso: countryIso,
      pcode: String(row.pcode || "").trim(),
      name: String(row.name || "").trim(),
      level: String(row.level || "").trim(),
      parent_pcode: row.parent_pcode ? String(row.parent_pcode).trim() : null,
      population: row.population ? Number(row.population) : null,
      last_updated: row.last_updated ? new Date(row.last_updated) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
    }));

    // 3. Insert new rows
    const { error: insertError } = await supabase.from("admin_units").insert(rows);

    if (insertError) {
      console.error(insertError);
      setError("Failed to save new data to database.");
    } else {
      setSaved(true);
      setError(null);
      if (onSaved) onSaved(true); // reset to page 0
    }

    setLoading(false);
  };

  return (
    <div className="my-6 border rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Upload Admin Units</h3>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="mb-4"
      />

      {error && <p className="text-red-600">{error}</p>}
      {saved && <p className="text-green-600">Data saved successfully!</p>}

      {data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                {Object.keys(data[0]).map((col) =>
                  col !== "parent_pcode" ? (
                    <th key={col} className="px-4 py-2 border">
                      {col}
                    </th>
                  ) : null
                )}
                <th className="px-4 py-2 border">Parent Name</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  {Object.entries(row).map(([col, val]) =>
                    col !== "parent_pcode" ? (
                      <td key={col} className="px-4 py-2 border">
                        {String(val)}
                      </td>
                    ) : null
                  )}
                  <td className="px-4 py-2 border">
                    {row.parent_name || (
                      <span className="italic text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 10 && (
            <p className="text-gray-500 mt-2">
              Showing first 10 rows of {data.length}.
            </p>
          )}
          <Button
            className="mt-4 bg-green-600 text-white hover:bg-green-700"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save to Database"}
          </Button>
        </div>
      )}
    </div>
  );
}
