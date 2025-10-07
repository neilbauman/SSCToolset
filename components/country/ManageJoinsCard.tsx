"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface ManageJoinsCardProps {
  countryIso: string;
  joins: any[];
}

/**
 * Displays and manages dataset joins (active/inactive) for a given country.
 */
export default function ManageJoinsCard({ countryIso, joins }: ManageJoinsCardProps) {
  const [localJoins, setLocalJoins] = useState<any[]>(joins);
  const [loading, setLoading] = useState<string | null>(null);

  const activateJoin = async (joinId: string) => {
    try {
      setLoading(joinId);
      // deactivate others
      await supabase
        .from("dataset_joins")
        .update({ is_active: false })
        .eq("country_iso", countryIso);

      // activate target
      await supabase
        .from("dataset_joins")
        .update({ is_active: true })
        .eq("id", joinId);

      const { data } = await supabase
        .from("dataset_joins")
        .select("*")
        .eq("country_iso", countryIso);

      setLocalJoins(data || []);
    } catch (err) {
      console.error("Error activating join:", err);
    } finally {
      setLoading(null);
    }
  };

  const deleteJoin = async (joinId: string) => {
    if (!confirm("Are you sure you want to delete this join configuration?")) return;
    try {
      setLoading(joinId);
      await supabase.from("dataset_joins").delete().eq("id", joinId);
      setLocalJoins((prev) => prev.filter((j) => j.id !== joinId));
    } catch (err) {
      console.error("Error deleting join:", err);
    } finally {
      setLoading(null);
    }
  };

  const addNewJoin = async () => {
    try {
      setLoading("new");
      const { data, error } = await supabase
        .from("dataset_joins")
        .insert({
          country_iso: countryIso,
          name: `Join ${new Date().toISOString().split("T")[0]}`,
          is_active: false,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw error;
      setLocalJoins((prev) => [...prev, data]);
    } catch (err) {
      console.error("Error adding join:", err);
    } finally {
      setLoading(null);
    }
  };

  const activeJoin = localJoins.find((j) => j.is_active);

  return (
    <div className="border rounded-lg p-5 shadow-sm bg-white mt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          Dataset Joins
        </h3>
        <button
          onClick={addNewJoin}
          disabled={loading === "new"}
          className="flex items-center gap-1 px-2 py-1 text-sm bg-green-600 text-white rounded hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> Add New Join
        </button>
      </div>

      {localJoins.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          No join configurations exist for this country yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-center">Active</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {localJoins.map((j) => (
                <tr
                  key={j.id}
                  className={`border-t hover:bg-gray-50 ${
                    j.is_active ? "bg-green-50" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-medium">{j.name || "Unnamed Join"}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {j.created_at
                      ? new Date(j.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {j.is_active ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 inline" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-400 inline" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right flex justify-end gap-2">
                    {!j.is_active && (
                      <button
                        onClick={() => activateJoin(j.id)}
                        disabled={loading === j.id}
                        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {loading === j.id ? "Activating..." : "Activate"}
                      </button>
                    )}
                    <button
                      onClick={() => deleteJoin(j.id)}
                      disabled={loading === j.id}
                      className="text-sm text-[color:var(--gsc-red)] hover:underline disabled:opacity-50 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeJoin && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          <strong>Active Join:</strong> {activeJoin.name}
        </div>
      )}
    </div>
  );
}
