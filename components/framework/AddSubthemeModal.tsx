"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import {
  listSubthemeCatalogue,
  createSubtheme,
} from "@/lib/services/framework";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  versionId: string;
  themeId: string;
  existing: NormalizedFramework[];
  onClose: () => void;
  onAdd: (subtheme: NormalizedFramework) => void;
};

export default function AddSubthemeModal({
  versionId,
  themeId,
  existing,
  onClose,
  onAdd,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [catalogue, setCatalogue] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const data = await listSubthemeCatalogue(versionId, themeId);
      setCatalogue(data || []);
    }
    load();
  }, [versionId, themeId]);

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Subtheme</h2>

      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Subtheme name"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Subtheme description"
          className="w-full rounded border px-3 py-2 text-sm"
        />

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded bg-gray-200 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
            onClick={async () => {
              if (!name.trim()) return;
              const created = await createSubtheme(themeId, name.trim(), description);
              const newSub: NormalizedFramework = {
                id: created.id,
                type: "subtheme",
                name: created.name,
                description: created.description,
                sort_order: (existing.length || 0) + 1,
                ref_code: created.ref_code ?? `ST${themeId}.${existing.length + 1}`,
                color: null,
                icon: null,
              };
              onAdd(newSub);
              onClose();
            }}
          >
            Add
          </button>
        </div>
      </div>
    </Modal>
  );
}
