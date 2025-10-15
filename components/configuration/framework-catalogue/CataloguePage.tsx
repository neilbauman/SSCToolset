function EditEntityModal({
  entity,
  onClose,
  onSaved,
}: {
  entity: Entity;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(entity.name);
  const [description, setDescription] = useState(entity.description || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const table = `${entity.type}_catalogue`;
    const { error } = await supabase
      .from(table)
      .update({ name, description })
      .eq("id", entity.id);
    setSaving(false);
    if (error) alert("Failed to update: " + error.message);
    else {
      onClose();
      onSaved();
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Edit ${entity.type}`}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">Name</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Description</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-[var(--gsc-blue)] text-white rounded"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
