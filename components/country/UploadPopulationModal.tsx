"use client";

import { useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
};

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({
    title: "",
    year: "",
    dataset_date: "",
    source: "",
    notes: "",
    file: null as File | null,
  });

  if (!open) return null;

  const handleDownloadTemplate = () => {
    const headers = ["pcode", "population", "name", "year"];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Population_Template_v1.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!form.file || !form.title.trim()) {
      toast.error("Please provide a title and choose a file.");
      return;
    }

    setLoading(true);
    setProgress(5);

    try {
      // --- Step 1: Read file text using FileReader (safe for Next.js/React) ---
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(form.file as Blob);
      });

      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = parsed.data as any[];

      if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
        throw new Error("CSV appears empty or malformed.");
      }

      const header = parsed.meta.fields.map((h) => h.toLowerCase());
      const required = ["pcode", "population"];
      const missing = required.filter((c) => !header.includes(c));
      if (missing.length) {
        throw new Error(`Missing required columns: ${missing.join(", ")}`);
      }

      // --- Step 2: Create new dataset version (inactive first) ---
      const { data: version, error: versionError } = await supabase
        .from("population_dataset_versions")
        .insert({
          country_iso: countryIso,
          title: form.title.trim(),
          year: form.year ? parseInt(form.year) : null,
          dataset_date: form.dataset_date || null,
          source: form.source || null,
          notes: form.notes || null,
          is_active: false,
        })
        .select()
        .single();

      if (versionError || !version) {
        throw new Error(
          "Failed to create dataset version: " +
            (versionError?.message || "Unknown error")
        );
      }

      // --- Step 3: Deactivate other versions ---
      await supabase
        .from("population_dataset_versions")
        .update({ is_active: false })
        .eq("country_iso", countryIso)
        .neq("id", version.id);

      // --- Step 4: Activate this version ---
      await supabase
        .from("population_dataset_versions")
        .update({ is_active: true })
        .eq("id", version.id);

      // --- Step 5: Prepare population rows ---
      const popRows: any[] = [];
      for (const r of rows) {
        const pcode = r["pcode"] || r["PCODE"] || r["PCode"];
        const population = r["population"] || r["Population"];
        const name = r["name"] || r["Name"] || null;
        const year = r["year"] || form.year || null;

        if (!pcode) continue;

        popRows.push({
          dataset_version_id: version.id,
          country_iso: countryIso,
          pcode,
          name,
          population: population ? parseInt(population) || null : null,
          year: year ? parseInt(year) || null : null,
        });
      }

      if (popRows.length === 0) {
        throw new Error("No valid population rows detected in CSV.");
      }

      // --- Step 6: Deduplicate ---
      const seen = new Set<string>();
      const uniqueRows = popRows.filter((r) => {
        const key = `${r.dataset_version_id}-${r.pcode}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // --- Step 7: Batch insert into population_data ---
      const batchSize = 1000;
      for (let i = 0; i < uniqueRows.length; i += batchSize) {
        const chunk = uniqueRows.slice(i, i + batchSize);
        const { error } = await supabase.from("population_data").insert(chunk);
        if (error) {
          console.error("Batch insert failed:", error);
          throw new Error(`Error inserting population data: ${error.message}`);
        }
        setProgress(Math.round(((i + batchSize) / uniqueRows.length) * 100));
      }

      setProgress(100);
      toast.success("Population dataset uploaded successfully.");
      onUploaded();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [key]: e.target.value });
    };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Upload Population Dataset</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={loading}
          >
            Download Template
          </Button>
        </div>

        <p className="text-xs text-gray-500">
          Upload a CSV containing population data for{" "}
          <strong>{countryIso.toUpperCase()}</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block mb-1 font-medium">Title *</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.title}
              onChange={handleChange("title")}
              placeholder="e.g., Census 2020"
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Year *</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.year}
              onChange={handleChange("year")}
              placeholder="e.g., 2020"
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Dataset Date</span>
            <input
              type="date"
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.dataset_date}
              onChange={handleChange("dataset_date")}
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Source</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.source}
              onChange={handleChange("source")}
              placeholder="e.g., PSA or OCHA"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="block mb-1 font-medium">Notes</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={form.notes}
              onChange={handleChange("notes")}
              placeholder="Optional metadata or comments"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="block mb-1 font-medium">CSV File *</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) =>
                setForm({ ...form, file: e.target.files?.[0] ?? null })
              }
            />
          </label>
        </div>

        {loading && (
          <div className="text-sm text-gray-700">
            Uploading… {progress}%
            <div className="w-full bg-gray-100 rounded mt-1">
              <div
                className="h-1 bg-red-600 rounded"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="bg-red-700 hover:bg-red-800 text-white"
            onClick={handleUpload}
            disabled={loading}
          >
            {loading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
