"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, MapPin, Table } from "lucide-react";

// temporary stubs to keep type checking green
type WizardMeta = any;
type Parsed = {
  headers?: string[];
  rows?: Record<string, any>[];
};

type Step2Props = {
  meta: WizardMeta;
  setMeta: (m: WizardMeta) => void;
  parsed: Parsed | null;
  onBack: () => void;
  onNext: () => void;
};

export default function Step2PreviewAndMap({
  meta,
  setMeta,
  parsed,
  onBack,
  onNext,
}: Step2Props) {
  const [joinField, setJoinField] = useState<string>(meta?.join_field ?? "");
  const [headers, setHeaders] = useState<string[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (parsed?.headers && parsed?.rows) {
      setHeaders(parsed.headers);
      setSampleRows(parsed.rows.slice(0, 10)); // preview first 10 rows
    }
  }, [parsed]);

  async function verifyJoinField() {
    if (!joinField) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_units")
        .select("pcode")
        .limit(1);
      if (error) console.error(error);
      setMeta({ ...meta, join_field: joinField });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 2 – Preview and Map Join Field
        </h2>
        <p className="mb-3">
          Review the uploaded data and select which column corresponds to the{" "}
          <strong>join field</strong> (e.g., admin PCode) for linking with
          administrative units at level {meta?.admin_level ?? "—"}.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking join field against admin units…
          </div>
        ) : parsed && headers.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-3 mb-4 items-end">
              <div>
                <label className="text-xs text-gray-500">Join Field (Column)</label>
                <select
                  value={joinField}
                  onChange={(e) => setJoinField(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select column</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={verifyJoinField}
                disabled={!joinField}
                className="px-3 py-1.5 rounded text-white flex items-center gap-1 text-sm"
                style={{
                  background: joinField
                    ? "var(--gsc-blue)"
                    : "var(--gsc-light-gray)",
                }}
              >
                <MapPin className="h-4 w-4" />
                Verify Join
              </button>
            </div>

            <div className="overflow-auto border rounded-lg bg-white">
              <table className="min-w-full text-xs">
                <thead className="bg-[var(--gsc-light-gray)]/60">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="p-2 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleRows.map((r, i) => (
                    <tr key={i} className="border-t">
                      {headers.map((h) => (
                        <td
                          key={h}
                          className={`p-2 whitespace-nowrap ${
                            h === joinField
                              ? "bg-[var(--gsc-orange)]/20 font-semibold"
                              : ""
                          }`}
                        >
                          {r[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {sampleRows.length >= 10 && (
                <div className="p-2 text-xs text-gray-500 border-t bg-[var(--gsc-light-gray)]/40">
                  Showing first 10 rows only
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-gray-500">No data available for preview.</div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-3 py-2 rounded border text-sm"
          style={{ borderColor: "var(--gsc-light-gray)" }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!joinField}
          className="px-4 py-2 rounded text-white flex items-center gap-1"
          style={{
            background: joinField
              ? "var(--gsc-blue)"
              : "var(--gsc-light-gray)",
          }}
        >
          Continue
          <Table className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
