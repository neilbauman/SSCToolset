"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { UploadModalProps } from "@/types/modals";

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadModalProps) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [datasetDate, setDatasetDate] = useState("");
  const [source, setSource] = useState("");
  const [makeActive, setMakeActive] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setYear("");
      setDatasetDate("");
      setSource("");
      setMakeActive(true);
      setFile(null);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const disabled = !title || !year || !file || busy;

  async function handleSubmit() {
    try {
      setBusy(true);
      setError(null);

      if (!file) throw new Error("Please select a population file to upload.");
      if (!title || !year) throw new Error("Title and year are required.");

      // Upload file to Supabase Storage
      const storagePath = `${countryIso}/population/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("population")
        .upload(storagePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      // Insert version record
      const { error: insertErr } = await supabase.from("population_dataset_versions").insert({
        country_iso: countryIso,
        title,
        year: Number(year),
        dataset_date: datasetDate || null,
        source: source || null,
        is_active: makeActive,
      });

      if (insertErr) throw insertErr;

      // Manage active version
      if (makeActive) {
        await supabase
          .from("population_dataset_versions")
          .update({ is_active: false })
          .eq("country_iso", countryIso)
          .neq("title", title);

        await supabase
          .from("population_dataset_versions")
          .update({ is_active: true })
          .eq("title", title);
      }

      toast.success("Population dataset uploaded successfully.");
      onUploaded?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Upload failed.");
      toast.error(err.message || "Failed to upload dataset.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upload Population Dataset</h3>
        <p className="text-xs text-gray-500">
          Upload a CSV file containing population data for {countryIso.toUpperCase()}.
        </p>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <LabeledInput label="Title *" value={title} onChange={setTitle} />
          <LabeledNumber label="Year *" value={year} onChange={setYear} min={1900} max={2100} />
          <LabeledInput label="Dataset Date" type="date" value={datasetDate} onChange={setDatasetDate} />
          <LabeledInput label="Source" value={source} onChange={setSource} />
        </div>

        <label className="text-sm block">
          <span className="block mb-1 font-medium">File *</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={makeActive}
            onChange={(e) => setMakeActive(e.target.checked)}
          />
          Make this version active
        </label>

        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={disabled}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="text-sm">
      <span className="block mb-1 font-medium">{label}</span>
      <input
        className="w-full border rounded px-2 py-1 text-sm"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="text-sm">
      <span className="block mb-1 font-medium">{label}</span>
      <input
        className="w-full border rounded px-2 py-1 text-sm"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
      />
    </label>
  );
}
