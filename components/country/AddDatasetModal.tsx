"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import Step1UploadOrDefine from "@/app/country/[id]/datasets/steps/Step1UploadOrDefine";
import Step2PreviewAndMap from "@/app/country/[id]/datasets/steps/Step2PreviewAndMap";
import Step3Indicator from "@/app/country/[id]/datasets/steps/Step3Indicator";
import Step4Save from "@/app/country/[id]/datasets/steps/Step4Save";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

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
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [meta, setMeta] = useState<any>({
    country_iso: countryIso,
    dataset_type: "",
    data_format: "numeric",
    admin_level: "",
    join_field: "",
    category_fields: [],
    value_field: "",
    indicator_id: "",
    title: "",
  });

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  async function parseCsv(f: File): Promise<Parsed> {
    const text = await f.text();
    const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
    const headers = (lines[0] || "").split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((ln) => {
      const cells = ln.split(",");
      return Object.fromEntries(
        headers.map((h, i) => [h, (cells[i] ?? "").trim()])
      );
    });
    return { headers, rows };
  }

  function closeAndReset() {
    onOpenChange(false);
    setStep(1);
    setFile(null);
    setParsed(null);
    setMeta({
      country_iso: countryIso,
      dataset_type: "",
      data_format: "numeric",
      admin_level: "",
      join_field: "",
      category_fields: [],
      value_field: "",
      indicator_id: "",
      title: "",
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) closeAndReset();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--gsc-beige)] p-6 shadow-lg border"
          style={{ borderColor: "var(--gsc-light-gray)" }}>
          <Dialog.Title className="text-lg font-semibold mb-1">
            <span className="px-2 py-1 rounded text-white" style={{ background: "var(--gsc-red)" }}>Add Dataset</span>
          </Dialog.Title>
          <div className="text-sm text-[var(--gsc-gray)] mb-4">
            Step {step}/4 •{" "}
            {["Upload", "Preview", "Select Indicator", "Save"][step - 1]}
          </div>

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
              next={next}
            />
          )}

          {step === 2 && (
            <Step2PreviewAndMap
              parsed={parsed}
              meta={meta}
              setMeta={setMeta}
              next={next}
              back={back}
            />
          )}

          {step === 3 && (
            <Step3Indicator
              meta={meta}
              setMeta={setMeta}
              onBack={back}
              onNext={next}
            />
          )}

          {step === 4 && (
            <Step4Save
              meta={meta}
              parsed={parsed}
              back={back}
              onClose={closeAndReset}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
