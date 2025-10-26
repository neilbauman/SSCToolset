"use client";
import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

type Props = {
  colA: string;
  setColA: (v: string) => void;
  colB: string;
  setColB: (v: string) => void;
  useScalarB: boolean;
  setUseScalarB: (v: boolean) => void;
  scalarB: number;
  setScalarB: (v: number) => void;
  decimals: number;
  setDecimals: (v: number) => void;
  method: string;
  setMethod: (v: string) => void;
  preview: any[];
  showPreview: boolean;
  setShowPreview: (v: boolean) => void;
  previewJoin: () => void;
  loadingPreview: boolean;
  formatNumber: (v: number | null) => string;
};

const ACCENT = "#640811";

export default function WizardComputationPanel({
  colA, setColA, colB, setColB,
  useScalarB, setUseScalarB, scalarB, setScalarB,
  decimals, setDecimals,
  method, setMethod,
  preview, showPreview, setShowPreview,
  previewJoin, loadingPreview, formatNumber
}: Props) {
  return (
    <>
      <div className="flex gap-2 mb-3">
        <input className="border p-1 rounded w-40"
          value={colA} onChange={(e)=>setColA(e.target.value)} placeholder="Column A"/>
        {!useScalarB && (
          <input className="border p-1 rounded w-40"
            value={colB} onChange={(e)=>setColB(e.target.value)} placeholder="Column B"/>
        )}
        <label className="text-xs flex items-center gap-1 ml-auto">
          <input type="checkbox" checked={useScalarB} onChange={(e)=>setUseScalarB(e.target.checked)} />
          Use Scalar B
        </label>
        {useScalarB && (
          <input type="number"
            className="border p-1 rounded w-24 text-right"
            value={scalarB}
            onChange={(e)=>setScalarB(parseFloat(e.target.value||"0"))}/>
        )}
        <select className="border rounded text-xs p-1"
          value={decimals} onChange={(e)=>setDecimals(parseInt(e.target.value))}>
          {[0,1,2,3].map(d=><option key={d} value={d}>{d} dec</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {(["ratio","multiply","sum","difference"] as const).map(m=>(
          <button key={m}
            onClick={()=>setMethod(m)}
            className={`px-2 py-1 border rounded ${method===m?"text-white":""}`}
            style={{background:method===m?ACCENT:"transparent",borderColor:"#e5e7eb"}}>
            {m}
          </button>
        ))}
        <button onClick={previewJoin}
          className="ml-auto px-3 py-1 text-white rounded"
          style={{background:ACCENT}}>
          {loadingPreview?"Loading...":"Preview"}
        </button>
        <button onClick={()=>setShowPreview(!showPreview)}
          className="px-2 text-xs text-gray-600 hover:text-[#640811] flex items-center gap-1">
          {showPreview ? <>Hide Preview <ChevronUp className="w-3 h-3"/></>
                       : <>Show Preview <ChevronDown className="w-3 h-3"/></>}
        </button>
      </div>

      {showPreview && (
        <div className="max-h-64 overflow-y-auto border rounded text-xs mb-4">
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
              {preview.map((r:any,i:number)=>(
                <tr key={i} className="border-t">
                  <td className="p-1">{r.join_key}</td>
                  <td className="p-1">{r.place_name ?? "—"}</td>
                  <td className="p-1 text-right">{formatNumber(r.a)}</td>
                  <td className="p-1 text-right">{formatNumber(r.b)}</td>
                  <td className="p-1 text-right font-medium">{formatNumber(r.derived)}</td>
                  <td className="p-1">{r.join_status === "matched" ? "✅" : "⚠️ missing GIS"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
