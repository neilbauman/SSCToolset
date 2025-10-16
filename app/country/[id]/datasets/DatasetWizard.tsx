"use client";
import { useState, useEffect } from "react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { ChevronLeft, ChevronRight, Upload, Loader2, AlertTriangle, CheckCircle2, Search, Plus, Tag, Info } from "lucide-react";
import TaxonomyPicker from "@/app/configuration/taxonomy/TaxonomyPicker";
import CreateIndicatorInlineModal from "@/components/country/CreateIndicatorInlineModal";

const F = "w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]";
const L = "block text-xs font-medium text-[color:var(--gsc-gray)] mb-1";
const B = "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm";
const P = `${B} bg-[color:var(--gsc-red)] text-white hover:opacity-90 disabled:opacity-50`;
const S = `${B} border hover:bg-gray-50`;

export default function DatasetWizard({ countryIso, onClose, onSaved }) {
  const [step, setStep] = useState(1), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const [title, setTitle] = useState(""), [desc, setDesc] = useState(""), [source, setSource] = useState(""), [sourceUrl, setSourceUrl] = useState(""), [year, setYear] = useState(""),
    [datasetType, setDatasetType] = useState("gradient"), [dataFormat, setDataFormat] = useState("numeric"), [adminLevel, setAdminLevel] = useState("ADM0"), [nationalValue, setNationalValue] = useState("");
  const [file, setFile] = useState(null), [headers, setHeaders] = useState([]), [rows, setRows] = useState([]), [joinColumn, setJoinColumn] = useState("pcode"), [valueColumn, setValueColumn] = useState("value");
  const [categoryMap, setCategoryMap] = useState([]), [taxonomyIds, setTaxonomyIds] = useState([]), [indicatorQuery, setIndicatorQuery] = useState(""), [indicatorList, setIndicatorList] = useState([]),
    [indicatorId, setIndicatorId] = useState(null), [createIndicatorOpen, setCreateIndicatorOpen] = useState(false);

  const next = () => setStep(s => Math.min(s + 1, 5)), prev = () => setStep(s => Math.max(s - 1, 1));

  async function parseCSV(f) {
    return new Promise((resolve, reject) => {
      Papa.parse(f, { header: true, dynamicTyping: true, skipEmptyLines: true,
        complete: res => resolve({ headers: res.meta.fields ?? Object.keys(res.data[0] ?? {}), rows: res.data.slice(0, 500) }), error: reject });
    });
  }

  async function handleFile(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setFile(f); const { headers, rows } = await parseCSV(f); setHeaders(headers); setRows(rows);
    const sample = rows.map(r => r[valueColumn]), uniq = new Set(sample.filter(Boolean)), numRatio = [...uniq].filter(v => !isNaN(Number(v))).length / Math.max(uniq.size, 1);
    if (numRatio < 0.5 && uniq.size <= 20) { setDatasetType("categorical"); setCategoryMap([...uniq].map(c => ({ code: c, label: c }))); } else setDatasetType("gradient");
  }

  async function searchIndicators() {
    const { data } = await supabase.from("indicator_catalogue").select("id,name,data_type,description").order("name");
    setIndicatorList((data ?? []).filter(i => i.name.toLowerCase().includes(indicatorQuery.toLowerCase())));
  }
  useEffect(() => { if (step === 4) searchIndicators(); }, [step]);

  async function saveAll() {
    setBusy(true); setError(null);
    try {
      const { data: meta, error: mErr } = await supabase.from("dataset_metadata").insert({
        title, description: desc, source, source_url: sourceUrl, year: year === "" ? null : Number(year),
        admin_level: adminLevel, data_type: datasetType, data_format: dataFormat, country_iso: countryIso, indicator_id: indicatorId ?? null
      }).select().single();
      if (mErr) throw mErr; const id = meta.id;
      if (indicatorId) await supabase.from("catalogue_indicator_links").insert({ dataset_id: id, indicator_id: indicatorId });
      if (adminLevel === "ADM0" && nationalValue.trim()) {
        await supabase.from("dataset_values").insert([{ dataset_id: id, admin_pcode: "ADM0", admin_level: "ADM0", value: dataFormat === "text" ? null : Number(nationalValue.replace("%", "")), text_value: dataFormat === "text" ? nationalValue : null }]);
        setStep(5); onSaved(); return;
      }
      if (datasetType === "gradient") {
        const rowsToInsert = rows.filter(r => r[joinColumn] && r[valueColumn] != null).map(r => ({
          dataset_id: id, admin_pcode: String(r[joinColumn]).trim(), admin_level: adminLevel,
          value: dataFormat === "text" ? null : Number(r[valueColumn]), text_value: dataFormat === "text" ? String(r[valueColumn]) : null
        })); if (rowsToInsert.length) await supabase.from("dataset_values").insert(rowsToInsert);
      } else {
        const maps = categoryMap.map(m => ({ dataset_id: id, code: m.code, label: m.label, score: null }));
        if (maps.length) await supabase.from("dataset_category_maps").insert(maps);
        const catRows = rows.map(r => { const c = String(r[valueColumn]).trim(), m = categoryMap.find(x => x.code === c); return { dataset_id: id, admin_pcode: String(r[joinColumn]).trim(), admin_level: adminLevel, category_code: c, category_label: m?.label ?? c }; });
        if (catRows.length) await supabase.from("dataset_values_cat").insert(catRows);
      }
      setStep(5); onSaved();
    } catch (e) { setError(e.message || "Save failed."); } finally { setBusy(false); }
  }

  const canNext = !!title && !!datasetType && !!dataFormat && !!adminLevel, canSave = adminLevel === "ADM0" ? !!nationalValue.trim() : rows.length > 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Add Dataset</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">✕</button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {error && <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2"><AlertTriangle className="w-4 h-4" />{error}</div>}
          <div className="text-xs text-gray-500">Step {step}/5</div>

          {/* Step 1 */}
          {step === 1 && (
            <section className="space-y-4">
              <div><label className={L}>Title *</label><input className={F} value={title} onChange={e=>setTitle(e.target.value)} /></div>
              <div><label className={L}>Description</label><textarea className={F} rows={3} value={desc} onChange={e=>setDesc(e.target.value)} /></div>
              <div className="grid md:grid-cols-2 gap-3"><div><label className={L}>Source</label><input className={F} value={source} onChange={e=>setSource(e.target.value)} /></div><div><label className={L}>Source URL</label><input className={F} value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} /></div></div>
              <div className="grid md:grid-cols-3 gap-3">
                <div><label className={L}>Dataset Type</label><select className={F} value={datasetType} onChange={e=>setDatasetType(e.target.value)}><option value="gradient">Gradient</option><option value="categorical">Categorical</option></select></div>
                <div><label className={L}>Data Format</label><select className={F} value={dataFormat} onChange={e=>setDataFormat(e.target.value)}><option value="numeric">Numeric</option><option value="percentage">Percentage</option><option value="text">Text</option></select></div>
                <div><label className={L}>Admin Level</label><select className={F} value={adminLevel} onChange={e=>setAdminLevel(e.target.value)}>{["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"].map(a=><option key={a}>{a}</option>)}</select></div>
              </div>
              {adminLevel==="ADM0"&&<div><label className={L}>National Value ({dataFormat})</label><input className={F} value={nationalValue} onChange={e=>setNationalValue(e.target.value)} /></div>}
              <div><label className={L}>Year</label><input type="number" className={F} value={year} onChange={e=>setYear(e.target.value?Number(e.target.value):"")} /></div>
            </section>
          )}

          {/* Step 2 */}
          {step===2&&adminLevel!=="ADM0"&&(
            <section className="space-y-4">
              <div><label className={L}>Upload CSV</label><input type="file" accept=".csv" className="text-sm" onChange={handleFile} /></div>
              {rows.length>0&&<div className="border rounded p-2 max-h-60 overflow-auto text-xs"><div className="text-[11px] text-gray-500 mb-2">Preview</div>
                <table className="min-w-full"><thead><tr>{headers.map(h=><th key={h} className="text-left px-2 py-1 border-b">{h}</th>)}</tr></thead>
                  <tbody>{rows.slice(0,10).map((r,i)=><tr key={i} className="odd:bg-gray-50">{headers.map(h=><td key={h} className="px-2 py-1 border-b">{String(r[h]??"")}</td>)}</tr>)}</tbody></table></div>}
            </section>
          )}

          {/* Step 3 */}
          {step===3&&datasetType==="categorical"&&(
            <section className="space-y-3">
              <div className="flex justify-between items-center"><label className="font-medium text-sm">Detected Categories</label>
                <button className={S} onClick={()=>setCategoryMap([])}>Clear</button></div>
              {categoryMap.map((m,i)=><div key={i} className="grid grid-cols-2 gap-2"><input className={F} value={m.code} readOnly/><input className={F} value={m.label} onChange={e=>{const arr=[...categoryMap];arr[i].label=e.target.value;setCategoryMap(arr);}}/></div>)}
              {!categoryMap.length&&<p className="text-xs text-gray-500">No categories detected yet.</p>}
            </section>
          )}

          {/* Step 4 */}
          {step===4&&(
            <section className="space-y-4">
              <div><label className={L}>Taxonomy</label><TaxonomyPicker selectedIds={taxonomyIds} onChange={setTaxonomyIds} /></div>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className={L}>Link Indicator</label>
                  <div className="flex items-center gap-2"><input className={F} placeholder="Search..." value={indicatorQuery} onChange={e=>setIndicatorQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchIndicators()}/>
                    <button className={S} onClick={searchIndicators}><Search className="w-4 h-4"/></button></div>
                  <div className="mt-2 max-h-48 overflow-auto border rounded">
                    {indicatorList.map(it=><div key={it.id} onClick={()=>setIndicatorId(it.id)} className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${indicatorId===it.id?"bg-gray-100":""}`}>
                      <div className="flex justify-between"><div>{it.name}</div><span className="text-[11px] bg-gray-100 px-2 rounded">{it.data_type}</span></div>
                      {it.description&&<div className="text-xs text-gray-500">{it.description}</div>}
                    </div>)}
                  </div>
                </div>
                <div className="flex items-end"><button className={S} onClick={()=>setCreateIndicatorOpen(true)}><Plus className="w-4 h-4"/>New</button></div>
              </div>
              <p className="text-[11px] text-gray-500 flex items-center gap-1"><Tag className="w-4 h-4"/>Link or create an indicator.</p>
              <CreateIndicatorInlineModal open={createIndicatorOpen} onClose={()=>setCreateIndicatorOpen(false)} taxonomyDefault={taxonomyIds} onCreated={id=>{setIndicatorId(id);setCreateIndicatorOpen(false);}}/>
            </section>
          )}

          {step===5&&<div className="text-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4"/>Dataset saved.</div>}
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3 bg-gray-50">
          <button className={S} onClick={step===1?onClose:prev}><ChevronLeft className="w-4 h-4"/>{step===1?"Cancel":"Back"}</button>
          {step<4&&<button className={P} onClick={next} disabled={!canNext}>Next<ChevronRight className="w-4 h-4"/></button>}
          {step===4&&<button className={P} onClick={saveAll} disabled={busy||!canSave}>{busy?<Loader2 className="w-4 h-4 animate-spin"/>:<Upload className="w-4 h-4"/>}Save</button>}
        </div>
      </div>
    </div>
  );
}
