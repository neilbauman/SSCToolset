"use client";

import { useState, useEffect } from "react";
import ModalBase from "@/components/ui/ModalBase";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Save, Trash2 } from "lucide-react";

type EditGISLayerModalProps = {
  open: boolean;
  onClose: () => void;
  layerId: string | null;
  onSaved: () => Promise<void> | void;
};

export default function EditGISLayerModal({
  open,
  onClose,
  layerId,
  onSaved,
}: EditGISLayerModalProps) {
  const [layerName, setLayerName] = useState("");
  const [adminLevel, setAdminLevel] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Load existing layer info
  useEffect(() => {
    if (!layerId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("gis_layers")
        .select("layer_name, admin_level")
        .eq("id", layerId)
        .single();

      if (error) {
        console.error(error);
        setMessage("Failed to load layer info.");
      } else if (data) {
        setLayerName(data.layer_name || "");
        setAdminLevel(data.admin_level || "");
      }
      setLoading(false);
    })();
  }, [layerId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const { error } = await supabase
        .from("gis_layers")
        .update({ layer_name: layerName, admin_level: adminLevel })
        .eq("id", layerId);
      if (error) throw error;

      setMessage("✅ Saved successfully!");
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this layer permanently?")) return;
    try {
      setSaving(true);
      const { error } = await supabase.from("gis_layers").delete().eq("id", layerId);
      if (error) throw error;

      setMessage("✅ Layer deleted.");
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase open={open} onClose={onClose} title="Edit GIS Layer">
      {loading ? (
        <p className="text-sm text-gray-600">Loading layer details...</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Layer Name</label>
            <input
              type="text"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              className="block w-full text-sm border border-gray-300 rounded px-2 py-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Administrative Level
            </label>
            <select
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
              className="block w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
            >
              <option value="">Select...</option>
              <option value="ADM0">National (ADM0)</option>
              <option value="ADM1">Region / Province (ADM1)</option>
              <option value="ADM2">Municipality / District (ADM2)</option>
              <option value="ADM3">Subdistrict / Barangay (ADM3)</option>
              <option value="ADM4">Village / Cell (ADM4)</option>
              <option value="ADM5">Hamlet / Subvillage (ADM5)</option>
            </select>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[color:var(--gsc-red)] text-white text-sm px-3 py-1 rounded hover:opacity-90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {message && (
            <p
              className={`text-sm text-center ${
                message.startsWith("✅") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      )}
    </ModalBase>
  );
}
