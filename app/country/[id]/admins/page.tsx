"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import AdminUnitsTree from "@/components/country/AdminUnitsTree";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import { Loader2, Upload, Pencil, Trash2 } from "lucide-react";

export default function AdminsPage({ params }: { params: { id: string } }) {
  const [versions, setVersions] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [activeVer, setActiveVer] = useState<any | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState<any | null>(null);
  const [activeLevels, setActiveLevels] = useState(["ADM1"]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    const { data, error } = await supabase
      .from("admin_dataset_versions")
      .select("*")
      .eq("country_iso", params.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setVersions(data);
      const active = data.find((v) => v.is_active);
      if (active) {
        setActiveVer(active);
        await loadUnits(active.id);
      }
    }
  }

  async function loadUnits(verId: string) {
    try {
      setLoadingMsg("Loading units...");
      const res = await fetch(
        "https://ergsggprgtlsrrsmwtkf.supabase.co/functions/v1/fetch_snapshots",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ver_id: verId }),
        }
      );
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      const data = await res.json();
      setUnits(data);
    } catch (e) {
      console.error(e);
      setUnits([]);
    } finally {
      setLoadingMsg(null);
    }
  }

  async function handleSetActive(id: string) {
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", params.id);
    await supabase
      .from("admin_dataset_versions")
      .update({ is_active: true })
      .eq("id", id);
    await loadVersions();
  }

  async function handleDeleteVersion(id: string) {
    if (!confirm("Delete this version?")) return;
    await supabase.from("admin_dataset_versions").delete().eq("id", id);
    await loadVersions();
  }

  async function handleSaveEdit() {
    if (!openEdit) return;
    const { id, title, year, dataset_date, source_name, source_url, notes } =
      openEdit;
    const source = source_name || source_url
      ? JSON.stringify({ name: source_name, url: source_url })
      : null;
    await supabase
      .from("admin_dataset_versions")
      .update({ title, year, dataset_date, source, notes })
      .eq("id", id);
    setOpenEdit(null);
    await loadVersions();
  }

  const filteredUnits = search
    ? units.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.pcode.toLowerCase().includes(search.toLowerCase())
      )
    : units;

  const headerProps = { title: "Administrative Units" };

  return (
    <SidebarLayout headerProps={headerProps}>
      {loadingMsg && (
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> {loadingMsg}
        </div>
      )}

      <div className="bg-white border rounded-lg shadow-sm p-3 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="text-green-600">🗂️</span> Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => alert("Template download not yet wired")}
              className="px-2 py-1 text-sm border rounded hover:bg-gray-50"
            >
              ⬇ Template
            </button>
            <button
              onClick={() => setOpenUpload(true)}
              className="px-3 py-1 text-sm bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90 flex items-center gap-1"
            >
              <Upload className="w-4 h-4" /> Upload Dataset
            </button>
          </div>
        </div>

        <table className="w-full text-sm border-t">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-2 py-1">Title</th>
              <th>Year</th>
              <th>Date</th>
              <th>Source</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => {
              const src = v.source ? JSON.parse(v.source) : null;
              const active = v.is_active;
              return (
                <tr
                  key={v.id}
                  className={active ? "bg-green-50" : "hover:bg-gray-50"}
                >
                  <td className="px-2 py-1">{v.title}</td>
                  <td className="text-center">{v.year || "—"}</td>
                  <td className="text-center">{v.dataset_date || "—"}</td>
                  <td className="text-blue-600 underline">
                    {src?.url ? (
                      <a href={src.url} target="_blank" rel="noreferrer">
                        {src.name}
                      </a>
                    ) : (
                      src?.name || "—"
                    )}
                  </td>
                  <td className="text-center">
                    {active ? "✅ Active" : (
                      <button
                        onClick={() => handleSetActive(v.id)}
                        className="text-blue-600 hover:underline"
                      >
                        Set Active
                      </button>
                    )}
                  </td>
                  <td className="flex gap-2 items-center justify-center py-1">
                    <button
                      onClick={() =>
                        setOpenEdit({
                          ...v,
                          ...(v.source ? JSON.parse(v.source) : {}),
                        })
                      }
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVersion(v.id)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-3 text-sm border rounded-lg p-2">
          {["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
            <label key={lvl} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={activeLevels.includes(lvl)}
                onChange={() =>
                  setActiveLevels((prev) =>
                    prev.includes(lvl)
                      ? prev.filter((x) => x !== lvl)
                      : [...prev, lvl]
                  )
                }
              />
              {lvl}
            </label>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name or PCode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-2 py-1 text-sm w-64"
        />
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-3">
        <h3 className="font-semibold mb-2">Dataset Health</h3>
        <p className="text-sm text-gray-600">
          Total Records – {units.length.toLocaleString()}
        </p>
      </div>

      <AdminUnitsTree units={filteredUnits} activeLevels={activeLevels} />

      {openUpload && (
        <UploadAdminUnitsModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={params.id}
          onUploaded={loadVersions}
        />
      )}

      {openEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg w-full max-w-sm">
            <h3 className="font-semibold mb-2">Edit Version</h3>
            <div className="space-y-2 text-sm">
              <label className="block">
                Title
                <input
                  className="border rounded w-full px-2 py-1 mt-1"
                  value={openEdit.title}
                  onChange={(e) =>
                    setOpenEdit({ ...openEdit, title: e.target.value })
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  Year
                  <input
                    type="number"
                    className="border rounded w-full px-2 py-1 mt-1"
                    value={openEdit.year || ""}
                    onChange={(e) =>
                      setOpenEdit({ ...openEdit, year: e.target.value })
                    }
                  />
                </label>
                <label className="block">
                  Dataset Date
                  <input
                    type="date"
                    className="border rounded w-full px-2 py-1 mt-1"
                    value={openEdit.dataset_date || ""}
                    onChange={(e) =>
                      setOpenEdit({
                        ...openEdit,
                        dataset_date: e.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  Source Name
                  <input
                    className="border rounded w-full px-2 py-1 mt-1"
                    value={openEdit.source_name || ""}
                    onChange={(e) =>
                      setOpenEdit({ ...openEdit, source_name: e.target.value })
                    }
                  />
                </label>
                <label className="block">
                  Source URL
                  <input
                    className="border rounded w-full px-2 py-1 mt-1"
                    value={openEdit.source_url || ""}
                    onChange={(e) =>
                      setOpenEdit({ ...openEdit, source_url: e.target.value })
                    }
                  />
                </label>
              </div>
              <label className="block">
                Notes
                <textarea
                  className="border rounded w-full px-2 py-1 mt-1"
                  rows={2}
                  value={openEdit.notes || ""}
                  onChange={(e) =>
                    setOpenEdit({ ...openEdit, notes: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setOpenEdit(null)}
                className="px-3 py-1 border rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
