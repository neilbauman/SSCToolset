"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function Step4Save({ meta, parsed, back, onClose }: any) {
  const [status, setStatus] = useState("");

  async function handleSave() {
    if (!meta?.id) {
      setStatus("Missing dataset metadata ID.");
      return;
    }

    const rows =
      parsed?.rows?.map((r: any) => ({
        id: crypto.randomUUID(),
        dataset_id: meta.id,
        admin_pcode: r[meta.join_field],
        value: r[meta.value_field] ? Number(r[meta.value_field]) : null,
        admin_level: meta.admin_level,
        category_label: meta.title,
      })) || [];

    if (rows.length === 0) {
      setStatus("No data rows to insert.");
      return;
    }

    console.log("🔍 Prepared rows for insert:", rows.slice(0, 3));

    const { error } = await supabase.from("dataset_values").insert(rows);
    if (error) {
      console.error(error);
      setStatus(`❌ ${error.message}`);
      return;
    }

    // link taxonomy + indicator
    if (meta.indicator_id) {
      await supabase.from("indicator_dataset_links").insert({
        indicator_id: meta.indicator_id,
        dataset_id: meta.id,
      });
    }

    setStatus("✅ Dataset successfully saved.");
  }

  return (
    <div className="text-sm flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)]">
        Step 4 – Save Dataset
      </h2>
      <p>
        Click <b>Save</b> to upload parsed data rows to Supabase. Once saved, this dataset will appear in the catalogue for{" "}
        <b>{meta.country_iso}</b>.
      </p>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded bg-[var(--gsc-blue)] text-white"
        >
          Save Dataset
        </button>
        <button onClick={back} className="px-4 py-2 rounded border">
          ← Back
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded border">
          Close
        </button>
      </div>

      {status && (
        <div
          className={`p-2 rounded ${
            status.includes("✅")
              ? "bg-green-50 text-green-600"
              : status.includes("❌")
              ? "bg-red-50 text-red-600"
              : "bg-yellow-50 text-gray-600"
          }`}
        >
          {status}
        </div>
      )}
    </div>
  );
}
