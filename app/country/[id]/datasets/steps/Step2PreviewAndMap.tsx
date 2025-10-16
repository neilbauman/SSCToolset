"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Check } from "lucide-react";

type Parsed = { headers: string[]; rows: Record<string, string>[] } | null;

export default function Step2PreviewAndJoin({
  meta,
  setMeta,
  parsed,
  onBack,
  onNext,
}: {
  meta: any;
  setMeta: (m: any) => void;
  parsed: Parsed;
  onBack: () => void;
  onNext: () => void;
}) {
  const [joinField, setJoinField] = useState(meta?.join_field || "");
  const [admSample, setAdmSample] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isAdm0 = meta?.admin_level === "ADM0";

  // --- Load a sample of valid Pcodes for chosen admin level
  useEffect(() => {
    if (isAdm0) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("admin_units")
          .select("pcode")
          .eq("admin_level", meta?.admin_level)
          .limit(10);
        if (error) throw error;
        setAdmSample(data.map((d) => d.pcode));
      } catch (err: any) {
        console.error(err);
        setAdmSample([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [meta?.admin_level, isAdm0]);

  const previewRows = useMemo(() => {
    if (!parsed?.rows?.length) return [];
    return parsed.rows.slice(0, 8);
  }, [parsed]);

  const canContinue = isAdm0 || (!!joinField && parsed?.rows?.length);

  return (
    <div className="space-y-4 text-sm text-[var(--gsc-gray)]">
      <h3 className="text-lg font-semibold text-[var(--gsc-blue)]">
        Step 2 – Preview & Join Mapping
      </h3>
      <p>
        Verify the data structure below. Select which column represents the
        <strong> join field </strong> that contains administrative pcodes for 
        {isAdm0 ? "national (ADM0)" : meta?.admin_level} linkage.
      </p>

      {/* ADM0 path */}
      {isAdm0 && (
        <div className="rounded-xl border bg-white p-4 space-y-2">
          <p className="text-sm">
            This dataset defines a single ADM0 value — no join mapping is needed.
          </p>
          <div className="flex items-center gap-2 text-[var(--gsc-green)]">
            <Check className="h-4 w-4" /> ADM0 ready.
          </div>
        </div>
      )}

      {/* CSV preview path */}
      {!isAdm0 && (
        <div className="rounded-xl border bg-white p-3 overflow-auto">
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr>
                {parsed?.headers?.map((h) => (
                  <th
                    key={h}
                    className="border-b px-2 py-1 text-left font-semibold bg-[var(--gsc-beige)]"
                    style={{ borderColor: "var(--gsc-light-gray)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((r, i) => (
                <tr key={i}>
                  {parsed?.headers?.map((h) => (
                    <td
                      key={h}
                      className="border-t px-2 py-1 whitespace-nowrap"
                      style={{ borderColor: "var(--gsc-light-gray)" }}
                    >
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {previewRows.length === 0 && (
            <div className="text-center text-gray-500 py-3">No data to preview.</div>
          )}
        </div>
      )}

      {/* Join field selector */}
      {!isAdm0 && parsed?.headers?.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Join Field (Column Name)</label>
          <select
            value={joinField}
            onChange={(e) => setJoinField(e.target.value)}
            className="border rounded p-2 w-full"
          >
            <option value="">Select join field…</option>
            {parsed.headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking admin codes…
            </div>
          ) : admSample.length > 0 ? (
            <div className="text-xs text-gray-600">
              Example valid pcodes ({meta?.admin_level}): 
              {admSample.slice(0, 5).join(", ")} …
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">No admin sample available.</div>
          )}
        </div>
      )}

      {message && (
        <div
          className="text-sm"
          style={{
            color: message.includes("error")
              ? "var(--gsc-red)"
              : "var(--gsc-green)",
          }}
        >
          {message}
        </div>
      )}

      <div className="flex justify-between pt-5">
        <button onClick={onBack} className="px-3 py-2 rounded border">
          Back
        </button>
        <button
          disabled={!canContinue}
          onClick={() => {
            setMeta({
              ...meta,
              join_field: joinField || "admin_pcode",
            });
            onNext();
          }}
          className="px-4 py-2 rounded text-white"
          style={{
            background: canContinue
              ? "var(--gsc-blue)"
              : "var(--gsc-light-gray)",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
