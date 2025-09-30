"use client";

import { useState, useEffect } from "react";
import Modal from "../ui/Modal";
import { listPillarCatalogue } from "@/lib/services/framework";
import type { CataloguePillar } from "@/lib/types/framework";

type Props = {
  versionId: string;
  existingPillarIds: string[];
  isPersisted: boolean;
  onClose: () => void;
  onSubmit: (
    payload:
      | { mode: "catalogue"; items: CataloguePillar[] }
      | { mode: "new"; name: string; description: string }
  ) => void;
};

export default function AddPillarModal({
  versionId,
  existingPillarIds,
  isPersisted,
  onClose,
  onSubmit,
}: Props) {
  const [catalogue, setCatalogue] = useState<CataloguePillar[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    if (isPersisted) {
      listPillarCatalogue(versionId).then((data) => setCatalogue(data));
    }
  }, [versionId, isPersisted]);

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Add Pillar</h2>

      {isPersisted ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Select from catalogue:</p>
          <div className="max-h-64 overflow-y-auto border rounded p-2">
            {catalogue.map((p) => (
              <label
                key={p.id}
                className={`flex items-center space-x-2 p-1 rounded ${
                  existingPillarIds.includes(p.id)
                    ? "text-gray-400 cursor-not-allowed"
                    : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={existingPillarIds.includes(p.id)}
                  checked={selected.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected([...selected, p.id]);
                    } else {
                      setSelected(selected.filter((id) => id !== p.id));
                    }
                  }}
                />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
          <button
            onClick={() =>
              onSubmit({
                mode: "catalogue",
                items: catalogue.filter((p) => selected.includes(p.id)),
              })
            }
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Add Selected
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New pillar name"
            className="w-full border rounded p-2 text-sm"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description"
            className="w-full border rounded p-2 text-sm"
          />
          <button
            onClick={() =>
              onSubmit({ mode: "new", name: newName, description: newDescription })
            }
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Add Pillar
          </button>
        </div>
      )}
    </Modal>
  );
}
