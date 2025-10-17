"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Step1UploadOrDefine from "@/app/country/[id]/datasets/steps/Step1UploadOrDefine";
import Step2PreviewAndMap from "@/app/country/[id]/datasets/steps/Step2PreviewAndMap";
import Step3Indicator from "@/app/country/[id]/datasets/steps/Step3Indicator";
import Step4Save from "@/app/country/[id]/datasets/steps/Step4Save";

type Parsed = { headers: string[]; rows: Record<string, string>[] };

export default function AddDatasetModal({
  open,
  onOpenChange,
  countryIso,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  countryIso: string;
}) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [meta, setMeta] = useState<any>({
    id: null,
    country_iso: countryIso,
    title: "",
    admin_level: "ADM0",
    data_format: "numeric",
    dataset_type: "", // adm0 | gradient | categorical
    join_field: "admin_pcode",
    year: "",
    unit: "",
    source_name: "",
    source_url: "",
    value_field: "",
    category_fields: [] as string[],
    taxonomy_category: "",
    taxonomy_term_id: "",
    indicator_id: "",
  });

  const [savingMeta, setSavingMeta] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function ensureDatasetMeta() {
    // Prevent duplicate inserts
    if (meta.id) return meta.id;
    try {
      setSavingMeta(true);
      setMessage(null);

      const payload = {
        country_iso: meta.country_iso,
        title: meta.title || "Untitled dataset",
        admin_level: meta.admin_level,
        data_format: meta.data_format,
        dataset_type: meta.dataset_type,
        join_field: meta.join_field,
        year: meta.year || null,
        unit: meta.unit || null,
        source_name: meta.source_name || null,
        source_url: meta.source_url || null,
      };

      const { data, error } = await supabase
        .from("dataset_metadata")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error("No dataset ID returned.");

      setMeta((prev: any) => ({ ...prev, id: data.id }));
      return data.id;
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to create dataset metadata.");
      throw err;
    } finally {
      setSavingMeta(false);
    }
  }

  function next() {
    setStep((s) => Math.min(s + 1, 3));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleNextFromStep1() {
    // When leaving Step 1, make sure metadata exists
    try {
      await ensureDatasetMeta();
      next();
    } catch (err) {
      // error already shown in message
    }
  }

  function closeModal() {
    onOpenChange(false);
    setStep(0);
    setFile(null);
    setParsed(null);
    setMeta({
      id: null,
      country_iso: countryIso,
      title: "",
      admin_level: "ADM0",
      data_format: "numeric",
      dataset_type: "",
      join_field: "admin_pcode",
      year: "",
      unit: "",
      source_name: "",
      source_url: "",
      value_field: "",
      category_fields: [],
      taxonomy_category: "",
      taxonomy_term_id: "",
      indicator_id: "",
    });
  }

  async function parseCsv(f: File): Promise<Parsed> {
    const text = await f.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const cells = line.split(",");
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
      return obj;
    });
    return { headers, rows };
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => (v ? onOpenChange(v) : closeModal())}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--gsc-beige)] p-6 shadow-lg focus:outline-none border"
          style={{ borderColor: "var(--gsc-light-gray)" }}
        >
          <Dialog.Title className="text-lg font-semibold mb-2">
            <span
              className="px-2 py-1 rounded text-white"
              style={{ background: "var(--gsc-red)" }}
            >
              Add Dataset
            </span>
          </Dialog.Title>

          <div className="text-sm mb-4 text-[var(--gsc-gray)]">
            Step {step + 1}/4 •{" "}
            {["Upload / Define", "Preview & Map", "Indicator", "Save"][step]}
          </div>

          {message && (
            <div
              className="mb-3 text-sm"
              style={{
                color: message.includes("Failed")
                  ? "var(--gsc-red)"
                  : "var(--gsc-green)",
              }}
            >
              {message}
            </div>
          )}

          {step === 0 && (
            <Step1UploadOrDefine
              countryIso={countryIso}
              file={file}
              setFile={setFile}
              parseCsv={parseCsv}
              parsed={parsed}
              setParsed={setParsed}
              meta={meta}
              setMeta={setMeta}
              next={handleNextFromStep1}
            />
          )}

          {step === 1 && (
            <Step2PreviewAndMap
              meta={meta}
              setMeta={setMeta}
              parsed={parsed}
              back={back}
              next={next}
            />
          )}

          {step === 2 && (
            <Step3Indicator meta={meta} setMeta={setMeta} back={back} next={next} />
          )}

          {step === 3 && (
            <Step4Save
              meta={meta}
              parsed={parsed}
              back={back}
              onClose={closeModal}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
