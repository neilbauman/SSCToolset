"use client";

type CategorySummaryProps = {
  instanceId: string;
  categories: any[];
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
  onAdd,
  onPreview,
}: CategorySummaryProps) {
  const CAT_KEYS = Object.keys(labels);

  if (loading)
    return <div className="text-gray-500 text-sm">Loading categories...</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {CAT_KEYS.map((key) => {
        const hasData = categories.some((c) => c.category === key);
        const label = labels[key];
        return (
          <div
            key={key}
            className={`border rounded-lg p-4 ${
              hasData ? "bg-green-50 border-green-400" : "bg-gray-50"
            }`}
          >
            <h3 className="font-semibold text-gray-800 mb-2">{label}</h3>

            {hasData ? (
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Populated</span>
                <button
                  onClick={() => onPreview(key)} // ✅ correct prop
                  className="text-blue-600 text-sm hover:underline"
                >
                  View
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Empty</span>
                <button
                  onClick={() => onAdd(key)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
