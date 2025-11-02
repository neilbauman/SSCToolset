"use client";
import { Loader2 } from "lucide-react";

type CategorySummaryProps = {
  instanceId?: string;
  categories: {
    category: string;
    dataset_count: number;
    methodology_count: number;
    composite_exists: boolean;
    latest_table: string | null;
  }[];
  labels: Record<string, string>;
  loading: boolean;
  onRefresh: () => void;
  onAdd: (category: string) => void;
  onPreview: (category: string) => void;
};

export default function CategorySummary({
  instanceId,
  categories,
  labels,
  loading,
  onRefresh,
  onAdd,
  onPreview,
}: CategorySummaryProps) {
  if (loading)
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Object.keys(labels).map((key) => {
        const found = categories.find((c) => c.category === key);
        const count = found?.dataset_count ?? 0;
        return (
          <div
            key={key}
            className="rounded-lg border bg-white p-4 flex flex-col justify-between"
          >
            <div>
              <div className="font-semibold text-sm mb-1">{labels[key]}</div>
              {found ? (
                <>
                  <div className="text-xs text-gray-500 mb-2">
                    {count} dataset{count !== 1 ? "s" : ""}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => onPreview(key)}
                      className="text-xs rounded border px-2 py-1 hover:bg-gray-50"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => onAdd(key)}
                      className="text-xs rounded border px-2 py-1 bg-gray-800 text-white"
                    >
                      Add
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-400 italic">No data yet</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
