"use client";

import { Loader2 } from "lucide-react";

type DatasetOption = {
  id: string;
  title: string;
  table: string;
  source: string;
};

type Method = "ratio" | "multiply" | "sum" | "difference";

type Props = {
  datasets: DatasetOption[];
  datasetA: DatasetOption | null;
  setDatasetA: (v: DatasetOption | null) => void;
  datasetB: DatasetOption | null;
  setDatasetB: (v: DatasetOption | null) => void;
  colA: string;
  setColA: (v: string) => void;
  colB: string;
  setColB: (v: string) => void;
  method: Method;
  setMethod: (v: Method) => void;
  useScalarB: boolean;
  setUseScalarB: (v: boolean) => void;
  scalarB: number;
  setScalarB: (v: number) => void;
  decimals: number;
  setDecimals: (v: number) => void;
  onPreview: () => void;
  loadingPreview: boolean;
  accent: string;
};

export default function WizardComputationPanel({
  datasets,
  datasetA,
  setDatasetA,
  datasetB,
  setDatasetB,
  colA,
  setColA,
  colB,
  setColB,
  method,
  setMethod,
  useScalarB,
  setUseScalarB,
  scalarB,
  setScalarB,
  decimals,
  setDecimals,
  onPreview,
  loadingPreview,
  accent,
}: Props) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Dataset Configuration
      </h3>

      {/* Dataset A & B Selectors */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <select
          className="border rounded p-1 flex-1"
          value={datasetA?.id || ""}
          onChange={(e) =>
            setDatasetA(datasets.find((d) => d.id === e.target.value) || null)
          }
        >
          <option value="">Select Dataset A</option>
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>

        {!useScalarB && (
          <select
            className="border rounded p-1 flex-1"
            value={datasetB?.id || ""}
            onChange={(e) =>
              setDatasetB(datasets.find((d) => d.id === e.target.value) || null)
            }
          >
            <option value="">Select Dataset B</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Columns and Scalars */}
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <input
          className="border rounded p-1 w-36"
          value={colA}
          onChange={(e) => setColA(e.target.value)}
          placeholder="Column A"
        />
        {!useScalarB && (
          <input
            className="border rounded p-1 w-36"
            value={colB}
            onChange={(e) => setColB(e.target.value)}
            placeholder="Column B"
          />
        )}
        <label className="text-xs flex items-center gap-1">
          <input
            type="checkbox"
            checked={useScalarB}
            onChange={(e) => setUseScalarB(e.target.checked)}
          />
          Use Scalar B
        </label>
        {useScalarB && (
          <input
            type="number"
            className="border p-1 rounded w-20 text-right"
            value={scalarB}
            onChange={(e) => setScalarB(parseFloat(e.target.value || "0"))}
          />
        )}
        <select
          className="border rounded text-xs p-1"
          value={decimals}
          onChange={(e) => setDecimals(parseInt(e.target.value))}
          title="Decimals"
        >
          {[0, 1, 2, 3].map((d) => (
            <option key={d}>{d} dec</option>
          ))}
        </select>
      </div>

      {/* Methods */}
      <div className="flex items-center gap-2 mb-2">
        {(["ratio", "multiply", "sum", "difference"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`px-2 py-1 border rounded ${
              method === m ? "text-white" : ""
            }`}
            style={{
              background: method === m ? accent : "transparent",
              borderColor: "#e5e7eb",
            }}
          >
            {m}
          </button>
        ))}
        <button
          onClick={onPreview}
          className="ml-auto px-3 py-1 text-white rounded flex items-center gap-1"
          style={{ background: accent }}
        >
          {loadingPreview && (
            <Loader2 size={14} className="animate-spin text-white" />
          )}
          Preview
        </button>
      </div>
    </div>
  );
}
