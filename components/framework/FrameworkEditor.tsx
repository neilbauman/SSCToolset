"use client";

import React, { useEffect, useState } from "react";
import {
  getVersionTree,
  replaceFrameworkVersionItems,
} from "@/lib/services/framework";
import type { NormalizedFramework } from "@/lib/types/framework";
import {
  Plus,
  Edit3,
  Trash2,
  PlusCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import AddPillarModal from "./AddPillarModal";
import AddThemeModal from "./AddThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";

type Props = {
  versionId: string;
  editable: boolean;
};

export default function FrameworkEditor({ versionId, editable }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showAddPillar, setShowAddPillar] = useState(false);
  const [addThemeParent, setAddThemeParent] = useState<NormalizedFramework | null>(null);
  const [addSubthemeParent, setAddSubthemeParent] = useState<NormalizedFramework | null>(null);

  useEffect(() => {
    loadTree();
  }, [versionId]);

  const loadTree = async () => {
    try {
      const data = await getVersionTree(versionId);
      setTree(Array.isArray(data) ? data : []);
      setDirty(false);
    } catch (err) {
      console.error("Error loading framework tree:", err);
      setTree([]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await replaceFrameworkVersionItems(versionId, tree);
      setDirty(false);
      await loadTree();
    } catch (err) {
      console.error("Error saving framework:", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    const copy = new Set(expanded);
    if (copy.has(id)) copy.delete(id);
    else copy.add(id);
    setExpanded(copy);
  };

  const expandAll = () => {
    const all = new Set<string>();
    const walk = (nodes: NormalizedFramework[]) => {
      for (const n of nodes) {
        all.add(n.id);
        if (n.themes?.length) walk(n.themes);
        if (n.subthemes?.length) walk(n.subthemes);
      }
    };
    walk(tree);
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set());

  // ---------- helpers to compute display values ----------
  const typeBadge = (level: 0 | 1 | 2) => {
    const label = level === 0 ? "Pillar" : level === 1 ? "Theme" : "Subtheme";
    const color =
      level === 0
        ? "bg-blue-100 text-blue-800"
        : level === 1
        ? "bg-green-100 text-green-800"
        : "bg-orange-100 text-orange-800";
    return { label, color };
  };

  const refFor = (level: 0 | 1 | 2, p: number, t?: number, s?: number) => {
    if (level === 0) return `P${p}`;
    if (level === 1) return `T${p}.${t ?? 1}`;
    return `ST${p}.${t ?? 1}.${s ?? 1}`;
  };

  // ---------- row renderers (derive type, ref_code, sort per parent) ----------
  const renderSub = (sub: NormalizedFramework, pIdx: number, tIdx: number, sIdx: number) => {
    const lvl: 2 = 2;
    const { label, color } = typeBadge(lvl);
    const isExpanded = expanded.has(sub.id); // subthemes have no children, but keep consistent
    const indent = (lvl * 16 + 8) + "px";
    return (
      <tr key={sub.id}>
        {/* Type / Ref Code */}
        <td className="px-2 py-1 align-top" style={{ paddingLeft: indent }}>
          <div className="flex items-center gap-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>
            <span className="text-xs text-gray-500">{refFor(lvl, pIdx + 1, tIdx + 1, sIdx + 1)}</span>
          </div>
        </td>
        {/* Name / Description */}
        <td className="px-2 py-1 align-top" style={{ paddingLeft: indent }}>
          <div className="font-medium">{sub.name}</div>
          {sub.description && <div className="text-xs text-gray-500">{sub.description}</div>}
        </td>
        {/* Sort Order (per theme) */}
        <td className="px-2 py-1 align-top">{sIdx + 1}</td>
        {/* Actions */}
        <td className="px-2 py-1 align-top text-right">
          {editable ? (
            <div className="flex justify-end gap-2 text-gray-600">
              <button className="hover:text-blue-600" title="Edit"><Edit3 size={16} /></button>
              <button className="hover:text-red-600" title="Delete"><Trash2 size={16} /></button>
            </div>
          ) : ("-")}
        </td>
      </tr>
    );
  };

  const renderTheme = (theme: NormalizedFramework, pIdx: number, tIdx: number) => {
    const lvl: 1 = 1;
    const { label, color } = typeBadge(lvl);
    const isExpanded = expanded.has(theme.id);
    const hasChildren = (theme.subthemes?.length ?? 0) > 0;
    const indent = (lvl * 16 + 8) + "px";

    return (
      <React.Fragment key={theme.id}>
        <tr>
          {/* Type / Ref Code */}
          <td className="px-2 py-1 align-top" style={{ paddingLeft: indent }}>
            <div className="flex items-center gap-1">
              {hasChildren && (
                <button onClick={() => toggleExpand(theme.id)} className="text-gray-600 hover:text-gray-900">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>
              <span className="text-xs text-gray-500">{refFor(lvl, pIdx + 1, tIdx + 1)}</span>
            </div>
          </td>
          {/* Name / Description */}
          <td className="px-2 py-1 align-top" style={{ paddingLeft: indent }}>
            <div className="font-medium">{theme.name}</div>
            {theme.description && <div className="text-xs text-gray-500">{theme.description}</div>}
          </td>
          {/* Sort Order (per pillar) */}
          <td className="px-2 py-1 align-top">{tIdx + 1}</td>
          {/* Actions */}
          <td className="px-2 py-1 align-top text-right">
            {editable ? (
              <div className="flex justify-end gap-2 text-gray-600">
                <button className="hover:text-blue-600" title="Edit"><Edit3 size={16} /></button>
                <button className="hover:text-red-600" title="Delete"><Trash2 size={16} /></button>
                <button
                  className="hover:text-green-600"
                  title="Add Subtheme"
                  onClick={() => setAddSubthemeParent(theme)}
                >
                  <PlusCircle size={16} />
                </button>
              </div>
            ) : ("-")}
          </td>
        </tr>

        {/* Subthemes */}
        {isExpanded && (theme.subthemes ?? []).map((s, sIdx) => renderSub(s, pIdx, tIdx, sIdx))}
      </React.Fragment>
    );
  };

  const renderPillar = (pillar: NormalizedFramework, pIdx: number) => {
    const lvl: 0 = 0;
    const { label, color } = typeBadge(lvl);
    const isExpanded = expanded.has(pillar.id);
    const hasChildren = (pillar.themes?.length ?? 0) > 0;
    const indent = (lvl * 16 + 8) + "px";

    return (
      <React.Fragment key={pillar.id}>
        <tr>
          {/* Type / Ref Code */}
          <td className="px-2 py-1 align-top" style={{ paddingLeft: indent }}>
            <div className="flex items-center gap-1">
              {hasChildren && (
                <button onClick={() => toggleExpand(pillar.id)} className="text-gray-600 hover:text-gray-900">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>
              <span className="text-xs text-gray-500">{refFor(lvl, pIdx + 1)}</span>
            </div>
          </td>
          {/* Name / Description */}
          <td className="px-2 py-1 align-top" style={{ paddingLeft: indent }}>
            <div className="font-medium">{pillar.name}</div>
            {pillar.description && <div className="text-xs text-gray-500">{pillar.description}</div>}
          </td>
          {/* Sort Order (top level) */}
          <td className="px-2 py-1 align-top">{pIdx + 1}</td>
          {/* Actions */}
          <td className="px-2 py-1 align-top text-right">
            {editable ? (
              <div className="flex justify-end gap-2 text-gray-600">
                <button className="hover:text-blue-600" title="Edit"><Edit3 size={16} /></button>
                <button className="hover:text-red-600" title="Delete"><Trash2 size={16} /></button>
                <button
                  className="hover:text-green-600"
                  title="Add Theme"
                  onClick={() => setAddThemeParent(pillar)}
                >
                  <PlusCircle size={16} />
                </button>
              </div>
            ) : ("-")}
          </td>
        </tr>

        {/* Themes */}
        {isExpanded && (pillar.themes ?? []).map((t, tIdx) => renderTheme(t, pIdx, tIdx))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-2 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            Collapse All
          </button>
          {editable && (
            <button
              onClick={() => setShowAddPillar(true)}
              className="px-2 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus size={16} /> Add Pillar
            </button>
          )}
        </div>

        {dirty && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={loadTree}
              disabled={saving}
              className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-60"
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <table className="w-full border text-sm table-fixed">
        <thead className="bg-gray-100 text-[13.5px]">
          <tr>
            <th className="text-left px-2 py-2 w-[25%]">Type / Ref Code</th>
            <th className="text-left px-2 py-2 w-[45%]">Name / Description</th>
            <th className="text-left px-2 py-2 w-[15%]">Sort Order</th>
            <th className="text-right px-2 py-2 w-[15%]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tree.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-2 py-4 text-gray-500">
                No items in this framework version yet.
              </td>
            </tr>
          ) : (
            tree.map((p, pIdx) => renderPillar(p, pIdx))
          )}
        </tbody>
      </table>

      {/* Modals */}
      {showAddPillar && (
        <AddPillarModal
          versionId={versionId}
          existing={tree}
          onClose={() => setShowAddPillar(false)}
          onAdd={(pillar) => {
            setTree([...tree, pillar]);
            setDirty(true);
          }}
        />
      )}

      {addThemeParent && (
        <AddThemeModal
          versionId={versionId}
          parent={addThemeParent}
          onClose={() => setAddThemeParent(null)}
          onAdd={(theme) => {
            const updated = tree.map((p) =>
              p.id === addThemeParent.id
                ? { ...p, themes: [...(p.themes ?? []), theme] }
                : p
            );
            setTree(updated);
            setDirty(true);
          }}
        />
      )}

      {addSubthemeParent && (
        <AddSubthemeModal
          versionId={versionId}
          parent={addSubthemeParent}
          onClose={() => setAddSubthemeParent(null)}
          onAdd={(sub) => {
            const updated = tree.map((p) => ({
              ...p,
              themes: (p.themes ?? []).map((t) =>
                t.id === addSubthemeParent.id
                  ? { ...t, subthemes: [...(t.subthemes ?? []), sub] }
                  : t
              ),
            }));
            setTree(updated);
            setDirty(true);
          }}
        />
      )}
    </div>
  );
}
