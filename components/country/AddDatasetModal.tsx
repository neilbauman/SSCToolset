"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  X,
  Search,
  FileSpreadsheet,
  Hash,
  Database,
  ChevronRight,
  Check,
  Upload,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onSaved: () => void;
};

type Indicator = {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  unit?: string;
  theme?: string;
  category?: string;
  input_schema?: any;
};

export default function AddDatasetModal({
  open,
  onClose,
  countryIso,
  onSaved,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTheme, setFilterTheme] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(
    null
  );

  // Step 2 data state
  const [value, setValue] = useState<string>("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Step 3 metadata
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch indicators
  useEffect(() => {
    if (!open) return;
    supabase
      .from("indicator_catalogue")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error("Indicator load error:", error);
        else setIndicators(data || []);
      });
  }, [open]);

  const filteredIndicators = indicators.filter((i) => {
    const matchesType =
      filterType === "all" ? true : i.type === filterType.toLowerCase();
    const matchesTheme =
      filterTheme === "all"
        ? true
        : (i.theme || "").toLowerCase() === filterTheme.toLowerCase();
    const matchesSearch = i.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesType && matchesTheme && matchesSearch;
  });

  const resetModal = () => {
    setStep(1);
    setSelectedIndicator(null);
    setValue("");
    setCsvFile(null);
    setTitle("");
    setYear(null);
    setSource("");
    setNotes("");
  };

  const handleSave = async () => {
    if (!selectedIndicator) return;

    const dataset = {
      country_iso: countryIso,
      title: title || selectedIndicator.name,
      year,
      dataset_date: new Date().toISOString(),
      source,
      notes,
      dataset_type: selectedIndicator.type,
      indicator_id: selectedIndicator.id,
    };

    const { data, error } = await supabase
      .from("dataset_metadata")
      .insert([dataset])
      .select("id")
      .single();

    if (error) {
      console.error("Error saving dataset metadata:", error);
      return;
    }

    // If it's a national statistic, save a single value
    if (selectedIndicator.type === "national_statistic") {
      await supabase.from("indicator_results").insert([
        {
          country_iso: countryIso,
          indicator_id: selectedIndicator.id,
          value: Number(value),
          computed_at: new Date().toISOString(),
        },
      ]);
    }

    onSaved();
    resetModal();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto relative">
        <button
          onClick={() => {
            resetModal();
            onClose();
          }}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STEP 1: Indicator selection */}
        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Select Indicator
            </h2>

            <div className="flex gap-2 mb-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All Types</option>
                <option value="national_statistic">National Statistics</option>
                <option value="gradient">Gradient</option>
                <option value="categorical">Categorical</option>
              </select>
              <select
                value={filterTheme}
                onChange={(e) => setFilterTheme(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="all">All Themes</option>
                {[...new Set(indicators.map((i) => i.theme).filter(Boolean))].map(
                  (theme) => (
                    <option key={theme} value={theme!}>
                      {theme}
                    </option>
                  )
                )}
              </select>
              <div className="flex items-center border rounded px-2 py-1 bg-white flex-1">
                <Search className="w-4 h-4 text-gray-500 mr-1" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search indicators..."
                  className="flex-1 text-sm outline-none"
                />
              </div>
            </div>

            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">Name</th>
                  <th>Type</th>
                  <th>Theme</th>
                  <th>Unit</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredIndicators.map((i) => (
                  <tr
                    key={i.id}
                    className="hover:bg-gray-50 border-b last:border-none"
                  >
                    <td className="px-2 py-1">{i.name}</td>
                    <td className="text-center">{i.type}</td>
                    <td className="text-center">{i.theme ?? "—"}</td>
                    <td className="text-center">{i.unit ?? "—"}</td>
                    <td className="text-right pr-2">
                      <button
                        onClick={() => {
                          setSelectedIndicator(i);
                          setStep(2);
                        }}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* STEP 2: Input data */}
        {step === 2 && selectedIndicator && (
          <>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Hash className="w-5 h-5 text-green-600" />
              Provide Data for {selectedIndicator.name}
            </h2>

            {selectedIndicator.type === "national_statistic" && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium">Value</span>
                  <input
                    type="number"
                    step="any"
                    className="border rounded w-full px-2 py-1 mt-1"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </label>
                <p className="text-xs text-gray-600">
                  Unit: {selectedIndicator.unit || "—"}
                </p>
              </div>
            )}

            {selectedIndicator.type !== "national_statistic" && (
              <div className="border rounded p-3 bg-gray-50 text-sm text-gray-700 flex flex-col items-center">
                <FileSpreadsheet className="w-8 h-8 text-gray-500 mb-2" />
                <p className="mb-2 text-center">
                  Upload a CSV containing the indicator data. Include pcode or
                  admin name columns.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) =>
                    setCsvFile(e.target.files ? e.target.files[0] : null)
                  }
                />
              </div>
            )}

            <div className="flex justify-between mt-5">
              <button
                onClick={() => setStep(1)}
                className="px-3 py-1 text-sm border rounded"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
              >
                Next
                <ChevronRight className="w-4 h-4 inline ml-1" />
              </button>
            </div>
          </>
        )}

        {/* STEP 3: Metadata */}
        {step === 3 && (
          <>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Confirm Metadata
            </h2>
            <div className="space-y-2 text-sm">
              <label className="block">
                Title
                <input
                  className="border rounded w-full px-2 py-1 mt-1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="block">
                Year
                <input
                  type="number"
                  className="border rounded w-full px-2 py-1 mt-1"
                  value={year ?? ""}
                  onChange={(e) =>
                    setYear(e.target.value ? Number(e.target.value) : null)
                  }
                />
              </label>
              <label className="block">
                Source
                <input
                  className="border rounded w-full px-2 py-1 mt-1"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </label>
              <label className="block">
                Notes
                <textarea
                  className="border rounded w-full px-2 py-1 mt-1"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>

            <div className="flex justify-between mt-5">
              <button
                onClick={() => setStep(2)}
                className="px-3 py-1 text-sm border rounded"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:opacity-90"
              >
                Save Dataset
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
