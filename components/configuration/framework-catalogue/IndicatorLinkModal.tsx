"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";
import { Plus, Trash2, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  entity: { type: "pillar" | "theme" | "subtheme"; id: string; name: string };
};

type Indicator = {
  id: string;
  code: string;
  name: string;
  topic: string | null;
};

type LinkRow = {
  id: string;
  indicator_id: string;
  indicator_catalogue: Indicator | null;
};

export default function IndicatorLinkModal({ open, onClose, onSaved, entity }: Props) {
  const [loading, setLoading] = useState(true);
  const [allIndicators, setAllIndicators] = useState<Indicator[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (open) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadData() {
    setLoading(true);

    // Current links for this entity
    const { data: l, error: lerr } = await supabase
      .from("catalogue_indicator_links")
      .select("id,indicator_id,indicator_catalogue(id,code,name,topic)")
      .eq(`${entity.type}_id`, entity.id);
    if (lerr) console.error(lerr);

    // All indicators to choose from
    const { data: inds, error: ierr } = await supabase
      .from("indicator_catalogue")
      .select("id,code,name,topic")
      .order("name", { ascending: true });
    if (ierr) console.error(ierr);

    setLinks((l || []) as LinkRow[]);
    setAllIndicators((inds || []) as Indicator[]);
    setSelected("");
    setLoading(false);
  }

  const unlinked = useMemo(() => {
    const linkedIds = new Set(links.map((x) => x.indicator_id));
    return allIndicators.filter((i) => !linkedIds.has(i.id));
  }, [allIndicators, links]);

  async function addLink() {
    if (!selected) return;
    const payload: Record<string, any> = {
      indicator_id: selected,
      pillar_id: null,
      theme_id: null,
      subtheme_id: null,
    };
    payload[`${entity.type}_id`] = entity.id;

    const { error } = await supabase.from("catalogue_indicator_links").insert(payload);
    if (error) {
      console.error(error);
      alert("Failed to add indicator.");
      return;
    }
    await loadData();
    onSaved();
  }

  async function removeLink(linkId: string) {
    const { error } = await supabase
      .from("catalogue_indicator_links")
      .delete()
      .eq("id", linkId);
    if (error) {
      console.error(error);
      alert("Failed to remove link.");
      return;
    }
    await loadData();
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Indicators for ${entity.name}`} width="max-w-2xl">
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Linked list */}
          <div>
            <div className="text-sm font-medium mb-2" style={{ color: "var(--gsc-gray)" }}>
              Linked Indicators
            </div>
            {links.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No indicators linked.</p>
            ) : (
              <ul className="divide-y">
                {links
                  .slice()
                  .sort((a, b) =>
                    (a.indicator_catalogue?.name || "").localeCompare(
                      b.indicator_catalogue?.name || ""
                    )
                  )
                  .map((lnk) => (
                    <li key={lnk.id} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 truncate">
                          {lnk.indicator_catalogue?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {lnk.indicator_catalogue?.code}
                          {lnk.indicator_catalogue?.topic
                            ? ` • ${lnk.indicator_catalogue.topic}`
                            : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => removeLink(lnk.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                        title="Unlink indicator"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Add new */}
          <div className="flex items-center gap-2">
            <select
              className="flex-1 border rounded p-2 text-sm"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Select indicator…</option>
              {unlinked.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.code})
                </option>
              ))}
            </select>
            <button
              onClick={addLink}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-md"
              style={{ background: "var(--gsc-blue)", color: "white" }}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
