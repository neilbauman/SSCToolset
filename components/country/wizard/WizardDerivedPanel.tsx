"use client";

type Props = {
  preview: any[];
  decimals: number;
  onSave: () => void;
  onClose: () => void;
  accent: string;
};

export default function WizardDerivedPanel({
  preview,
  decimals,
  onSave,
  onClose,
  accent,
}: Props) {
  const formatNumber = (v: any) =>
    v == null || isNaN(v)
      ? "—"
      : Number(v).toLocaleString(undefined, {
          maximumFractionDigits: decimals,
        });

  return (
    <div className="border-t pt-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Preview and Save
      </h3>

      <div className="max-h-64 overflow-y-auto border rounded text-xs mb-3">
        <table className="w-full">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-1 text-left">Pcode</th>
              <th className="p-1 text-left">Name</th>
              <th className="p-1 text-right">A</th>
              <th className="p-1 text-right">B</th>
              <th className="p-1 text-right">Derived</th>
            </tr>
          </thead>
          <tbody>
            {preview.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center italic text-gray-500 py-3"
                >
                  No preview data
                </td>
              </tr>
            ) : (
              preview.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{r.pcode}</td>
                  <td className="p-1">{r.name ?? "—"}</td>
                  <td className="p-1 text-right">{formatNumber(r.a)}</td>
                  <td className="p-1 text-right">{formatNumber(r.b)}</td>
                  <td className="p-1 text-right font-medium text-[#640811]">
                    {formatNumber(r.derived)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-3 py-1 text-white rounded"
          style={{ background: accent }}
        >
          Save Derived
        </button>
      </div>
    </div>
  );
}
