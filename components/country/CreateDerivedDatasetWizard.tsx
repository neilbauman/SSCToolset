"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, AlertTriangle } from "lucide-react";

type DatasetMeta = {
  id: string;
  title: string;
  admin_level: string;
  dataset_type: string;
  record_count: number;
};

type AlignmentOption = "keep" | "aggregate" | "disaggregate" | "skip";

interface CreateDerivedDatasetWizardProps {
  countryIso: string;
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function CreateDerivedDatasetWizard({
  countryIso,
  open,
  onClose,
  onComplete,
}: CreateDerivedDatasetWizardProps) {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [alignments, setAlignments] = useState<Record<string, AlignmentOption>>({});
  const [joinKey, setJoinKey] = useState<string>("pcode");
  const [formula, setFormula] = useState<string>("");
  const [targetLevel, setTargetLevel] = useState<string>("ADM3");
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchDatasets = async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id, title, admin_level, dataset_type, record_count")
        .eq("country_iso", countryIso);
      if (!error && data) setDatasets(data);
    };
    fetchDatasets();
  }, [countryIso, open]);

  const selectedDatasets = datasets.filter((d) => selected.includes(d.id));
  const adminLevels = Array.from(new Set(selectedDatasets.map((d) => d.admin_level)));

  // auto-suggest alignments if inconsistent
  useEffect(() => {
    if (adminLevels.length > 1) {
      const newAlign: Record<string, AlignmentOption> = {};
      selectedDatasets.forEach((d) => {
        newAlign[d.id] =
          d.admin_level === targetLevel
            ? "keep"
            : d.admin_level < targetLevel
            ? "disaggregate"
            : "aggregate";
      });
      setAlignments(newAlign);
    }
  }, [selectedDatasets.length]);

  const handleNext = () => setStep((s) => s + 1);
  const handlePrev = () => setStep((s) => s - 1);

  const handleGenerate = async () => {
    setLoading(true);
    // record config — backend function will use it
    const payload = {
      countryIso,
      selected,
      alignments,
      joinKey,
      formula,
      targetLevel,
    };
    console.log("🧠 Derived dataset config:", payload);

    // TODO: call supabase function e.g. create_derived_dataset(payload)
    setTimeout(() => {
      setLoading(false);
      onClose();
      if (onComplete) onComplete();
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#123865]">
            <Brain className="w-5 h-5 text-blue-600" />
            Construct New Derived Dataset
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex justify-between text-xs text-gray-500 mb-4">
          <span className={step === 1 ? "font-semibold text-blue-600" : ""}>1. Select Datasets</span>
          <span className={step === 2 ? "font-semibold text-blue-600" : ""}>2. Resolve Levels</span>
          <span className={step === 3 ? "font-semibold text-blue-600" : ""}>3. Define Join</span>
          <span className={step === 4 ? "font-semibold text-blue-600" : ""}>4. Define Formula</span>
          <span className={step === 5 ? "font-semibold text-blue-600" : ""}>5. Review & Save</span>
        </div>

        {/* Step content */}
        {step === 1 && (
          <div>
            <h3 className="font-semibold mb-2 text-gray-700">Select base datasets</h3>
            <div className="space-y-1 border rounded-lg p-3 max-h-64 overflow-y-auto">
              {datasets.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center justify-between p-2 border-b last:border-none cursor-pointer hover:bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-800">{d.title}</p>
                    <p className="text-xs text-gray-500">
                      {d.admin_level} • {d.dataset_type} • {d.record_count} records
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selected.includes(d.id)}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked
                          ? [...prev, d.id]
                          : prev.filter((x) => x !== d.id)
                      )
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && adminLevels.length > 1 && (
          <div>
            <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" /> Resolve Admin Level Differences
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              Selected datasets use different admin levels. Define how to align them before joining.
            </p>
            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="text-left p-2">Dataset</th>
                  <th className="text-left p-2">Level</th>
                  <th className="text-left p-2">Alignment</th>
                </tr>
              </thead>
              <tbody>
                {selectedDatasets.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="p-2">{d.title}</td>
                    <td className="p-2">{d.admin_level}</td>
                    <td className="p-2">
                      <select
                        className="border rounded p-1 text-sm"
                        value={alignments[d.id] || "keep"}
                        onChange={(e) =>
                          setAlignments({
                            ...alignments,
                            [d.id]: e.target.value as AlignmentOption,
                          })
                        }
                      >
                        <option value="keep">Keep As-Is</option>
                        <option value="aggregate">Aggregate to higher level</option>
                        <option value="disaggregate">Disaggregate to lower level</option>
                        <option value="skip">Skip dataset</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="font-semibold mb-2 text-gray-700">Define Join</h3>
            <p className="text-sm text-gray-600 mb-3">
              Choose the key that links the datasets together (usually <code>pcode</code>).
            </p>
            <input
              type="text"
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value)}
              className="border rounded p-2 w-full text-sm"
            />
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="font-semibold mb-2 text-gray-700">Define Formula</h3>
            <p className="text-sm text-gray-600 mb-3">
              Combine fields or datasets mathematically (e.g.{" "}
              <code>Population / Area</code> → <em>Population Density</em>).
            </p>
            <textarea
              className="border rounded p-2 w-full h-24 text-sm font-mono"
              placeholder="[Population] / [Area]"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
            />
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-600">Target Admin Level</label>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                className="border rounded p-2 w-full mt-1"
              >
                {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <h3 className="font-semibold mb-2 text-gray-700">Review Configuration</h3>
            <div className="bg-gray-50 border rounded p-3 text-sm text-gray-700 space-y-1">
              <p>
                <strong>Country:</strong> {countryIso}
              </p>
              <p>
                <strong>Datasets:</strong>{" "}
                {selectedDatasets.map((d) => d.title).join(", ")}
              </p>
              <p>
                <strong>Join Key:</strong> {joinKey}
              </p>
              <p>
                <strong>Formula:</strong> {formula}
              </p>
              <p>
                <strong>Target Level:</strong> {targetLevel}
              </p>
              {Object.keys(alignments).length > 0 && (
                <p>
                  <strong>Alignments:</strong>{" "}
                  {Object.entries(alignments)
                    .map(([id, a]) => {
                      const title = datasets.find((d) => d.id === id)?.title || id;
                      return `${title}: ${a}`;
                    })
                    .join("; ")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <DialogFooter className="mt-4 flex justify-between">
          <Button
            variant="outline"
            disabled={step === 1 || loading}
            onClick={handlePrev}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 5 && (
            <Button onClick={handleNext} disabled={selected.length < 2}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 5 && (
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {loading ? "Generating..." : "Generate Derived Dataset"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
