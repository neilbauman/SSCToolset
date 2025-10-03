"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type FlexibleJoinModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onSaved: () => void;
};

export default function FlexibleJoinModal({
  open,
  onClose,
  countryIso,
  onSaved,
}: FlexibleJoinModalProps) {
  const [datasets, setDatasets] = useState<
    { type: string; dataset_id: string; join_key: string; title?: string; year?: number }[]
  >([]);
  const [notes, setNotes] = useState("");

  const addDataset = () => {
    setDatasets([...datasets, { type: "admin", dataset_id: "", join_key: "pcode" }]);
  };

  const updateDataset = (index: number, field: string, value: any) => {
    const copy = [...datasets];
    (copy[index] as any)[field] = value;
    setDatasets(copy);
  };

  const removeDataset = (index: number) => {
    setDatasets(datasets.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const { error } = await supabase.from("dataset_joins").insert({
      country_iso: countryIso,
      datasets,
      notes,
      is_active: false,
    });

    if (error) {
      console.error("Error saving join:", error);
    } else {
      onSaved();
      onClose();
    }
  };

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-40 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <Dialog.Title className="text-lg font-semibold mb-4">
              Create Flexible Join
            </Dialog.Title>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {datasets.map((ds, idx) => (
                <div
                  key={idx}
                  className="border rounded p-3 space-y-2 bg-gray-50 relative"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Type</label>
                      <select
                        value={ds.type}
                        onChange={(e) => updateDataset(idx, "type", e.target.value)}
                        className="w-full border px-2 py-1 rounded text-sm"
                      >
                        <option value="admin">Admin Units</option>
                        <option value="population">Population</option>
                        <option value="gis">GIS Layers</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Join Key</label>
                      <input
                        type="text"
                        value={ds.join_key}
                        onChange={(e) => updateDataset(idx, "join_key", e.target.value)}
                        className="w-full border px-2 py-1 rounded text-sm"
                        placeholder="pcode"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Dataset ID</label>
                      <input
                        type="text"
                        value={ds.dataset_id}
                        onChange={(e) => updateDataset(idx, "dataset_id", e.target.value)}
                        className="w-full border px-2 py-1 rounded text-sm"
                        placeholder="UUID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Year (optional)</label>
                      <input
                        type="number"
                        value={ds.year ?? ""}
                        onChange={(e) =>
                          updateDataset(idx, "year", e.target.value ? Number(e.target.value) : undefined)
                        }
                        className="w-full border px-2 py-1 rounded text-sm"
                        placeholder="2020"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Title (optional)</label>
                    <input
                      type="text"
                      value={ds.title ?? ""}
                      onChange={(e) => updateDataset(idx, "title", e.target.value)}
                      className="w-full border px-2 py-1 rounded text-sm"
                      placeholder="Descriptive title"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeDataset(idx)}
                    className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border px-2 py-1 rounded text-sm"
                rows={2}
              />
            </div>

            <div className="mt-5 flex justify-between">
              <button
                type="button"
                onClick={addDataset}
                className="px-3 py-1.5 text-sm bg-gray-200 rounded hover:bg-gray-300"
              >
                + Add Dataset
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90"
                >
                  Save Join
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
