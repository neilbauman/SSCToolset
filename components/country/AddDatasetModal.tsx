"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import Step1UploadOrDefine from "@/app/country/[id]/datasets/steps/Step1UploadOrDefine";
import Step2PreviewAndMap from "@/app/country/[id]/datasets/steps/Step2PreviewAndMap";
import Step3Indicator from "@/app/country/[id]/datasets/steps/Step3Indicator";
import Step4Save from "@/app/country/[id]/datasets/steps/Step4Save";

// --- shared CSV parser ---
export type Parsed = { headers: string[]; rows: Record<string, string>[] };
export const parseCsv = async (f: File): Promise<Parsed> => {
  const text = (await f.text()).replace(/\r/g, "");
  const lines = text.split("\n").filter(Boolean);
  const headers = lines[0].split(",").map((s) => s.trim());
  const rows = lines.slice(1).map((r) => {
    const cells = r.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (cells[i] ?? "").trim()]));
  });
  return { headers, rows };
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
  const [step, setStep] = useState(1);
  const [meta, setMeta] = useState<any>({});
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);

  function resetAll() {
    setStep(1);
    setMeta({});
    setFile(null);
    setParsed(null);
  }

  function close() {
    onOpenChange(false);
    resetAll();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--gsc-beige)] p-6 shadow-lg focus:outline-none border"
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
            Step {step}/4 •{" "}
            {["Upload or Define", "Preview & Map", "Select Indicator", "Save"][step - 1]}
          </div>

          {/* --- Step sequence --- */}
          {step === 1 && (
            <Step1UploadOrDefine
              countryIso={countryIso}
              file={file}
              setFile={setFile}
              parseCsv={parseCsv}
              parsed={parsed}
              setParsed={setParsed}
              meta={meta}
              setMeta={setMeta}
              next={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2PreviewAndMap
              meta={meta}
              setMeta={setMeta}
              parsed={parsed}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3Indicator
              meta={meta}
              setMeta={setMeta}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <Step4Save
              meta={meta}
              parsed={parsed}
              onBack={() => setStep(3)}
              onFinish={close}
            />
          )}

          {/* --- Cancel button always available --- */}
          <div className="pt-4 flex justify-end">
            <Dialog.Close asChild>
              <button
                onClick={close}
                className="px-3 py-2 rounded border text-sm"
                style={{ borderColor: "var(--gsc-light-gray)" }}
              >
                Cancel
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
