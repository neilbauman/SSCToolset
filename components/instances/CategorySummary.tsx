"use client";

import { Loader2, RefreshCw } from "lucide-react";

type CategorySummaryProps = {
  categories: {
    category: string;
    dataset_count: number;
    methodology_count: number;
    composite_exists: boolean;
    latest_table: string | null;
  }[];
  labels: Record<string, string>;
  loading?: boolean;
  onRefresh?: () => void;
  onAdd: (category: string) => void;
  onPreview: (category: string) => void;
};

export default function CategorySummary({
  categories,
  labels,
  loading,
  onRefresh,
  onAdd,
  onPreview,
}: CategorySummaryProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Analytical Categories</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-gray-600 text-sm flex items-center gap-1 hover:text-gray-900"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(labels).map(([key, label]) => {
            const cat = categories.find((c) => c.category === key);
            return (
              <div
                key={key}
                className="border rounded-lg bg-white p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="font-semibold text-gray-800 mb-1">{label}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    Datasets feeding {key.toUpperCase().replace("_", " ")}
                  </div>

                  <div className="text-sm text-gray-700 grid grid-cols-3">
                    <div>
                      <div className="text-xs text-gray-500">Datasets</div>
                      <div className="font-medium">{cat?.dataset_count ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Methods</div>
                      <div className="font-medium">{cat?.methodology_count ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Table</div>
                      <div className="font-mono text-xs truncate">
                        {cat?.latest_table ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-between">
                  <button
                    onClick={() => onAdd(key)}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    + Add Dataset
                  </button>
                  <button
                    onClick={() => onPreview(key)}
                    className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                  >
                    Manage / Preview
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
