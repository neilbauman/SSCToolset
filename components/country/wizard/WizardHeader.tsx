"use client";
import React from "react";

type DatasetOption = {
  id: string;
  title: string;
};

type Props = {
  title: string;
  setTitle: (v: string) => void;
  desc: string;
  setDesc: (v: string) => void;
  targetLevel: string;
  setTargetLevel: (v: string) => void;
  datasetA: DatasetOption | null;
  setDatasetA: (v: DatasetOption | null) => void;
  datasetB: DatasetOption | null;
  setDatasetB: (v: DatasetOption | null) => void;
  datasets: DatasetOption[];
  useScalarB: boolean;
};

export default function WizardHeader({
  title, setTitle, desc, setDesc,
  targetLevel, setTargetLevel,
  datasetA, setDatasetA,
  datasetB, setDatasetB,
  datasets, useScalarB
}: Props) {
  return (
    <>
      <div className="flex gap-2 mb-3">
        <input
          className="border p-1 flex-1 rounded"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border p-1 flex-1 rounded"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <select
          className="border p-1 rounded"
          value={targetLevel}
          onChange={(e) => setTargetLevel(e.target.value)}
        >
          {["ADM0","ADM1","ADM2","ADM3","ADM4"].map(lvl => (
            <option key={lvl}>{lvl}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 mb-3">
        <select
          className="border p-1 rounded flex-1"
          value={datasetA?.id || ""}
          onChange={(e) =>
            setDatasetA(datasets.find(d => d.id === e.target.value) || null)
          }
        >
          <option value="">Select Dataset A</option>
          {datasets.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>

        {!useScalarB && (
          <select
            className="border p-1 rounded flex-1"
            value={datasetB?.id || ""}
            onChange={(e) =>
              setDatasetB(datasets.find(d => d.id === e.target.value) || null)
            }
          >
            <option value="">Select Dataset B</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        )}
      </div>
    </>
  );
}
