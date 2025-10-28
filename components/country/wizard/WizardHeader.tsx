"use client";

type Props = {
  title: string;
  desc: string;
  setTitle: (v: string) => void;
  setDesc: (v: string) => void;
  targetLevel: string;
  setTargetLevel: (v: string) => void;
};

export default function WizardHeader({
  title,
  desc,
  setTitle,
  setDesc,
  targetLevel,
  setTargetLevel,
}: Props) {
  return (
    <div className="mb-4 border-b pb-3">
      <h2 className="text-lg font-semibold text-[#640811] mb-3">
        Create / Edit Derived Dataset
      </h2>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="border rounded p-1 flex-1"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border rounded p-1 flex-1"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <select
          className="border rounded p-1 w-32"
          value={targetLevel}
          onChange={(e) => setTargetLevel(e.target.value)}
        >
          {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
            <option key={lvl}>{lvl}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
