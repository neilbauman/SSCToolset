"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { ChevronLeft, ChevronRight, Upload, Loader2, CheckCircle2 } from "lucide-react";
import Step1Meta from "./steps/Step1Meta";
import Step2Upload from "./steps/Step2Upload";
import Step3Category from "./steps/Step3Category";
import Step4Indicator from "./steps/Step4Indicator";
import Step5Success from "./steps/Step5Success";

type Props = { countryIso: string; onClose: () => void; onSaved: () => void };

export default function DatasetWizard({ countryIso, onClose, onSaved }: Props) {
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // shared dataset meta
  const [meta, setMeta] = useState({
    title: "",
    desc: "",
    source: "",
    sourceUrl: "",
    year: "",
    datasetType: "gradient",
    dataFormat: "numeric",
    adminLevel: "ADM2",
    nationalValue: "",
  });

  // upload + parsed data
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [joinColumn, setJoinColumn] = useState("");
  const [nameColumn, setNameColumn] = useState("");
  const [matchInfo, setMatchInfo] = useState<any>(null);

  // categories
  const [categoryCols, setCategoryCols] = useState<string[]>([]);
  const [categoryMap, setCategoryMap] = useState<{ code: string; label: string }[]>([]);

  // taxonomy / indicator
  const [taxonomyIds, setTaxonomyIds] = useState<string[]>([]);
  const [indicatorId, setIndicatorId] = useState<string | null>(null);

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const prev = () => setStep((s) => Math.max(s - 1, 1));
  const canNext = meta.title && meta.datasetType && meta.dataFormat && meta.adminLevel;
  const canSave = rows.length > 0 || (meta.adminLevel === "ADM0" && meta.nationalValue.trim());

  async function saveDataset() {
    setBusy(true);
    setError(null);
    try {
      const { data: inserted, error: mErr } = await supabase
        .from("dataset_metadata")
        .insert({
          title: meta.title,
          description: meta.desc,
          source: meta.source,
          source_url: meta.sourceUrl,
          year: meta.year === "" ? null : Number(meta.year),
          admin_level: meta.adminLevel,
          data_type: meta.datasetType,
          data_format: meta.dataFormat,
          country_iso: countryIso,
          indicator_id: indicatorId ?? null,
        })
        .select()
        .single();

      if (mErr) throw mErr;
      const id = inserted.id;

      if (meta.adminLevel === "ADM0" && meta.nationalValue.trim()) {
        await supabase.from("dataset_values").insert([
          {
            dataset_id: id,
            admin_pcode: "ADM0",
            admin_level: "ADM0",
            value:
              meta.dataFormat === "text"
                ? null
                : Number(meta.nationalValue.replace("%", "")),
            text_value: meta.dataFormat === "text" ? meta.nationalValue : null,
          },
        ]);
        setStep(5);
        onSaved();
        return;
      }

      // handle rows + categories
      const d: any[] = [];
      rows.forEach((r) => {
        if (categoryCols.length)
          categoryCols.forEach((c) =>
            d.push({
              dataset_id: id,
              admin_pcode: String(r[joinColumn] ?? "").trim(),
              admin_level: meta.adminLevel,
              category_label: c,
              value: Number(r[c] ?? 0),
            })
          );
        else {
          const f = headers.find((h) => h !== joinColumn && h !== nameColumn);
          if (f)
            d.push({
              dataset_id: id,
              admin_pcode: String(r[joinColumn] ?? "").trim(),
              admin_level: meta.adminLevel,
              value: Number(r[f] ?? 0),
            });
        }
      });
      if (d.length) await supabase.from("dataset_values").insert(d);

      if (meta.datasetType === "categorical" && categoryMap.length) {
        const maps = categoryMap.map((m) => ({
          dataset_id: id,
          code: m.code,
          label: m.label,
          score: null,
        }));
        await supabase.from("dataset_category_maps").insert(maps);
      }

      setStep(5);
      onSaved();
    } catch (e: any) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
            Add Dataset
          </h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              ⚠ {error}
            </div>
          )}

          <div className="text-xs text-gray-500">Step {step}/5</div>

          {step === 1 && <Step1Meta meta={meta} setMeta={setMeta} />}
          {step === 2 && (
            <Step2Upload
              meta={meta}
              headers={headers}
              setHeaders={setHeaders}
              rows={rows}
              setRows={setRows}
              joinColumn={joinColumn}
              setJoinColumn={setJoinColumn}
              nameColumn={nameColumn}
              setNameColumn={setNameColumn}
              matchInfo={matchInfo}
              setMatchInfo={setMatchInfo}
            />
          )}
          {step === 3 && (
            <Step3Category
              headers={headers}
              joinColumn={joinColumn}
              nameColumn={nameColumn}
              categoryCols={categoryCols}
              setCategoryCols={setCategoryCols}
              categoryMap={categoryMap}
              setCategoryMap={setCategoryMap}
            />
          )}
          {step === 4 && (
            <Step4Indicator
              taxonomyIds={taxonomyIds}
              setTaxonomyIds={setTaxonomyIds}
              indicatorId={indicatorId}
              setIndicatorId={setIndicatorId}
            />
          )}
          {step === 5 && <Step5Success />}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3 bg-gray-50">
          <button
            className="inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm hover:bg-gray-50"
            onClick={step === 1 ? onClose : prev}
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 && (
            <button
              className="inline-flex items-center gap-2 bg-[color:var(--gsc-red)] text-white rounded-md px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
              onClick={next}
              disabled={!canNext}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 4 && (
            <button
              className="inline-flex items-center gap-2 bg-[color:var(--gsc-red)] text-white rounded-md px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50"
              onClick={saveDataset}
              disabled={busy || !canSave}
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Save
            </button>
          )}

          {step === 5 && (
            <button
              className="inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm"
              onClick={onClose}
            >
              <CheckCircle2 className="w-4 h-4" /> Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
