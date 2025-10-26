"use client";
import React from "react";

const ACCENT = "#640811";

type DatasetOption = {
  id: string;
  title: string;
  source: "core" | "other" | "derived" | "gis";
  table: string;
};

type Method = "ratio" | "multiply" | "sum" | "difference";

type Props = {
  datasets: DatasetOption[];
  datasetA: DatasetOption | null;
  setDatasetA: (d: DatasetOption | null) => void;
  datasetB: DatasetOption | null;
  setDatasetB: (d: DatasetOption | null) => void;
  colA: string;
  setColA: (v: string) => void;
  colB: string;
  setColB: (v: string) => void;
  method: Method;
  setMethod: (m: Method) => void;
  useScalarB: boolean;
  setUseScalarB: (v: boolean) => void;
  scalarB: number;
  setScalarB: (v: number) => void;
  decimals: number;
  setDecimals: (v: number) => void;
  isParametric: boolean;
  setIsParametric: (v: boolean) => void;
  previewJoin: () => void;
  loadingPreview: boolean;
  preview: any[];
  computedFormula: string;
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
  isParametric,
  setIsParametric,
  previewJoin,
  loadingPreview,
  preview,
  computedFormula,
}: Props) {
  return (
    <>
      {/* Dataset selectors */}
      <div className="flex flex-wrap gap-2 mb-2">
        <div className="flex-1">
          <label className="font-medium text-xs">Dataset A</label>
          <select
            className="border p-1 rounded w-full"
            value={datasetA?.id || ""}
            onChange={(e) =>
              setDatasetA(
                datasets.find((x) => x.id === e.target.value) || null
              )
            }
          >
            <option value="">Select Dataset A</option>
            {(["core", "gis", "other", "derived"] as const).map((group) => (
              <optgroup key={group} label={group.toUpperCase()}>
                {datasets
                  .filter((d) => d.source === group)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        {!useScalarB && (
          <div className="flex-1">
            <label className="font-medium text-xs">Dataset B</label>
            <select
              className="border p-1 rounded w-full"
              value={datasetB?.id || ""}
              onChange={(e) =>
                setDatasetB(
                  datasets.find((x) => x.id === e.target.value) || null
                )
              }
            >
              <option value="">Select Dataset B</option>
              {(["core", "gis", "other", "derived"] as const).map((group) => (
                <optgroup key={group} label={group.toUpperCase()}>
                  {datasets
                    .filter((d) => d.source === group)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Column and scalar inputs */}
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <div>
          <label className="text-xs font-medium">Column A</label>
          <input
            className="border p-1 rounded w-40"
            value={colA}
            onChange={(e) => setColA(e.target.value)}
            placeholder="e.g., population"
          />
        </div>

        {!useScalarB && (
          <div>
            <label className="text-xs font-medium">Column B</label>
            <input
              className="border p-1 rounded w-40"
              value={colB}
              onChange={(e) => setColB(e.target.value)}
              placeholder="e.g., area_sqkm"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="text-xs">
            <input
              type="checkbox"
              checked={useScalarB}
              onChange={(e) => setUseScalarB(e.target.checked)}
            />{" "}
            Use Scalar B
          </label>
          {useScalarB && (
            <input
              type="number"
              value={scalarB}
              onChange={(e) => setScalarB(parseFloat(e.target.value || "0"))}
              className="border rounded w-24 text-right p-1 text-xs"
            />
          )}
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs">
            <input
              type="checkbox"
              checked={isParametric}
              onChange={(e) => setIsParametric(e.target.checked)}
            />{" "}
            Parametric
          </label>

          <select
            className="border rounded text-xs p-1"
            value={decimals}
            onChange={(e) => setDecimals(parseInt(e.target.value))}
            title="Decimals"
          >
            {[0, 1, 2, 3].map((d) => (
              <option key={d} value={d}>
                {d} dec
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Method and preview */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs">Method:</span>
        {(["ratio", "multiply", "sum", "difference"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`px-2 py-1 border rounded ${
              method === m ? "text-white" : ""
            }`}
            style={{
              background: method === m ? ACCENT : "transparent",
              borderColor: "#e5e7eb",
            }}
          >
            {m}
          </button>
        ))}
        <button
          onClick={previewJoin}
          className="ml-auto px-3 py-1 text-white rounded"
          style={{ background: ACCENT }}
        >
          {loadingPreview ? "Loading..." : "Preview"}
        </button>
      </div>

      <p className="text-xs italic mb-2">Derived = {computedFormula}</p>

      {/* Preview Table */}
      <div className="max-h-56 overflow-y-auto border rounded mb-4 text-xs">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-1 text-left">Pcode</th>
              <th className="p-1 text-left">Name</th>
              <th className="p-1 text-right">A</th>
              <th className="p-1 text-right">B</th>
              <th className="p-1 text-right">Derived</th>
              <th className="p-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center italic text-gray-500 py-2"
                >
                  No preview data
                </td>
              </tr>
            ) : (
              preview.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{r.out_pcode ?? ""}</td>
                  <td className="p-1">{r.place_name ?? "—"}</td>
                  <td className="p-1 text-right">
                    {r.a === null || r.a === undefined
                      ? "—"
                      : Number(r.a).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                  </td>
                  <td className="p-1 text-right">
                    {r.b === null || r.b === undefined
                      ? "—"
                      : Number(r.b).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                  </td>
                  <td className="p-1 text-right">
                    {r.derived === null || r.derived === undefined
                      ? "—"
                      : Number(r.derived).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                  </td>
                  <td className="p-1">
                    {r.completeness_warning ?? r.join_status ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
