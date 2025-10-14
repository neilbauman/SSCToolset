"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type Term = {
  id: string;
  category: string;
  code: string;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export default function AddIndicatorModal({ open, onClose, onSaved }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"gradient" | "categorical">("gradient");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("SSC Framework");
  const [terms, setTerms] = useState<Term[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("taxonomy_terms")
        .select("id, category, code, name")
        .order("category", { ascending: true })
        .order("code", { ascending: true });
      if (data) setTerms(data);
    })();
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const save = async () => {
    if (!code || !name) {
      alert("Code and Name are required.");
      return;
    }
    setSaving(true);

    const { data, error } = await supabase
      .from("indicator_catalogue")
      .insert([{ code, name, type, unit, topic }])
      .select("id")
      .single();

    if (error || !data) {
      alert("Failed to create indicator.");
      setSaving(false);
      return;
    }

    // Save taxonomy links
    if (selected.length > 0) {
      const rows = selected.map((termId, idx) => ({
        indicator_id: data.id,
        term_id: termId,
        sort_order: idx + 1,
      }));
      const { error: linkErr } = await supabase
        .from("indicator_taxonomy_links")
        .insert(rows);
      if (linkErr) console.error(linkErr);
    }

    await onSaved();
    setSaving(false);
    onClose();
  };

  // Group taxonomy terms by category
  const grouped = terms.reduce<Record<string, Term[]>>((acc, t) => {
    acc[t.category] = acc[t.category] || [];
    acc[t.category].push(t);
    return acc;
  }, {});

  // Clean name without prefix
  const cleanName = (s: string) =>
    s.replace(/^.*?:/, "").replace(/\s+/g, " ").trim();

  return (
    <Modal open={open} onClose={onClose} title="Add Indicator" width="max-w-3xl">
      <div className="space-y-4">
        {/* Basic indicator fields */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="gradient">gradient</option>
              <option value="categorical">categorical</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Unit</label>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Taxonomy selection */}
        <div>
          <h3 className="text-sm font-medium text-[color:var(--gsc-blue)] mb-2">
            Taxonomy Terms
          </h3>
          <div className="max-h-80 overflow-y-auto border rounded-md p-3 bg-[color:var(--gsc-beige)]">
            {Object.entries(grouped).map(([cat, list]) => {
              const groupTerm = list.find((t) => cleanName(t.code) === cat.toLowerCase());
              const groupId = groupTerm?.id;
              return (
                <div key={cat} className="mb-3">
                  <div className="flex items-center mb-1">
                    {groupId && (
                      <input
                        type="checkbox"
                        checked={selected.includes(groupId)}
                        onChange={() => toggle(groupId)}
                        className="mr-2 accent-[color:var(--gsc-blue)]"
                      />
                    )}
                    <h4 className="text-sm font-semibold text-[color:var(--gsc-gray)]">
                      {cat}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3">
                    {list.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 text-sm bg-white rounded px-2 py-1 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(t.id)}
                          onChange={() => toggle(t.id)}
                          className="accent-[color:var(--gsc-blue)]"
                        />
                        <span className="truncate">{cleanName(t.name)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
            {terms.length === 0 && (
              <p className="text-xs text-gray-500 italic">
                No taxonomy terms found.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-md bg-[color:var(--gsc-blue)] text-white hover:opacity-90 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
