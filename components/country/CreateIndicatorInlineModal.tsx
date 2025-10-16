"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import TaxonomyPicker from "@/app/configuration/taxonomy/TaxonomyPicker";
import { Loader2, AlertTriangle } from "lucide-react";

const FIELD = "w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]";
const LABEL = "block text-xs font-medium text-[color:var(--gsc-gray)] mb-1";
const BTN_PRIMARY = "inline-flex items-center gap-2 bg-[color:var(--gsc-red)] text-white rounded-md px-3 py-2 hover:opacity-90 disabled:opacity-50";
const BTN_SECONDARY = "inline-flex items-center gap-2 border rounded-md px-3 py-2 hover:bg-gray-50";

export default function CreateIndicatorInlineModal({
  open,
  onClose,
  onCreated,
  taxonomyDefault = [],
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (newId: string) => void;
  taxonomyDefault?: string[];
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [dataType, setDataType] = useState<"numeric" | "categorical">("numeric");
  const [taxonomyIds, setTaxonomyIds] = useState<string[]>(taxonomyDefault);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setDesc("");
      setDataType("numeric");
      setTaxonomyIds(taxonomyDefault);
      setErr(null);
      setBusy(false);
    }
  }, [open, taxonomyDefault]);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { data: ind, error } = await supabase
        .from("indicator_catalogue")
        .insert({ name, description: desc, data_type: dataType })
        .select()
        .single();
      if (error) throw error;

      const newId = ind.id as string;

      if (taxonomyIds.length) {
        const links = taxonomyIds.map((tid) => ({
          indicator_id: newId,
          taxonomy_term_id: tid,
        }));
        const { error: linkErr } = await supabase.from("indicator_taxonomy_links").insert(links);
        if (linkErr) throw linkErr;
      }

      onCreated(newId);
    } catch (e: any) {
      setErr(e?.message || "Failed to create indicator.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Indicator">
      <div className="space-y-3">
        {err && (
          <div className="flex items-center gap-2 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{err}</span>
          </div>
        )}

        <div>
          <label className={LABEL}>Name</label>
          <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Description</label>
          <textarea className={FIELD} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Data Type</label>
          <select className={FIELD} value={dataType} onChange={(e) => setDataType(e.target.value as any)}>
            <option value="numeric">Numeric</option>
            <option value="categorical">Categorical</option>
          </select>
        </div>

        <div>
          <label className={LABEL}>Taxonomy Terms</label>
          <TaxonomyPicker selectedIds={taxonomyIds} onChange={setTaxonomyIds} />
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <button className={BTN_SECONDARY} onClick={onClose}>Cancel</button>
          <button className={BTN_PRIMARY} onClick={save} disabled={busy || !name}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
