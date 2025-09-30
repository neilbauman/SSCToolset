"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/Button";

export default function UploadAdminUnits() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const binaryStr = e.target?.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        setData(parsed);
        setError(null);
      } catch (err: any) {
        console.error(err);
        setError("Failed to parse file. Please ensure it matches the template.");
      }
    };
    reader.readAsBinaryString(file);
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

      {data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                {Object.keys(data[0]).map((col) => (
                  <th key={col} className="px-4 py-2 border">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-4 py-2 border">
                      {String(val)}
                    </td>
                  ))}
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
            onClick={() => console.log("Ready to insert into Supabase:", data)}
          >
            Save to Database
          </Button>
        </div>
      )}
    </div>
  );
}
