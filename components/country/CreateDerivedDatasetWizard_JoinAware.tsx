'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/supabaseBrowser';

type Method = 'ratio' | 'multiply' | 'sum' | 'difference';
type DatasetOption = { table: string; label: string; type: 'Core'|'Other'|'Derived'; admin_level?: string|null; year?: number|null; };
type PreviewRow = { out_pcode: string; place_name: string|null; parent_pcode: string|null; parent_name: string|null; a: number|null; b: number|null; derived: number|null; col_a_used: string|null; col_b_used: string|null; };
type TaxTerm = { id: string; name: string; parent_id: string|null; category: string|null };

type Props = { countryIso: string; defaultAdminLevel?: string; defaultYear?: number; onClose?: () => void };

export default function CreateDerivedDatasetWizard_JoinAware({
  countryIso,
  defaultAdminLevel = 'ADM3',
  defaultYear = new Date().getFullYear(),
  onClose,
}: Props) {
  const router = useRouter();

  // ---------- form state ----------
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [adminLevel, setAdminLevel] = useState(defaultAdminLevel);
  const [year, setYear] = useState<number>(defaultYear);
  const [method, setMethod] = useState<Method>('ratio');
  const [decimals, setDecimals] = useState(0);

  // datasets & columns
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colsA, setColsA] = useState<string[]>([]);
  const [colsB, setColsB] = useState<string[]>([]);
  const [colA, setColA] = useState('');
  const [colB, setColB] = useState('');
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number | null>(null);

  // taxonomy (parent = category, children = terms)
  const [taxonomy, setTaxonomy] = useState<TaxTerm[]>([]);
  const categories = useMemo(() => taxonomy.filter(t => t.parent_id === null), [taxonomy]);
  const termsByCategory = useMemo(() => {
    const map: Record<string, TaxTerm[]> = {};
    taxonomy.forEach(t => {
      if (t.parent_id) {
        map[t.parent_id] = map[t.parent_id] || [];
        map[t.parent_id].push(t);
      }
    });
    return map;
  }, [taxonomy]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([]);

  // preview + peek
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [peekAOpen, setPeekAOpen] = useState(false);
  const [peekBOpen, setPeekBOpen] = useState(false);
  const [peekAData, setPeekAData] = useState<any[]>([]);
  const [peekBData, setPeekBData] = useState<any[]>([]);

  // ---------- load datasets + taxonomy ----------
  useEffect(() => {
    (async () => {
      const sb = supabaseBrowser;

      // view_country_datasets should contain unified list for Core/Other/Derived
      const { data: ds } = await sb
        .from('view_country_datasets')
        .select('*')
        .eq('country_iso', countryIso)
        .order('admin_level', { ascending: true });

      const options: DatasetOption[] = (ds ?? []).map((r: any) => ({
        table: r.table_name ?? r.view_name ?? r.source_table ?? r.id,
        label: r.title ?? r.name ?? r.id,
        type: r.type === 'Core' ? 'Core' : (r.dataset_type === 'derived' ? 'Derived' : 'Other'),
        admin_level: r.admin_level,
        year: r.year,
      }));

      setDatasets(options);

      const { data: tax } = await sb
        .from('taxonomy_terms')
        .select('id,name,parent_id,category')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      setTaxonomy((tax ?? []) as TaxTerm[]);
    })().catch(console.error);
  }, [countryIso]);

  // ---------- columns for A/B ----------
  async function fetchNumericColumns(table: string) {
    const sb = supabaseBrowser;
    const { data, error } = await sb.from(table).select('*').limit(1);
    if (error || !data?.[0]) return [];
    const row = data[0];
    return Object.keys(row).filter((k) => {
      const v = row[k];
      return typeof v === 'number' || (!isNaN(Number(v)) && v !== null && v !== '');
    });
  }
  useEffect(() => { if (datasetA?.table) fetchNumericColumns(datasetA.table).then(setColsA).catch(()=>setColsA([])); }, [datasetA?.table]);
  useEffect(() => {
    if (useScalarB) { setColsB([]); return; }
    if (datasetB?.table) fetchNumericColumns(datasetB.table).then(setColsB).catch(()=>setColsB([]));
  }, [datasetB?.table, useScalarB]);

  // ---------- grouped datasets for dropdown ----------
  const grouped = useMemo(() => ({
    Core: datasets.filter(d => d.type === 'Core'),
    Other: datasets.filter(d => d.type === 'Other'),
    Derived: datasets.filter(d => d.type === 'Derived'),
  }), [datasets]);

  // ---------- formula viz ----------
  const formulaDisplay = useMemo(() => {
    const A = colA || 'A';
    const B = useScalarB ? (scalarB ?? 'B') : (colB || 'B');
    switch (method) {
      case 'ratio': return `${A} ÷ ${B}`;
      case 'multiply': return `${A} × ${B}`;
      case 'sum': return `${A} + ${B}`;
      case 'difference': return `${A} − ${B}`;
      default: return `${A} ? ${B}`;
    }
  }, [method, colA, colB, useScalarB, scalarB]);

  // ---------- peek helpers ----------
  async function peek(table: string | undefined, set: (rows: any[]) => void) {
    if (!table) return set([]);
    const sb = supabaseBrowser;
    const { data, error } = await sb.from(table).select('*').limit(10);
    if (error) { set([]); return; }
    set(data ?? []);
  }

  // ---------- preview join ----------
  async function handlePreview() {
    if (!datasetA?.table || !colA) { alert('Select dataset A and a numeric column.'); return; }
    if (!useScalarB && (!datasetB?.table || !colB)) { alert('Select dataset B and a numeric column (or use scalar).'); return; }

    setLoadingPreview(true);
    try {
      const sb = supabaseBrowser;
      const { data, error } = await sb.rpc('simulate_join_preview_autoaggregate', {
        p_table_a: datasetA.table,
        p_table_b: useScalarB ? null : datasetB?.table ?? null,
        p_country: countryIso,
        p_target_level: adminLevel,
        p_method: method,
        p_col_a: colA,
        p_col_b: useScalarB ? null : colB ?? null,
        p_use_scalar_b: useScalarB,
        p_scalar_b_val: useScalarB ? (scalarB ?? 0) : null,
      });
      if (error) throw error;

      const clamp = (n: number | null) => n == null ? null : Number(n.toFixed(Math.min(2, Math.max(0, decimals))));
      const rows = (data ?? []) as PreviewRow[];
      setPreview(rows.map(r => ({ ...r, a: clamp(r.a), b: clamp(r.b), derived: clamp(r.derived) })));
    } catch (e: any) {
      alert(`Preview failed: ${e.message ?? e}`);
    } finally {
      setLoadingPreview(false);
    }
  }

  // ---------- save ----------
  async function handleSave() {
    if (!title.trim()) { alert('Provide a title.'); return; }
    if (preview.length === 0) { alert('Generate a preview before saving.'); return; }

    setSaving(true);
    try {
      const sb = supabaseBrowser;

      const sources = {
        table_a: datasetA?.table ?? null,
        col_a: colA || null,
        table_b: useScalarB ? null : datasetB?.table ?? null,
        col_b: useScalarB ? null : colB || null,
        method,
        decimals,
        admin_level: adminLevel,
        taxonomy_categories: selectedCategoryIds, // parents
        taxonomy_terms: selectedTermIds,          // children
        description: description || null,
      };

      const rowsToPersist = preview.map(r => ({
        pcode: r.out_pcode,
        name: r.place_name,
        parent_pcode: r.parent_pcode,
        parent_name: r.parent_name,
        a: r.a,
        b: r.b,
        derived: r.derived,
        col_a_used: r.col_a_used,
        col_b_used: r.col_b_used,
      }));

      const { data, error } = await sb.rpc('create_derived_dataset', {
        p_country: countryIso,
        p_title: title,
        p_admin_level: adminLevel,
        p_year: year,
        p_method: method,
        p_sources: JSON.stringify(sources),
        p_scalar_b: useScalarB ? (scalarB ?? null) : null,
        p_rows: JSON.stringify(rowsToPersist),
      });
      if (error) throw error;

      router.refresh();
      alert('Derived dataset saved.');
      onClose?.();
    } catch (e: any) {
      alert(`Save failed: ${e.message ?? e}`);
    } finally {
      setSaving(false);
    }
  }

  // ---------- render ----------
  return (
    <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl">
      {/* Modal header (SSC standard) */}
      <div className="sticky top-0 z-10 border-b p-4 bg-white rounded-t-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold">Create Derived Dataset</div>
          <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm">Close</button>
        </div>
      </div>

      {/* Modal body */}
      <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">

        {/* Basic info */}
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="rounded-lg border p-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <select className="rounded-lg border p-2" value={adminLevel} onChange={e=>setAdminLevel(e.target.value)}>
            {['ADM0','ADM1','ADM2','ADM3','ADM4'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input type="number" className="rounded-lg border p-2" value={year} onChange={e=>setYear(parseInt(e.target.value||'0',10))} />
          <input className="rounded-lg border p-2" placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)} />
        </div>

        {/* Selection */}
        <Section title="Dataset Selection">
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="rounded-lg border p-2" value={method} onChange={e=>setMethod(e.target.value as Method)}>
              <option value="ratio">Ratio (A ÷ B)</option>
              <option value="multiply">Multiply (A × B)</option>
              <option value="sum">Sum (A + B)</option>
              <option value="difference">Difference (A − B)</option>
            </select>
            <select className="rounded-lg border p-2" value={decimals} onChange={e=>setDecimals(Number(e.target.value))}>
              <option value={0}>0 decimals</option><option value={1}>1 decimal</option><option value={2}>2 decimals</option>
            </select>
            <div className="rounded-lg border p-2 text-sm flex items-center justify-center">
              <span className="font-semibold mr-1">Formula:</span> {formulaDisplay}
            </div>
          </div>

          {/* A / B pickers */}
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <DatasetPicker
              title="Dataset A"
              grouped={grouped}
              dataset={datasetA}
              setDataset={(d: DatasetOption|null)=>{ setDatasetA(d); setColA(''); setPeekAOpen(false); setPeekAData([]); }}
              cols={colsA}
              col={colA}
              setCol={setColA}
              onPeek={async ()=>{
                setPeekAOpen(v=>!v);
                if (!peekAOpen) await peek(datasetA?.table, setPeekAData);
              }}
              peekOpen={peekAOpen}
              peekRows={peekAData}
            />

            <DatasetPicker
              title="Dataset B / Scalar"
              grouped={grouped}
              dataset={datasetB}
              setDataset={(d: DatasetOption|null)=>{ setDatasetB(d); setColB(''); setPeekBOpen(false); setPeekBData([]); }}
              cols={colsB}
              col={colB}
              setCol={setColB}
              useScalar={useScalarB}
              setUseScalar={setUseScalarB}
              scalarValue={scalarB}
              setScalarValue={setScalarB}
              onPeek={async ()=>{
                if (useScalarB) return;
                setPeekBOpen(v=>!v);
                if (!peekBOpen) await peek(datasetB?.table, setPeekBData);
              }}
              peekOpen={peekBOpen}
              peekRows={peekBData}
            />
          </div>

          <button onClick={handlePreview} disabled={loadingPreview} className="mt-4 rounded-lg bg-black px-4 py-2 text-white disabled:opacity-60">
            {loadingPreview ? 'Generating Preview…' : 'Generate Preview'}
          </button>
        </Section>

        {/* Preview */}
        <Section title="Preview">
          {preview.length === 0 ? (
            <div className="text-sm text-gray-500">No preview yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr><Th>PCode</Th><Th>Name</Th><Th>Parent</Th><Th>A</Th><Th>B</Th><Th>Derived</Th></tr>
                </thead>
                <tbody>
                  {preview.map(r=>(
                    <tr key={r.out_pcode} className="border-b">
                      <Td>{r.out_pcode}</Td>
                      <Td>{r.place_name}</Td>
                      <Td>{r.parent_name || r.parent_pcode}</Td>
                      <Td>{r.a ?? ''}</Td>
                      <Td>{useScalarB ? (scalarB ?? '') : (r.b ?? '')}</Td>
                      <Td className="font-semibold">{r.derived ?? ''}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Taxonomy */}
        <Section title="Taxonomy">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Categories (parents) */}
            <div>
              <label className="text-sm font-medium">Categories</label>
              <div className="mt-1 rounded-lg border p-2 max-h-48 overflow-auto">
                {categories.length === 0 ? (
                  <div className="text-sm text-gray-500">No categories</div>
                ) : categories.map(c => {
                  const checked = selectedCategoryIds.includes(c.id);
                  return (
                    <label key={c.id} className="block text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e=>{
                          const next = e.target.checked
                            ? [...selectedCategoryIds, c.id]
                            : selectedCategoryIds.filter(x=>x!==c.id);
                          setSelectedCategoryIds(next);
                          // When a category is unchecked, drop its child terms
                          if (!e.target.checked) {
                            const childIds = (termsByCategory[c.id] ?? []).map(t=>t.id);
                            setSelectedTermIds(prev => prev.filter(id => !childIds.includes(id)));
                          }
                        }}
                      />{' '}
                      {c.name}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Terms (children by selected categories) */}
            <div>
              <label className="text-sm font-medium">Terms</label>
              <div className="mt-1 rounded-lg border p-2 max-h-48 overflow-auto">
                {selectedCategoryIds.length === 0 ? (
                  <div className="text-sm text-gray-500">Select at least one category to see its terms</div>
                ) : (
                  selectedCategoryIds.flatMap(catId => (termsByCategory[catId] ?? [])).map(t => {
                    const checked = selectedTermIds.includes(t.id);
                    return (
                      <label key={t.id} className="block text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e=>{
                            setSelectedTermIds(e.target.checked
                              ? [...selectedTermIds, t.id]
                              : selectedTermIds.filter(id => id !== t.id));
                          }}
                        />{' '}
                        {t.name}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Section>

      </div>

      {/* Modal footer (SSC standard) */}
      <div className="sticky bottom-0 z-10 border-t p-4 bg-white rounded-b-2xl flex items-center justify-between">
        <span className="text-xs text-gray-500">Saving calls <code>create_derived_dataset</code> and refreshes the list.</span>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} disabled={saving || preview.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Derived Dataset'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- small helpers (inline, no drift) ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <button type="button" onClick={()=>setOpen(!open)} className="w-full flex items-center justify-between p-4">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-gray-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="border-t p-4">{children}</div>}
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) { return <th className="px-3 py-2 text-xs font-semibold text-gray-600">{children}</th>; }
function Td({ children, className }: { children: React.ReactNode; className?: string }) { return <td className={`px-3 py-2 ${className ?? ''}`}>{children}</td>; }

function DatasetPicker({
  title, grouped, dataset, setDataset, cols, col, setCol,
  useScalar, setUseScalar, scalarValue, setScalarValue,
  onPeek, peekOpen, peekRows,
}: {
  title: string;
  grouped: Record<'Core'|'Other'|'Derived', DatasetOption[]>;
  dataset: DatasetOption | null;
  setDataset: (d: DatasetOption | null) => void;
  cols: string[]; col: string; setCol: (c: string) => void;
  useScalar?: boolean; setUseScalar?: (b: boolean) => void;
  scalarValue?: number | null; setScalarValue?: (n: number | null) => void;
  onPeek?: () => void; peekOpen?: boolean; peekRows?: any[];
}) {
  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{title}</div>
        {typeof setUseScalar === 'function' && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!useScalar} onChange={e=>setUseScalar?.(e.target.checked)} />
            Scalar
          </label>
        )}
      </div>

      {!useScalar ? (
        <>
          <div className="flex gap-2">
            <select
              className="w-full rounded-lg border p-2"
              value={dataset?.table ?? ''}
              onChange={(e)=>{
                const t = e.target.value;
                const found =
                  grouped.Core.find(d=>d.table===t) ||
                  grouped.Other.find(d=>d.table===t) ||
                  grouped.Derived.find(d=>d.table===t) || null;
                setDataset(found);
              }}
            >
              <option value="">Select dataset…</option>
              {(['Core','Other','Derived'] as const).map(g => (
                <optgroup key={g} label={g}>
                  {grouped[g].map(d => (
                    <option key={d.table} value={d.table}>
                      {d.label}{d.year ? ` (${d.year})` : ''}{d.admin_level ? ` · ${d.admin_level}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              onClick={onPeek}
              disabled={!dataset?.table}
              className="rounded-lg border px-3 text-sm disabled:opacity-50"
              title="Peek first rows"
            >
              🔍 Peek
            </button>
          </div>

          {cols.length > 0 && (
            <select className="mt-2 w-full rounded-lg border p-2" value={col} onChange={e=>setCol(e.target.value)}>
              <option value="">Select numeric column…</option>
              {cols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* inline peek area */}
          {peekOpen && (peekRows?.length ?? 0) > 0 && (
            <div className="mt-3 border rounded-lg overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>{Object.keys(peekRows![0]).map(k=> <th key={k} className="px-2 py-1 text-left text-[11px] text-gray-600">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {peekRows!.map((r,i)=>(
                    <tr key={i} className="border-t">
                      {Object.keys(peekRows![0]).map(k=> <td key={k} className="px-2 py-1">{String((r as any)[k])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <input
          type="number"
          className="w-full rounded-lg border p-2"
          placeholder="Scalar value"
          value={scalarValue ?? ''}
          onChange={e=>setScalarValue?.(e.target.value ? parseFloat(e.target.value) : null)}
        />
      )}
    </div>
  );
}
