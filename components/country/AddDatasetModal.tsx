"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { X } from "lucide-react";

import Step1UploadOrDefine from "@/app/country/[id]/datasets/steps/Step1UploadOrDefine";
import Step2PreviewAndMap from "@/app/country/[id]/datasets/steps/Step2PreviewAndMap";
import Step3Indicator from "@/app/country/[id]/datasets/steps/Step3Indicator";
import Step4Save from "@/app/country/[id]/datasets/steps/Step4Save";

// ─────────────────────────────
// Type stubs for internal state
// ─────────────────────────────
type Parsed = { headers: string[]; rows: Record<string, string>[] } | null;
export type DatasetWizardMeta = {
  id?: string;
  country_iso?: string;
  title?: string;
  dataset_type?: "adm0" | "gradient" | "categorical";
  data_format?: "numeric" | "percentage" | "text";
  admin_level?: string;
  join_field?: string | null;
  year?: string | number | null;
  unit?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  indicator_id?: string | null;
  taxonomy_id?: string | null;
  adm0_value?: string | number | null;
};

export default function AddDatasetModal({
  open,
  onOpenChange,
  countryIso,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  countryIso: string;
}) {
  // ─────────────────────────────
  // Global wizard state
  // ─────────────────────────────
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed>(null);
  const [meta, setMeta] = useState<DatasetWizardMeta>({ country_iso: countryIso });

  function next() {
    setStep((s) => Math.min(s + 1, 4));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function resetAll() {
    setStep(1);
    setFile(null);
    setParsed(null);
    setMeta({ country_iso: countryIso });
  }

  function closeModal() {
    onOpenChange(false);
    setTimeout(resetAll, 300);
  }

  // Optional CSV parser (used by Step 1)
  async function parseCsv(f: File): Promise<Parsed> {
    const text = (await f.text()).replace(/\r/g, "");
    const lines = text.split("\n").filter(Boolean);
    const headers = (lines[0] || "").split(",").map((s) => s.trim());
    const rows = lines.slice(1).map((r) => {
      const cells = r.split(",");
      return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? "").trim()]));
    });
    return { headers, rows };
  }

  // ─────────────────────────────
  // Step component resolver
  // ─────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1UploadOrDefine
            countryIso={countryIso}
            file={file}
            setFile={setFile}
            parseCsv={parseCsv}
            parsed={parsed}
            setParsed={setParsed}
            meta={meta}
            setMeta={setMeta}
            next={next}
          />
        );
      case 2:
        return (
          <Step2PreviewAndMap
            meta={meta}
            setMeta={setMeta}
            parsed={parsed}
            onBack={back}
            onNext={next}
          />
        );
      case 3:
        return (
          <Step3Indicator
            meta={meta}
            setMeta={setMeta}
            onBack={back}
            onNext={next}
          />
        );
      case 4:
        return (
          <Step4Save
            meta={meta}
            parsed={parsed}
            onBack={back}
            onFinish={closeModal}
          />
        );
      default:
        return null;
    }
  };

  // ─────────────────────────────
  // UI
  // ─────────────────────────────
  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? onOpenChange(v) : closeModal())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--gsc-beige)] p-6 shadow-lg focus:outline-none border"
          style={{ borderColor: "var(--gsc-light-gray)" }}
        >
          <div className="flex justify-between items-start mb-3">
            <Dialog.Title className="text-lg font-semibold">
              <span
                className="px-2 py-1 rounded text-white"
                style={{ background: "var(--gsc-red)" }}
              >
                Add Dataset
              </span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-500 hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="text-sm text-[var(--gsc-gray)] mb-4">
            Step {step}/4 •{" "}
            {["Upload", "Preview", "Select Indicator", "Save"][step - 1]}
          </div>

          {renderStep()}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
