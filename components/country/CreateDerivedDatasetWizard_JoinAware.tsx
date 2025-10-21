'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

type Props = { open: boolean; countryIso: string; onClose: () => void };

type DatasetRow = {
  id?: string;              // for “other/derived” rows
  title: string;
  admin_level?: string;
  source: 'core'|'other'|'derived'|'gis';
  table_name: string;       // actual table/view
};

type Option = { key: string; label: string; source: Option['source']; table: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function CreateDerivedDatasetWizard({ open, countryIso, onClose }: Props) {
  // ===== toggles that control the dataset dropdowns =====
  const [incCore, setIncCore] = useState(true);
  const [incOther, setIncOther] = useState(true);
  const [incDerived, setIncDerived] = useState(true);
  const [incGis, setIncGis] = useState(false);

  // ===== datasets =====
  const [options, setOptions] = useState<Option[]>([]);
  const [optA, setOptA] = useState<Option | null>(null);
  const [optB, setOptB] = useState<Option | null>(null);
  const [useScalarB, setUseScalarB] = useState(true);
  const [scalarB, setScalarB] = useState<string>('5.1'); // string input, numeric on call

  // ===== columns chosen for A / B =====
  const [colA, setColA] = useState('population');
  const [colB, setColB] = useState('population');

  // ===== method / admin =====
  const [method, setMethod] = useState<'ratio'|'multiply'|'sum'|'difference'>('ratio');
  const [admin, setAdmin] = useState('ADM4');

  // ===== small previews =====
  const [colsPreviewA, setColsPreviewA] = useState<string[]>([]);
  const [colsPreviewB, setColsPreviewB] = useState<string[]>([]);

  // ===== derived preview =====
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ===== taxonomy =====
  type TermsMap = Record<string, string[]>;   // { category: [term, ...] }
  const [tax, setTax] = useState<TermsMap>({});
  const [catOpen, setCatOpen] = useState<Record<string, boolean>>({});
  const [selCats, setSelCats] = useState<Record<string, boolean>>({});
  const [selTerms, setSelTerms] = useState<Record<string, Record<string, boolean>>>({});

  // ===== meta =====
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  // ----- load datasets based on toggles -----
  useEffect(() => {
    if (!open) return;

    (async () => {
      const merged: Option[] = [];

      // Core (hard-coded tables you ship)
      if (incCore) {
        merged.push(
          { key: 'core:population_data', label: 'Population Data', source: 'core', table: 'population_data' },
          // Add more core tables if desired:
          // { key: 'core:admin_units', label: 'Administrative Boundaries', source: 'core', table: 'admin_units' },
        );
        if (incGis) {
          merged.push({ key: 'core:gis_features', label: 'GIS Features', source: 'core', table: 'gis_features' });
        }
      }

      // Other
      if (incOther) {
        const { data: other } = await supabase
          .from('dataset_metadata')
          .select('id,title,admin_level,source,table_name,country_iso')
          .eq('country_iso', countryIso)
          .eq('source', 'other')
          .order('title');
        (other || []).forEach((d: any) => {
          merged.push({ key: `other:${d.id}`, label: d.title || '(Untitled)', source: 'other', table: d.table_name });
        });
      }

      // Derived
      if (incDerived) {
        const { data: der } = await supabase
          .from('view_derived_dataset_summary')
          .select('derived_dataset_id,derived_title,table_name,admin_level,country_iso')
          .eq('country_iso', countryIso)
          .order('derived_title');
        (der || []).forEach((d: any) => {
          merged.push({ key: `derived:${d.derived_dataset_id}`, label: d.derived_title, source: 'derived', table: d.table_name });
        });
      }

      setOptions(merged);
      // reset choices if they no longer match filter
      if (optA && !merged.find(o => o.key === optA.key)) setOptA(null);
      if (optB && !merged.find(o => o.key === optB.key)) setOptB(null);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, incCore, incOther, incDerived, incGis, countryIso]);

  // ----- load taxonomy categories & terms -----
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('taxonomy_terms')
        .select('category,name')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      const map: TermsMap = {};
      (data || []).forEach((r: any) => {
        if (!map[r.category]) map[r.category] = [];
        map[r.category].push(r.name);
      });
      setTax(map);
      // ensure toggles exist
      const openMap: Record<string, boolean> = {};
      const initSelTerms: Record<string, Record<string, boolean>> = {};
      Object.keys(map).forEach(cat => {
        openMap[cat] = false;
        initSelTerms[cat] = {};
      });
      setCatOpen(openMap);
      setSelTerms(initSelTerms);
      setSelCats({});
    })();
  }, [open]);

  // ----- tiny function: get a few columns for a table -----
  const fetchSampleColumns = async (table: string) => {
    // Ask Postgres for a single row, read keys; or query information_schema
    const { data, error } = await supabase.rpc('introspect_sample_columns', { p_table: table });
    if (error) return [];
    return data as string[];
  };

  useEffect(() => {
    (async () => {
      if (optA) setColsPreviewA(await fetchSampleColumns(optA.table));
      else setColsPreviewA([]);
    })();
  }, [optA]);

  useEffect(() => {
    (async () => {
      if (optB && !useScalarB) setColsPreviewB(await fetchSampleColumns(optB.table));
      else setColsPreviewB([]);
    })();
  }, [optB, useScalarB]);

  // ----- call preview RPC -----
  const runPreview = async () => {
    if (!optA) return;
    setLoadingPreview(true);
    setPreview([]);

    const args: any = {
      p_table_a: optA.table,
      p_table_b: useScalarB ? optA.table : (optB?.table ?? optA.table), // just needs a string, unused if scalar
      p_country: countryIso,
      p_target_level: admin,
      p_method: method,
      p_col_a: colA,
      p_col_b: useScalarB ? colB : colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? Number(scalarB) : null
    };

    const { data, error } = await supabase
      .rpc('simulate_join_preview_autoaggregate', args);

    setLoadingPreview(false);
    if (error) {
      setPreview([{ error: error.message }]);
      return;
    }
    setPreview(data || []);
  };

  // ----- save derived metadata -----
  const saveDerived = async () => {
    if (!optA || !title.trim()) return;

    const chosenCats = Object.entries(selCats)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const chosenTerms: string[] = [];
    chosenCats.forEach(cat => {
      Object.entries(selTerms[cat] || {}).forEach(([term, v]) => v && chosenTerms.push(term));
    });

    await supabase.from('derived_dataset_metadata').insert({
      country_iso: countryIso,
      title,
      description: desc || null,
      admin_level: admin,
      method,
      use_scalar_b: useScalarB,
      scalar_b_val: useScalarB ? Number(scalarB) : null,
      dataset_a_id: null,            // keep null if using core table; set id if you tie back to dataset_metadata
      dataset_b_id: useScalarB ? null : null,
      table_a: optA.table,
      table_b: useScalarB ? null : (optB?.table || null),
      col_a: colA,
      col_b: useScalarB ? null : colB,
      taxonomy_categories: chosenCats,
      taxonomy_terms: chosenTerms
    });

    onClose();      // parent can refresh list
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30">
      <div className="absolute inset-x-0 top-10 mx-auto w-[1060px] max-w-[96vw] rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Create Derived Dataset</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">✕</button>
        </div>

        {/* Source filters */}
        <div className="px-4 py-2 flex flex-wrap gap-4 text-xs">
          {[
            ['Include Core', incCore, setIncCore],
            ['Include Other', incOther, setIncOther],
            ['Include Derived', incDerived, setIncDerived],
            ['Include GIS', incGis, setIncGis]
          ].map(([label, val, setVal]: any) => (
            <label key={label} className="inline-flex items-center gap-2">
              <input type="checkbox" checked={val} onChange={(e)=>setVal(e.target.checked)} />
              {label}
            </label>
          ))}
        </div>

        {/* Top line: title / admin / description */}
        <div className="grid grid-cols-12 gap-3 px-4">
          <input className="col-span-6 rounded border px-3 py-2 text-sm" placeholder="Title"
            value={title} onChange={e=>setTitle(e.target.value)} />
          <select className="col-span-2 rounded border px-2 py-2 text-sm" value={admin} onChange={e=>setAdmin(e.target.value)}>
            {['ADM4','ADM3','ADM2','ADM1','ADM0'].map(a=> <option key={a}>{a}</option>)}
          </select>
          <input className="col-span-4 rounded border px-3 py-2 text-sm" placeholder="Description (optional)"
            value={desc} onChange={e=>setDesc(e.target.value)} />
        </div>

        {/* Dataset A / Dataset B line */}
        <div className="grid grid-cols-12 gap-3 px-4 mt-3">
          <select className="col-span-6 rounded border px-2 py-2 text-sm"
            value={optA?.key || ''} onChange={e=>setOptA(options.find(o=>o.key===e.target.value) || null)}>
            <option value="">Select Dataset A</option>
            {options.map(o=> <option key={o.key} value={o.key}>{`${o.label} [${o.source}]`}</option>)}
          </select>

          <div className="col-span-6 flex items-center gap-2">
            <select disabled={useScalarB} className="grow rounded border px-2 py-2 text-sm"
              value={optB?.key || ''} onChange={e=>setOptB(options.find(o=>o.key===e.target.value) || null)}>
              <option value="">Select Dataset B</option>
              {options.map(o=> <option key={o.key} value={o.key}>{`${o.label} [${o.source}]`}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 text-xs">
              <input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)} />
              Use scalar
            </label>
            <input
              disabled={!useScalarB}
              className="w-16 rounded border px-2 py-1 text-xs text-right"
              value={scalarB}
              onChange={e=>setScalarB(e.target.value)}
            />
          </div>
        </div>

        {/* Columns + Method + Preview button */}
        <div className="grid grid-cols-12 gap-3 px-4 mt-2 items-center">
          {/* A col with mini preview */}
          <div className="col-span-4">
            <div className="text-[11px] font-medium mb-1">Column A</div>
            <div className="flex gap-2">
              <input className="rounded border px-2 py-1 text-xs grow" value={colA} onChange={e=>setColA(e.target.value)} />
              <button
                className="rounded border px-2 text-[11px]"
                onClick={async ()=>optA && setColsPreviewA(await fetchSampleColumns(optA.table))}
              >peek</button>
            </div>
            {!!colsPreviewA.length && (
              <div className="mt-1 text-[10px] text-gray-500 truncate">ex: {colsPreviewA.slice(0,6).join(' · ')}</div>
            )}
          </div>

          {/* Method and hint */}
          <div className="col-span-4">
            <div className="text-[11px] font-medium mb-1">Method</div>
            <div className="flex gap-2">
              <select className="rounded border px-2 py-1 text-xs" value={method}
                onChange={e=>setMethod(e.target.value as any)}>
                <option>ratio</option><option>multiply</option><option>sum</option><option>difference</option>
              </select>
              <div className="text-[11px] text-gray-500 self-center">
                {`Derived = A ${method === 'ratio' ? '÷' : method === 'multiply' ? '×' : method === 'sum' ? '+' : '−'} ${useScalarB ? `scalar(${scalarB || '…'})` : 'B'} → ${admin}`}
              </div>
            </div>
          </div>

          {/* B col with mini preview */}
          <div className="col-span-4">
            <div className="text-[11px] font-medium mb-1">Column B {useScalarB && <span className="text-gray-400">(scalar)</span>}</div>
            <div className="flex gap-2">
              <input disabled={useScalarB} className="rounded border px-2 py-1 text-xs grow"
                value={colB} onChange={e=>setColB(e.target.value)} />
              <button
                disabled={useScalarB || !optB}
                className="rounded border px-2 text-[11px] disabled:opacity-40"
                onClick={async ()=>optB && setColsPreviewB(await fetchSampleColumns(optB.table))}
              >peek</button>
            </div>
            {!!colsPreviewB.length && !useScalarB && (
              <div className="mt-1 text-[10px] text-gray-500 truncate">ex: {colsPreviewB.slice(0,6).join(' · ')}</div>
            )}
          </div>
        </div>

        {/* Derived preview (compact + scroll) */}
        <div className="px-4 mt-3">
          <div className="flex items-center gap-2">
            <button onClick={runPreview} className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">
              {loadingPreview ? 'Previewing…' : 'Preview'}
            </button>
            <div className="text-[11px] text-gray-500">Top 50 rows</div>
          </div>
          <div className="mt-2 max-h-56 overflow-auto rounded border">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-left">
                  {['Pcode','Name','A','B','Derived'].map(h=>(
                    <th key={h} className="px-2 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r:any, i:number)=>(
                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                    {'error' in r ? (
                      <td colSpan={5} className="px-2 py-2 text-red-600">{r.error}</td>
                    ) : (
                      <>
                        <td className="px-2 py-1">{r.out_pcode}</td>
                        <td className="px-2 py-1">{r.place_name}</td>
                        <td className="px-2 py-1 text-right">{r.a}</td>
                        <td className="px-2 py-1 text-right">{useScalarB ? scalarB : r.b}</td>
                        <td className="px-2 py-1 text-right">{r.derived}</td>
                      </>
                    )}
                  </tr>
                ))}
                {!preview.length && (
                  <tr><td colSpan={5} className="px-2 py-6 text-center text-gray-400">No preview</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Taxonomy */}
        <div className="px-4 mt-4">
          <div className="text-xs font-semibold mb-2">Assign Taxonomy</div>
          <div className="grid grid-cols-3 gap-4">
            {Object.keys(tax).map(cat => (
              <div key={cat} className="rounded border p-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={!!selCats[cat]}
                    onChange={e=>{
                      setSelCats(s=>({ ...s, [cat]: e.target.checked }));
                      setCatOpen(o=>({ ...o, [cat]: e.target.checked ? true : false }));
                    }}
                  />
                  {cat}
                  <button
                    className="ml-auto rounded border px-2 text-[10px]"
                    onClick={()=>setCatOpen(o=>({ ...o, [cat]: !o[cat] }))}
                    disabled={!selCats[cat]}
                  >
                    {catOpen[cat] ? 'hide' : 'show'}
                  </button>
                </label>

                {selCats[cat] && catOpen[cat] && (
                  <div className="mt-2 space-y-1 max-h-36 overflow-auto">
                    {tax[cat].map(term => (
                      <label key={term} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={!!selTerms[cat]?.[term]}
                          onChange={e=>{
                            setSelTerms(st => ({
                              ...st,
                              [cat]: { ...(st[cat]||{}), [term]: e.target.checked }
                            }));
                          }}
                        />
                        {term}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t mt-4">
          <button onClick={onClose} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={saveDerived}
            className="rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700">
            Save Derived
          </button>
        </div>
      </div>
    </div>
  );
}
