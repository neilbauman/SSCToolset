"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import Step1UploadOrDefine from "@/app/country/[id]/datasets/steps/Step1UploadOrDefine";
import Step2PreviewAndMap from "@/app/country/[id]/datasets/steps/Step2PreviewAndMap";
import Step3Indicator from "@/app/country/[id]/datasets/steps/Step3Indicator";
import Step4Save from "@/app/country/[id]/datasets/steps/Step4Save";

type Parsed = {
  headers: string[];
  rows: Record<string, string>[];
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
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [meta, setMeta] = useState<any>({ country_iso: countryIso });

  function next() {
    setStep((s) => Math.min(s + 1, 3));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function closeModal() {
    onOpenChange(false);
    setStep(0);
    setFile(null);
    setParsed(null);
    setMeta({ country_iso: countryIso });
  }

  // Simple CSV parser
  async function parseCsv(f: File): Promise<Parsed> {
    const text = await f.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const cells = line.split(",");
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = cells[i]?.trim() || ""));
      return obj;
    });
    return { headers, rows };
  }

  return (
    <Dialog.Root open={open} onOpenChange={closeModal}>
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
            {["Upload", "Preview", "Select Indicator", "Save"][step]}
          </div>

          {/* Steps */}
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
              next={next}
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
              closeModal={closeModal}
            />
          )}

          {/* Cancel */}
          <div className="flex justify-end mt-4">
            <Dialog.Close asChild>
              <button className="px-3 py-2 rounded border">Cancel</button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
