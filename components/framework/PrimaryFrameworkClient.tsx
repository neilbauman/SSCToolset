"use client";

import { useEffect, useState } from "react";
import { getVersionTree } from "@/lib/services/framework";
import type { FrameworkVersion, NormalizedFramework } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import { groupThemes } from "@/lib/theme";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string;
};

export default function PrimaryFrameworkClient({ versions, openedId }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = groupThemes["ssc-config"];
  const selectedVersion = versions.find((v) => v.id === openedId);

  const loadTree = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVersionTree(id);
      setTree(data);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to load framework");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openedId) loadTree(openedId);
    else setTree(null);
  }, [openedId]);

  return (
    <div className={`rounded-lg bg-white ${theme.border} p-4 md:p-6`}>
      {/* Version controls */}
      <div className="mb-6 border-b pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Version selector */}
          <div className="flex items-center gap-3">
            <label htmlFor="version" className="text-sm font-medium text-gray-700">
              Select Version:
            </label>
            <select
              id="version"
              name="version"
              defaultValue={openedId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                if (id) {
                  window.location.href = `/configuration/primary?version=${id}`;
                } else {
                  window.location.href = `/configuration/primary`;
                }
              }}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"
            >
              <option value="">-- Select a version --</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.status === "draft" ? "(Draft)" : "(Published)"}
                </option>
              ))}
            </select>
          </div>

          {/* Status + metadata */}
          {selectedVersion && (
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  selectedVersion.status === "draft"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {selectedVersion.status === "draft" ? "Draft" : "Published"}
              </span>
              <
