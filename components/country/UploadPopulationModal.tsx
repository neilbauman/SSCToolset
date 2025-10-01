"use client";

import { useEffect, useState } from "react";
import Papa, { ParseResult } from "papaparse";
import { X } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface UploadPopulationModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void | Promise<void>;
}

type Row = {
  admin_pcode: string;
  population?: string | number;
  households?: string | number;
  dataset_date?: string; // optional YYYY-MM-DD
};

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadPopulationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setBusy(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }
    setBusy(true);
    setError(null);

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: ParseResult<Row>) => {
        try {
          const cleaned = (results.data || []).map((r) => ({
            country_iso: countryIso,
            admin_pcode: String(r.admin_pcode || "").trim(),
            population: r.population !== undefined && r.population !== null && String(r.population).trim() !== ""
              ? Number(r.population)
              : null,
            households: r.households !== undefined && r.households !== null && String(r.households).trim() !== ""
              ? Number(r.households)
              : null,
            dataset_date: r.dataset_date ? String(r.dataset_date) : null,
            // optional: source added later via Edit Source modal
          }));

          // Create table if not exists (no-op if already exists) – recommended to run SQL separately, but safe fallback:
          // NOTE: Supabase client cannot DDL; this comment is informational.

          const { error: upErr } = await supabase.from("population_data").insert(cleaned);
          if (upErr) throw upErr;

          await onUploaded();
          onClose();
        } catch (e: any) {
          setError(e.message || "Failed to process CSV.");
        } finally {
          setBusy(false);
        }
      },
      error: (err) => {
        setBusy(false);
        setError(err.message);
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4">Upload Population CSV</h2>
        <p className="text-sm text-gray-600 mb-3">
          Expected columns: <code>admin_pcode, population</code> (optional: <code>households, dataset_date</code>).
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm mb-4"
        />

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 disabled:opacity-50"
            onClick={handleUpload}
            disabled={busy}
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
