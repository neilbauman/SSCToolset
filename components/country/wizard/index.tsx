'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser as supabase } from '@/lib/supabase/supabaseBrowser';
import { X } from 'lucide-react';

type Method = 'ratio' | 'multiply' | 'sum' | 'difference';
type AdminLevel = 'ADM1' | 'ADM2' | 'ADM3' | 'ADM4';

type DatasetOption = {
  kind: 'core' | 'other';
  key: string;            // 'population_data' for core, title or id for other
  label: string;          // UI label
  joinField?: string;     // known or inferred join field (for display)
};

type TaxonomyState = {
  underlying: boolean;
  crosscutting: boolean;
  ssc: boolean;
  sscTerms: string[]; // keep sub-tags checked
  hazard: boolean;
};

type PreviewRow = {
  out_join_key: string;
  out_place_name: string;
  out_a: number | null;
  out_b: number | null;
  out_derived: number | null;
  out_col_a_used: string;
  out_col_b_used: string;
  out_join_status: string;
  out_source_level_a: string;
  out_source_level_b: string;
  out_target_level: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: {
    id: string;
    title: string;
    description: string | null;
    admin_level: AdminLevel;
    method: Method;
    use_scalar_b: boolean;
    scalar_b_val: number | null;
    dataset_a: string;  // 'population_data' or dataset title/id
    dataset_b: string;
    col_a: string;
    col_b: string;
    decimals: number;
    normalize_percent: boolean;
    is_parametric?: boolean;
    taxonomy?: Partial<TaxonomyState>;
  } | null;
};

export default function DerivedDatasetWizard({
  open,
  onClose,
  countryIso,
  editDataset,
}: Props) {
  const [title, setTitle] = useState(editDataset?.title ?? '');
  const [description, setDescription] = useState(editDataset?.description ?? '');

  const [targetLevel, setTargetLevel] = useState<AdminLevel>(
    (editDataset?.admin_level as AdminLevel) ?? 'ADM3'
  );

  const [method, setMethod] = useState<Method>(
    (editDataset?.method as Method) ?? 'ratio'
  );

  const [useScalarB, setUseScalarB] = useState<boolean>(editDataset?.use_scalar_b ?? false);
  const [scalarBVal, setScalarBVal] = useState<number>(editDataset?.scalar_b_val ?? 0);

  const [normalizePct, setNormalizePct] = useState<boolean>(editDataset?.normalize_percent ?? false);
  const [isParametric, setIsParametric] = useState<boolean>(editDataset?.is_parametric ?? false);

  const [decimals, setDecimals] = useState<number>(editDataset?.decimals ?? 0);

  const [aOption, setAOption] = useState<DatasetOption | null>(null);
  const [bOption, setBOption] = useState<DatasetOption | null>(null);

  // Join column textboxes (display + edit, not required by RPC)
  const [aJoinField, setAJoinField] = useState<string>('pcode');
  const [bJoinField, setBJoinField] = useState<string>('pcode');

  // Column (value) textboxes
  const [colA, setColA] = useState<string>(editDataset?.col_a ?? 'population');
  const [colB, setColB] = useState<string>(editDataset?.col_b ?? 'value');

  const [taxonomy, setTaxonomy] = useState<TaxonomyState>({
    underlying: !!editDataset?.taxonomy?.underlying,
    crosscutting: !!editDataset?.taxonomy?.crosscutting,
    ssc: !!editDataset?.taxonomy?.ssc,
    sscTerms: Array.isArray(editDataset?.taxonomy?.sscTerms) ? editDataset!.taxonomy!.sscTerms! : [],
    hazard: !!editDataset?.taxonomy?.hazard,
  });

  const [datasetOptions, setDatasetOptions] = useState<DatasetOption[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load dataset options (core + other)
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      const core: DatasetOption[] = [
        { kind: 'core', key: 'population_data', label: 'Population [core]', joinField: 'pcode' },
      ];

      const { data, error } = await supabase
        .from('dataset_metadata')
        .select('id,title,join_field,default_join_field,country_iso')
        .eq('country_iso', countryIso)
        .order('title', { ascending: true });

      if (error) {
        if (!cancelled) {
          setDatasetOptions(core);
        }
        return;
      }

      const others: DatasetOption[] =
        (data ?? []).map((d: any) => ({
          kind: 'other',
          key: d.title, // We resolve in the RPC by id or title; title is friendlier
          label: d.title,
          joinField: d.join_field || d.default_join_field || 'pcode',
        })) || [];

      if (!cancelled) {
        setDatasetOptions([...core, ...others]);

        // Hydrate defaults on create or edit
        const defaultA = editDataset
          ? (datasetOptions.find(o => o.label === editDataset!.dataset_a || o.key === editDataset!.dataset_a) ??
             core[0])
          : core[0];

        const defaultB = editDataset
          ? (datasetOptions.find(o => o.label === editDataset!.dataset_b || o.key === editDataset!.dataset_b) ??
             others[0] ??
             core[0])
          : others[0] ?? core[0];

        setAOption(defaultA);
        setBOption(defaultB);

        // Join fields under dropdowns
        setAJoinField(defaultA?.joinField ?? 'pcode');
        setBJoinField(defaultB?.joinField ?? 'pcode');

        // If editing and columns were saved, hydrate them; otherwise set sensible defaults
        if (!editDataset) {
          setColA(defaultA?.kind === 'core' ? 'population' : 'value');
          setColB(defaultB?.kind === 'core' ? 'population' : 'value');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, countryIso]); // eslint-disable-line

  // Keep column defaults in sync when dataset changes (unless user edited manually)
  useEffect(() => {
    if (!aOption) return;
    if (editDataset) return; // respect edited values
    setColA(aOption.kind === 'core' ? 'population' : 'value');
    setAJoinField(aOption.joinField ?? 'pcode');
  }, [aOption]); // eslint-disable-line

  useEffect(() => {
    if (!bOption) return;
    if (editDataset) return;
    setColB(bOption.kind === 'core' ? 'population' : 'value');
    setBJoinField(bOption.joinField ?? 'pcode');
  }, [bOption]); // eslint-disable-line

  const preview = async () => {
    if (!aOption) return;
    setLoading(true);
    setErrorMsg(null);
    setRows([]);

    const { data, error } = await supabase.rpc('simulate_join_preview_autoaggregate_simple', {
      p_dataset_a: aOption.key,
      p_dataset_b: bOption ? bOption.key : null,
      p_col_a: colA,
      p_col_b: colB,
      p_country_iso: countryIso,
      p_method: method,
      p_target_level: targetLevel,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarBVal : null,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message || 'Preview failed');
      return;
    }
    setRows(data ?? []);
  };

  const save = async () => {
    // keep current UX behavior (call server-side create_derived_dataset_v2 already present)
    const { error } = await supabase.rpc('create_derived_dataset_v2', {
      p_country: countryIso,
      p_title: title,
      p_description: description,
      p_admin_level: targetLevel,
      p_method: method,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarBVal : null,
      p_dataset_a: aOption?.key ?? null,
      p_dataset_b: bOption?.key ?? null,
      p_col_a: colA,
      p_col_b: colB,
      p_formula: null,
      p_target_level: targetLevel,
      p_taxonomy_categories: [
        taxonomy.underlying ? 'Underlying Vulnerabilities' : null,
        taxonomy.crosscutting ? 'Cross-cutting' : null,
        taxonomy.hazard ? 'Hazard & Impact Data' : null,
        taxonomy.ssc ? 'SSC Framework' : null,
      ].filter(Boolean),
      p_taxonomy_terms: taxonomy.sscTerms ?? [],
      p_decimals: decimals,
      p_normalize_percent: normalizePct,
      p_is_parametric: isParametric,
    });

    if (error) {
      setErrorMsg(error.message || 'Save failed');
      return;
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center p-6">
      <div className="w-[1100px] max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Create Derived Dataset</h2>
          <button className="p-2" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(92vh-130px)]">
          <div className="grid grid-cols-12 gap-3">
            <input className="col-span-7 input"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input className="col-span-5 input"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <select className="col-span-2 select"
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value as AdminLevel)}
            >
              <option value="ADM1">ADM1</option>
              <option value="ADM2">ADM2</option>
              <option value="ADM3">ADM3</option>
              <option value="ADM4">ADM4</option>
            </select>

            {/* Dataset A */}
            <select
              className="col-span-5 select"
              value={aOption?.key ?? ''}
              onChange={(e) => {
                const opt = datasetOptions.find(o => o.key === e.target.value) || null;
                setAOption(opt);
              }}
            >
              {datasetOptions.map((d) => (
                <option key={`a-${d.key}`} value={d.key}>{d.label}</option>
              ))}
            </select>

            {/* Dataset B */}
            <select
              className="col-span-5 select"
              value={bOption?.key ?? ''}
              onChange={(e) => {
                const opt = datasetOptions.find(o => o.key === e.target.value) || null;
                setBOption(opt);
              }}
            >
              {datasetOptions.map((d) => (
                <option key={`b-${d.key}`} value={d.key}>{d.label}</option>
              ))}
            </select>

            {/* Row: Column value selectors */}
            <input className="col-span-3 input" placeholder="Column A"
              value={colA} onChange={(e) => setColA(e.target.value)}
            />
            <input className="col-span-3 input" placeholder="Column B"
              value={colB} onChange={(e) => setColB(e.target.value)}
            />

            {/* Row: Join column textboxes (hydrated) */}
            <input className="col-span-3 input" placeholder="Join column A"
              value={aJoinField} onChange={(e) => setAJoinField(e.target.value)}
              disabled
            />
            <input className="col-span-3 input" placeholder="Join column B"
              value={bJoinField} onChange={(e) => setBJoinField(e.target.value)}
              disabled
            />
          </div>

          {/* Method buttons */}
          <div className="flex items-center gap-2">
            {(['ratio','multiply','sum','difference'] as Method[]).map(m => (
              <button
                key={m}
                className={`px-3 py-1 rounded border ${method === m ? 'bg-gray-900 text-white' : 'bg-white'}`}
                onClick={() => setMethod(m)}
              >
                {m}
              </button>
            ))}

            <label className="ml-4 inline-flex items-center gap-2">
              <input type="checkbox" checked={normalizePct} onChange={(e)=>setNormalizePct(e.target.checked)} />
              Normalize %
            </label>

            <label className="ml-4 inline-flex items-center gap-2">
              <input type="checkbox" checked={isParametric} onChange={(e)=>setIsParametric(e.target.checked)} />
              Parametric
            </label>

            <label className="ml-4 inline-flex items-center gap-2">
              <input type="checkbox" checked={useScalarB} onChange={(e)=>setUseScalarB(e.target.checked)} />
              Scalar B
            </label>

            <input
              type="number"
              className="w-24 input"
              value={scalarBVal}
              disabled={!useScalarB}
              onChange={(e)=>setScalarBVal(parseFloat(e.target.value))}
            />

            <button className="ml-auto btn" onClick={preview} disabled={loading}>
              {loading ? 'Loading…' : 'Preview'}
            </button>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200">
              {errorMsg}
            </div>
          )}

          {/* Results */}
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'out_join_key','out_place_name','out_a','out_b','out_derived',
                    'out_col_a_used','out_col_b_used','out_join_status',
                    'out_source_level_a','out_source_level_b','out_target_level'
                  ].map(h => (
                    <th key={h} className="text-left px-3 py-2 border-b">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.out_join_key} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2 border-b">{r.out_join_key}</td>
                    <td className="px-3 py-2 border-b">{r.out_place_name}</td>
                    <td className="px-3 py-2 border-b">{r.out_a ?? '—'}</td>
                    <td className="px-3 py-2 border-b">{r.out_b ?? '—'}</td>
                    <td className="px-3 py-2 border-b">{r.out_derived ?? '—'}</td>
                    <td className="px-3 py-2 border-b">{r.out_col_a_used}</td>
                    <td className="px-3 py-2 border-b">{r.out_col_b_used}</td>
                    <td className="px-3 py-2 border-b">{r.out_join_status}</td>
                    <td className="px-3 py-2 border-b">{r.out_source_level_a}</td>
                    <td className="px-3 py-2 border-b">{r.out_source_level_b}</td>
                    <td className="px-3 py-2 border-b">{r.out_target_level}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-gray-500">
                      {loading ? 'Loading…' : 'No preview yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Taxonomy */}
          <div>
            <h3 className="font-semibold mb-2">Assign Taxonomy</h3>
            <div className="grid grid-cols-3 gap-3">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox"
                  checked={taxonomy.underlying}
                  onChange={(e)=>setTaxonomy(s=>({...s, underlying: e.target.checked}))}
                />
                Underlying Vulnerabilities
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox"
                  checked={taxonomy.crosscutting}
                  onChange={(e)=>setTaxonomy(s=>({...s, crosscutting: e.target.checked}))}
                />
                Cross-cutting
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox"
                  checked={taxonomy.hazard}
                  onChange={(e)=>setTaxonomy(s=>({...s, hazard: e.target.checked}))}
                />
                Hazard &amp; Impact Data
              </label>

              <label className="inline-flex items-center gap-2 col-span-3 mt-2">
                <input type="checkbox"
                  checked={taxonomy.ssc}
                  onChange={(e)=>setTaxonomy(s=>({...s, ssc: e.target.checked}))}
                />
                SSC Framework
              </label>

              {/* Simple SSC sub-terms toggle set */}
              <div className="col-span-3 grid grid-cols-3 gap-2 pl-6">
                {['P1 - The Shelter','P2 - The Living Conditions','P3 - The Settlement','Access to Services','Presence of Hazards','Communal Infrastructure'].map(term => {
                  const checked = taxonomy.sscTerms.includes(term);
                  return (
                    <label key={term} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={!taxonomy.ssc}
                        checked={checked}
                        onChange={(e)=>{
                          setTaxonomy(s=>{
                            const set = new Set(s.sscTerms);
                            if (e.target.checked) set.add(term); else set.delete(term);
                            return {...s, sscTerms: Array.from(set)};
                          });
                        }}
                      />
                      {term}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button className="btn-muted" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </div>
      </div>

      <style jsx global>{`
        .input { @apply w-full rounded border px-3 py-2; }
        .select { @apply w-full rounded border px-3 py-2 bg-white; }
        .btn { @apply rounded border px-3 py-2 bg-white; }
        .btn-muted { @apply rounded border px-4 py-2 bg-white; }
        .btn-primary { @apply rounded px-4 py-2 text-white bg-gray-900; }
      `}</style>
    </div>
  );
}
