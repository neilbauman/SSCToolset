"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface UploadPopulationModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
}

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadPopulationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];

          // Basic validation
          const required = ["pcode", "population"];
          const missingCols = required.filter((c) => !(c in rows[0]));
          if (missingCols.length > 0) {
            setError(`Missing required columns: ${missingCols.join(", ")}`);
            setLoading(false);
            return;
          }

          // Clear existing data
          await supabase.from("population_data").delete().eq("country_iso", countryIso);

          // Insert new rows
          const insertRows = rows.map((r) => ({
            country_iso: countryIso,
            pcode: r.pcode,
            population: Number(r.population) || null,
            last_updated: r.last_updated ? new Date(r.last_updated) : null,
            metadata: {},
            source: null,
          }));

          const { error: insertError } = await supabase
            .from("population_data")
            .insert(insertRows);

          if (insertError) throw insertError;

          onUploaded();
          onClose();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Upload Population Data</h2>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4"
        />
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
        <button
          onClick={handleUpload}
          disabled={loading}
          className="px-4 py-2 bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90"
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
}
