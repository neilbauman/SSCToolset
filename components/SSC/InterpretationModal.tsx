"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Plus, Trash2, RotateCcw, Play } from "lucide-react";

type DatasetRow = {
  id?: string;
  metric: string;
  source_note: string;
  pillar: string;
  data_type: "gradient" | "categorical";
  norm_method: string | null;
  norm_params: any | null;
  higher_is_better: boolean | null;
  admin_level?: string | null;
};
type Band = { op: "<" | ">=" | "between"; value?: number; min?: number; max?: number; score: number; };
type Props = { open: boolean; dataset: DatasetRow; instanceId: string; onClose: () => void; onUpdated: () => void; };

export default function InterpretationModal({ open, dataset, instanceId, onClose, onUpdated }: Props) {
  const [saving, setSaving] = useState(false), [applying, setApplying] = useState(false);
  const [method, setMethod] = useState("winsor_5_95"), [higherIsWorse, setHigherIsWorse] = useState(true);
  const [bands, setBands] = useState<Band[]>([]), [dataType, setDataType] = useState<"gradient"|"categorical">("gradient");
  const [catScores, setCatScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open || !dataset) return;
    setMethod(dataset.norm_method || "winsor_5_95");
    setHigherIsWorse(dataset.higher_is_better !== false);
    setDataType(dataset.data_type || "gradient");

    let np: any = {}; try { np = typeof dataset.norm_params === "string" ? JSON.parse(dataset.norm_params) : dataset.norm_params || {}; } catch {}
    if (np.bands) setBands(np.bands);
    else if (np.thresholds?.length === 2) {
      const [a,b] = np.thresholds.sort((x:number,y:number)=>x-y);
      setBands([{op:"<",value:a,score:3},{op:"between",min:a,max:b,score:2},{op:">=",value:b,score:1}]);
    }
    setCatScores(np.category_scores || {});
  }, [open, dataset]);

  const normParams = useMemo(() => dataType==="categorical" ? {category_scores:catScores} : method==="threshold_bands" ? {bands} : {}, [dataType,method,bands,catScores]);

  const saveCatalog = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("ssc_dataset_catalog").update({
        data_type:dataType,norm_method:method,norm_params:normParams,higher_is_better:higherIsWorse
      }).eq("metric",dataset.metric).eq("source_note",dataset.source_note);
      if (error) throw error; onUpdated(); alert("Saved interpretation settings.");
    } finally { setSaving(false); }
  };

  const applyNow = async () => {
    setApplying(true);
    try {
      await saveCatalog();
      let error=null;
      if (dataType==="categorical") ({error}=await supabase.rpc("apply_categorical_scoring_for_dataset_instance",{p_dataset_id:dataset.id}));
      else if (method==="threshold_bands") ({error}=await supabase.rpc("apply_threshold_bands_for_dataset_instance",{p_instance_id:instanceId,p_metric:dataset.metric,p_source_note:dataset.source_note}));
      else if (["winsor_5_95","linear_1to4_to_1to5","linear_1to4_to_1to5_invert","winsor_5_95_invert"].includes(method))
        ({error}=await supabase.rpc("apply_normalization_for_dataset_instance",{p_instance_id:instanceId,p_metric:dataset.metric,p_source_note:dataset.source_note}));
      else ({error}=await supabase.rpc("apply_threshold_classification_for_dataset_instance",{p_instance_id:instanceId,p_metric:dataset.metric,p_source_note:dataset.source_note}));
      if (error) throw error; alert("Applied to instance.");
    } finally { setApplying(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-3">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <header className="px-4 py-2 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">Interpret: {dataset.metric} — <span className="text-gray-600">{dataset.source_note}</span> <span className="text-gray-500">({dataset.admin_level||"—"})</span></h3>
          <button onClick={onClose} className="text-gray-600 hover:text-black p-1 rounded"><X className="h-4 w-4" /></button>
        </header>

        <div className="p-4 space-y-4 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="block text-xs text-gray-600 mb-1">Dataset type</label>
              <select value={dataType} onChange={e=>setDataType(e.currentTarget.value as any)} className="w-full border rounded px-2 py-1 text-sm">
                <option value="gradient">Gradient</option><option value="categorical">Categorical</option>
              </select></div>
            <div><label className="block text-xs text-gray-600 mb-1">Method</label>
              <select value={method} onChange={e=>setMethod(e.currentTarget.value)} className="w-full border rounded px-2 py-1 text-sm">
                <option value="winsor_5_95">Winsor (P5–P95)</option>
                <option value="linear_1to4_to_1to5">Linear 1–4→1–5</option>
                <option value="threshold_bands">Threshold Bands</option>
                <option value="winsor_5_95_invert">Winsor invert</option>
                <option value="linear_1to4_to_1to5_invert">Linear invert</option>
              </select></div>
            <div><label className="block text-xs text-gray-600 mb-1">Direction</label>
              <select value={higherIsWorse?"worse":"better"} onChange={e=>setHigherIsWorse(e.currentTarget.value==="worse")} className="w-full border rounded px-2 py-1 text-sm">
                <option value="worse">are worse (↑→5)</option><option value="better">are better (↑→1)</option>
              </select></div>
          </div>

          {dataType==="gradient"&&method==="threshold_bands"&&(
            <div className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Threshold bands</h4>
                <button onClick={()=>setBands([...bands,{op:"<",value:0,score:3}])} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="h-3 w-3"/>Add</button>
              </div>
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50"><tr><th className="p-2 text-left">Op</th><th className="p-2">Min</th><th className="p-2">Max</th><th className="p-2">Score</th><th></th></tr></thead>
                <tbody>{bands.map((b,i)=>(
                  <tr key={i} className="border-t">
                    <td className="p-1"><select value={b.op} onChange={e=>setBands(all=>all.map((x,idx)=>idx===i?{...x,op:e.currentTarget.value as any}:x))} className="border rounded px-1 py-1 text-sm"><option value="<">&lt;</option><option value=">=">&ge;</option><option value="between">between</option></select></td>
                    <td className="p-1"><input type="number" value={b.min??b.value??0} onChange={e=>setBands(all=>all.map((x,idx)=>idx===i?{...x,min:Number(e.currentTarget.value),value:Number(e.currentTarget.value)}:x))} className="border rounded px-1 py-1 w-20 text-sm"/></td>
                    <td className="p-1">{b.op==="between"?<input type="number" value={b.max??0} onChange={e=>setBands(all=>all.map((x,idx)=>idx===i?{...x,max:Number(e.currentTarget.value)}:x))} className="border rounded px-1 py-1 w-20 text-sm"/>:<span className="text-gray-400">—</span>}</td>
                    <td className="p-1"><input type="number" min={1} max={5} value={b.score} onChange={e=>setBands(all=>all.map((x,idx)=>idx===i?{...x,score:Number(e.currentTarget.value)}:x))} className="border rounded px-1 py-1 w-16 text-sm"/></td>
                    <td className="p-1 text-right"><button onClick={()=>setBands(bands.filter((_,j)=>j!==i))} className="text-red-600"><Trash2 className="h-3 w-3"/></button></td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          )}

          {dataType==="categorical"&&(
            <div className="border rounded p-3 space-y-2">
              <h4 className="font-semibold text-sm">Category Scores (1=resilient→4=vulnerable)</h4>
              {Object.entries(catScores).map(([label,val])=>(
                <div key={label} className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm">{label}</span>
                  <input type="number" min={1} max={4} value={val} onChange={e=>setCatScores({...catScores,[label]:Number(e.currentTarget.value)})} className="w-20 border rounded px-2 py-1 text-right text-sm"/>
                </div>
              ))}
              {!Object.keys(catScores).length&&<p className="text-xs text-gray-500">No categories detected. Save to refresh.</p>}
            </div>
          )}
        </div>

        <footer className="p-3 border-t flex items-center justify-end gap-2">
          <button onClick={saveCatalog} disabled={saving||applying} className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50 disabled:opacity-50">{saving?"Saving…":"Save"}</button>
          <button onClick={applyNow} disabled={saving||applying} className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2" title="Apply"><Play className="h-3 w-3"/>{applying?"Applying…":"Apply"}</button>
        </footer>
      </div>
    </div>
  );
}
