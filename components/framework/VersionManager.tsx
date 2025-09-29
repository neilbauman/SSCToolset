// components/framework/VersionManager.tsx
"use client";

import { useState } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import {
  createVersion,
  cloneVersion,
  publishVersion,
} from "@/lib/services/framework";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  onSelect: (id: string) => void;
  onRefresh?: () => Promise<void>; // 🔑 parent can reload versions after mutations
};

export default function VersionManager({
  versions,
  selectedId,
  onSelect,
  onRefresh,
}: Props) {
  const [loading, setLoading] = useState(false);

  const current = versions.find((v) => v.id === selectedId);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────
  const handleNew = async () => {
    try {
      setLoading(true);
      const newV = await createVersion("New Framework");
      if (onRefresh) await onRefresh();
      onSelect(newV.id);
    } catch (err: any) {
      console.error("Error creating version:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (!current) return;
    try {
      setLoading(true);
      const newId = await cloneVersion(
        current.id,
        `${current.name} (Copy)`
      );
      if (onRefresh) await onRefresh();
      onSelect(newId);
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!current) return;
    try {
      setLoading(true);
      await publishVersion(current.id);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error("Error publishing version:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────

  return (
    <div className="flex items-center justify-between mb-4">
      {/* Dropdown */}
      <div className="flex items-center space-x-3">
        <Select
          value={selectedId}
          onValueChange={(val) => onSelect(val)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a version" />
          </SelectTrigger>
          <SelectContent>
            {versions.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {current && (
          <Badge
            variant={current.status === "published" ? "success" : "secondary"}
          >
            {current.status}
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <Button
          size="sm"
          onClick={handleNew}
          disabled={loading}
        >
          New (Scratch)
        </Button>

        <Button
          size="sm"
          onClick={handleClone}
          disabled={loading || !current}
        >
          Clone
        </Button>

        <Button
          size="sm"
          onClick={handlePublish}
          disabled={loading || !current || current.status === "published"}
        >
          Publish
        </Button>
      </div>
    </div>
  );
}
