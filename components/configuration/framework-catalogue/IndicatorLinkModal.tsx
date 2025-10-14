"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Trash2, Plus } from "lucide-react";

type Indicator = { id: string; code: string; name: string; topic?: string };
type LinkRow = { id: string; indicator_id: string; indicator_catalogue?: Indicator };
type EntityRef = { id: string; type: "pillar" | "theme" | "subtheme"; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  entity: EntityRef;
};

export default function IndicatorLinkModal({ open, onClose, onSaved, entity }: Props) {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [allIndicators, setAllIndicators] = useState<Indicator[]>([]);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && entity?.id) loadAll();
  }, [open, entity?.id]);

  async function loadAll() {
    setLoading(true);
    const filterCol =
      entity.type === "pillar" ? "pillar_id" : entity.type === "theme" ? "theme_id" : "subtheme_id";

    const { data: lData, error: lErr } = await supabase
      .from("framework_indicator_links")
      .select("id, indicator_id, indicator_catalogue(id, code, name, topic)")
      .eq(filterCol, entity.id);

    const { data: iData, error: iErr } = await supabase
      .from("indicator_catalogue")
      .select("id, code, name, topic")
      .order("code");

    if (lErr || iErr) console.error(lErr || iErr);

    const safeLinks: LinkRow[] = (lData || []).map((l: any) => ({
      id: l.id,
      indicator_id: l.indicator_id,
      indicator_catalogue: Array.isArray(l.indicator_catalogue)
        ? l.indicator_catalogue[0]
        : l.indicator_catalogue,
    }));

    setLinks(safeLinks);
    setAllIndicators((iData || []) as Indicator[]);
    setSelected("");
    setLoading(false);
  }

  async function handleAdd() {
    if (!selected) return alert("Select an indicator first.");
    setSaving(true);
    const payload: any = {
      indicator_id: selected,
      pillar_id: entity.type === "pillar" ? entity.id : null,
      theme_id: entity.type === "theme" ? entity.id : null,
      subtheme_id: entity.type === "subtheme" ? entity.id : null,
    };
    const { error } = await supabase.from("framework_indicator_links").insert(payload);
    setSaving(false);
    if (error) {
      console.error(error);
      alert("Failed to link indicator.");
    } else {
      await loadAll();
      onSaved();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this indicator link?")) return;
    const { error } = await supabase.from("framework_indicator_links").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Failed to delete link.");
    } else {
      await loadAll();
      onSaved();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Linked Indicators • ${entity.name}`}
      width="max-w-2xl"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex-1 border rounded px-3 py-2 text-sm"
            >
              <option value="">Select indicator…</option>
              {allIndicators.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} — {i.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!selected || saving}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-md"
              style={{
                background: "var(--gsc-blue)",
                color: "white",
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {links.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No linked indicators yet.</p>
          ) : (
            <ul className="divide-y border rounded-md bg-white">
              {links.map((l) => (
                <li key={l.id} className="flex justify-between items-center px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium text-gray-800">
                      {l.indicator_catalogue?.code} — {l.indicator_catalogue?.name}
                    </div>
                    {l.indicator_catalogue?.topic && (
                      <div className="text-xs text-gray-500">
                        {l.indicator_catalogue.topic}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
                    title="Delete link"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
